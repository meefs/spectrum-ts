import type z from "zod";
import type { Content } from "../types/content";
import type { GenericMessage } from "../types/message";
import type { RichSpace } from "../types/space";
import type {
  AnyPlatformDef,
  Platform,
  PlatformDef,
  PlatformInstance,
  PlatformMessage,
  PlatformProviderConfig,
  PlatformSpace,
  PlatformUser,
  SpacesDef,
  SpectrumLike,
} from "./types";

function createPlatformInstance<
  Def extends AnyPlatformDef,
  _Client,
  _ConfigSchema extends z.ZodType<object>,
>(
  def: Def,
  runtime: { client: unknown; config: unknown }
): PlatformInstance<Def> {
  return {
    async user(userID: string) {
      const resolved = await def.user.resolve({
        input: { userID },
        client: runtime.client as _Client,
        config: runtime.config as z.infer<_ConfigSchema>,
      });
      return {
        ...resolved,
        __platform: def.name,
      } as PlatformUser<Def>;
    },

    async space(...users: PlatformUser<Def>[]) {
      const resolved = await def.space.resolve({
        input: { users },
        client: runtime.client as _Client,
        config: runtime.config as z.infer<_ConfigSchema>,
      });
      return {
        ...resolved,
        __platform: def.name,
        send: async (...content: [Content, ...Content[]]) => {
          await def.actions.send({
            space: resolved,
            content,
            client: runtime.client as _Client,
            config: runtime.config as z.infer<_ConfigSchema>,
          });
        },
      } as PlatformSpace<Def>;
    },

    on(event, handler) {
      const emitter = runtime as {
        emitter?: {
          on: (e: string, h: (...args: unknown[]) => void) => void;
        };
      };
      if (emitter.emitter) {
        emitter.emitter.on(
          event as string,
          handler as (...args: unknown[]) => void
        );
      }
    },
  };
}

export function definePlatform<
  _SpacesDef extends SpacesDef,
  _ConfigSchema extends z.ZodType<object>,
  _UserSchema extends z.ZodType<object>,
  _SpaceSchema extends z.ZodType<object>,
  _Client,
  _Events extends object,
  _MessageType,
  _SpaceMethods extends object,
>(
  def: PlatformDef<
    _SpacesDef,
    _ConfigSchema,
    _UserSchema,
    _SpaceSchema,
    _Client,
    _Events,
    _MessageType,
    _SpaceMethods
  >
): Platform<
  PlatformDef<
    _SpacesDef,
    _ConfigSchema,
    _UserSchema,
    _SpaceSchema,
    _Client,
    _Events,
    _MessageType,
    _SpaceMethods
  >
> {
  type Def = PlatformDef<
    _SpacesDef,
    _ConfigSchema,
    _UserSchema,
    _SpaceSchema,
    _Client,
    _Events,
    _MessageType,
    _SpaceMethods
  >;

  const platformCache = new WeakMap<SpectrumLike, PlatformInstance<Def>>();

  const narrowSpectrum = (spectrum: SpectrumLike) => {
    const cached = platformCache.get(spectrum);
    if (cached) {
      return cached;
    }

    const runtime = spectrum.__internal.platforms.get(def.name);
    if (!runtime) {
      throw new Error(`Platform "${def.name}" is not registered`);
    }

    const instance = createPlatformInstance<Def, _Client, _ConfigSchema>(
      def as Def & AnyPlatformDef,
      runtime
    );
    platformCache.set(spectrum, instance);
    return instance;
  };

  const narrowSpace = (input: RichSpace) => {
    if (input.__platform !== def.name) {
      throw new Error(
        `Expected space from "${def.name}", got "${input.__platform}"`
      );
    }
    return input as PlatformSpace<Def>;
  };

  const narrowMessage = (input: GenericMessage) => {
    if (input.platform !== def.name) {
      throw new Error(
        `Expected message from "${def.name}", got "${input.platform}"`
      );
    }
    return input as PlatformMessage<Def>;
  };

  const narrower = ((input: SpectrumLike | RichSpace | GenericMessage) => {
    if ("__providers" in input && "__internal" in input) {
      return narrowSpectrum(input as SpectrumLike);
    }
    if ("__platform" in input && "send" in input) {
      return narrowSpace(input as RichSpace);
    }
    if ("platform" in input && "raw" in input) {
      return narrowMessage(input as GenericMessage);
    }
    throw new Error("Invalid input to platform narrowing function");
  }) as Platform<Def>;

  narrower.config = (config: z.input<_ConfigSchema>) => {
    return {
      __tag: "PlatformProviderConfig" as const,
      __def: undefined as unknown as Def,
      __name: def.name,
      config,
      __definition: def as AnyPlatformDef,
    } satisfies PlatformProviderConfig<Def> as PlatformProviderConfig<Def>;
  };

  return narrower;
}
