import type { Fn, Objects, Pipe, Tuples } from "hotscript";
import type z from "zod";
import type { Content } from "../types/content";
import type { GenericMessage } from "../types/message";
import type { RichSpace, Space } from "../types/space";
import type { User } from "../types/user";

// ---------------------------------------------------------------------------
// Space Kind
// ---------------------------------------------------------------------------

export const SpaceKind = {
  Direct: "direct",
  Group: "group",
} as const;

type SpaceKindType = (typeof SpaceKind)[keyof typeof SpaceKind];

interface SpaceDef {
  kind: SpaceKindType;
}

export type SpacesDef = Record<string, SpaceDef>;

// ---------------------------------------------------------------------------
// HotScript helpers for space filtering
// ---------------------------------------------------------------------------

interface HasSpaceKindType<Kind extends SpaceKindType> extends Fn {
  return: this["arg0"] extends { kind: Kind } ? true : false;
}

type KeysBySpaceKindType<
  Spaces extends SpacesDef,
  Kind extends SpaceKindType,
> = Pipe<Spaces, [Objects.PickBy<HasSpaceKindType<Kind>>, Objects.Keys]>;

type KnownKeys<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
      ? never
      : K]: T[K];
};

// ---------------------------------------------------------------------------
// PlatformDef — the full definition of a platform adapter
// ---------------------------------------------------------------------------

export interface PlatformDef<
  _SpacesDef extends SpacesDef = SpacesDef,
  _ConfigSchema extends z.ZodType<object> = z.ZodType<object>,
  _UserSchema extends z.ZodType<object> = z.ZodType<object>,
  _SpaceSchema extends z.ZodType<object> = z.ZodType<object>,
  _Client = unknown,
  _Events extends object = object,
  _MessageType = unknown,
  _SpaceMethods extends object = object,
> {
  actions: {
    send: (_: {
      space: Space & KnownKeys<z.infer<_SpaceSchema>>;
      content: Content[];
      client: _Client;
      config: z.infer<_ConfigSchema>;
    }) => Promise<void>;
  };

  config: {
    schema: _ConfigSchema;
  };
  defaultDirect: KeysBySpaceKindType<_SpacesDef, "direct">;
  defaultGroup: KeysBySpaceKindType<_SpacesDef, "group">;

  events: _Events;

  lifecycle: {
    createClient: (ctx: { config: z.infer<_ConfigSchema> }) => Promise<_Client>;

    destroyClient: (ctx: { client: _Client }) => Promise<void>;

    listen: (ctx: {
      client: _Client;
      config: z.infer<_ConfigSchema>;
      push: (msg: _MessageType) => void;
    }) => Promise<void>;
  };
  messageType?: _MessageType;
  name: string;

  space: {
    schema: _SpaceSchema;
    resolve: (_: {
      input: { users: (User & KnownKeys<z.infer<_UserSchema>>)[] };
      client: _Client;
      config: z.infer<_ConfigSchema>;
    }) => Promise<Space & KnownKeys<z.infer<_SpaceSchema>>>;
  };
  spaceMethods?: _SpaceMethods;
  spaces: _SpacesDef;

  user: {
    schema: _UserSchema;
    resolve: (_: {
      input: { userID: string };
      client: _Client;
      config: z.infer<_ConfigSchema>;
    }) => Promise<User & KnownKeys<z.infer<_UserSchema>>>;
  };
}

export interface AnyPlatformDef {
  actions: {
    // biome-ignore lint/suspicious/noExplicitAny: wildcard action
    send: (_: any) => Promise<void>;
  };
  config: { schema: z.ZodType<object> };
  defaultDirect: string | number | symbol;
  defaultGroup: string | number | symbol;
  events: object;
  lifecycle: {
    // biome-ignore lint/suspicious/noExplicitAny: wildcard lifecycle
    createClient: (ctx: any) => Promise<any>;
    // biome-ignore lint/suspicious/noExplicitAny: wildcard lifecycle
    destroyClient: (ctx: any) => Promise<void>;
    // biome-ignore lint/suspicious/noExplicitAny: wildcard lifecycle
    listen: (ctx: any) => Promise<void>;
  };
  messageType?: unknown;
  name: string;
  space: {
    schema: z.ZodType<object>;
    // biome-ignore lint/suspicious/noExplicitAny: wildcard resolver
    resolve: (_: any) => Promise<any>;
  };
  spaceMethods?: object;
  spaces: SpacesDef;
  user: {
    schema: z.ZodType<object>;
    // biome-ignore lint/suspicious/noExplicitAny: wildcard resolver
    resolve: (_: any) => Promise<any>;
  };
}

// ---------------------------------------------------------------------------
// PlatformProviderConfig — carries platform def type through providers array
// ---------------------------------------------------------------------------

export interface PlatformProviderConfig<
  Def extends AnyPlatformDef = AnyPlatformDef,
> {
  readonly __def: Def;
  readonly __definition: AnyPlatformDef;
  readonly __name: Def["name"];
  readonly __tag: "PlatformProviderConfig";
  readonly config: unknown;
}

// ---------------------------------------------------------------------------
// HotScript Fn's for type-level provider operations
// ---------------------------------------------------------------------------

interface MatchesPlatformName<Name extends string> extends Fn {
  return: this["arg0"] extends PlatformProviderConfig<infer Def>
    ? Def["name"] extends Name
      ? true
      : false
    : false;
}

interface ExtractDef extends Fn {
  return: this["arg0"] extends PlatformProviderConfig<infer Def> ? Def : never;
}

interface ToMessageVariant extends Fn {
  return: this["arg0"] extends PlatformProviderConfig<infer Def>
    ? {
        platform: Def["name"];
        content: Content[];
        sender: User & KnownKeys<z.infer<Def["user"]["schema"]>>;
        raw: Def["messageType"];
        timestamp: Date;
      }
    : never;
}

interface ExtractDefByName<Name extends string> extends Fn {
  return: this["arg0"] extends { name: Name } ? true : false;
}

// ---------------------------------------------------------------------------
// HasProvider — check if a platform name exists in providers tuple
// ---------------------------------------------------------------------------

export type HasProvider<
  Providers extends PlatformProviderConfig[],
  Name extends string,
> = Pipe<Providers, [Tuples.Some<MatchesPlatformName<Name>>]>;

// ---------------------------------------------------------------------------
// ExtractProviderDef — pull a platform's def from the providers tuple
// ---------------------------------------------------------------------------

export type ExtractProviderDef<
  Providers extends PlatformProviderConfig[],
  Name extends string,
> = Pipe<
  Providers,
  [Tuples.Map<ExtractDef>, Tuples.Find<ExtractDefByName<Name>>]
>;

// ---------------------------------------------------------------------------
// UnifiedMessage — discriminated union from providers tuple
// ---------------------------------------------------------------------------

export type UnifiedMessage<Providers extends PlatformProviderConfig[]> = Pipe<
  Providers,
  [Tuples.Map<ToMessageVariant>, Tuples.ToUnion]
>;

// ---------------------------------------------------------------------------
// Platform-specific Space and Message types
// ---------------------------------------------------------------------------

export type PlatformSpace<Def extends AnyPlatformDef> = RichSpace &
  KnownKeys<z.infer<Def["space"]["schema"]>> &
  (Def["spaceMethods"] extends object
    ? KnownKeys<Def["spaceMethods"]>
    : unknown);

export interface PlatformMessage<Def extends AnyPlatformDef> {
  content: Content[];
  platform: Def["name"];
  raw: Def["messageType"];
  sender: User & KnownKeys<z.infer<Def["user"]["schema"]>>;
  timestamp: Date;
}

export type PlatformUser<Def extends AnyPlatformDef> = User &
  KnownKeys<z.infer<Def["user"]["schema"]>>;

// ---------------------------------------------------------------------------
// PlatformInstance — returned from imessage(spectrum)
// ---------------------------------------------------------------------------

export interface PlatformInstance<Def extends AnyPlatformDef> {
  on<E extends keyof Def["events"]>(
    event: E,
    handler: (data: Def["events"][E]) => void | Promise<void>
  ): void;
  space(...users: PlatformUser<Def>[]): Promise<PlatformSpace<Def>>;
  user(userID: string): Promise<PlatformUser<Def>>;
}

// ---------------------------------------------------------------------------
// SpectrumLike — minimal interface for platform narrowing
// ---------------------------------------------------------------------------

export interface SpectrumLike<
  Providers extends PlatformProviderConfig[] = PlatformProviderConfig[],
> {
  readonly __internal: {
    platforms: Map<
      string,
      { client: unknown; config: unknown; definition: AnyPlatformDef }
    >;
  };
  readonly __providers: Providers;
}

// ---------------------------------------------------------------------------
// Platform — the callable returned by definePlatform()
// ---------------------------------------------------------------------------

export interface Platform<Def extends AnyPlatformDef> {
  config(config: z.input<Def["config"]["schema"]>): PlatformProviderConfig<Def>;
  <Providers extends PlatformProviderConfig[]>(
    spectrum: SpectrumLike<Providers>
  ): HasProvider<Providers, Def["name"]> extends true
    ? PlatformInstance<Def>
    : never;

  (space: RichSpace): PlatformSpace<Def>;

  (message: GenericMessage): PlatformMessage<Def>;
}

export type { GenericMessage } from "../types/message";
