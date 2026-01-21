import type { Fn, Objects, Pipe } from "hotscript";
import z from "zod";
import { type Spectrum as BaseSpectrum, Spectrum } from "../core/platform";
import type { User as BaseUser } from "../core/user";

const SpaceKind = {
    Direct: "direct",
    Group: "group",
} as const;

type SpaceKindType = (typeof SpaceKind)[keyof typeof SpaceKind];

type SpaceDef = {
    kind: SpaceKindType;
};

type SpacesDef = Record<string, SpaceDef>;

interface HasSpaceKindType<Kind extends SpaceKindType> extends Fn {
    return: this["arg0"] extends { kind: Kind } ? true : false;
}

type KeysBySpaceKindType<Spaces extends SpacesDef, Kind extends SpaceKindType> = Pipe<
    Spaces,
    [Objects.PickBy<HasSpaceKindType<Kind>>, Objects.Keys]
>;

type KnownKeys<T> = {
    [K in keyof T as string extends K ? never : number extends K ? never : K]: T[K];
};

export type PlatformProviderConfig = {
    __tag: "PlatformProviderConfig";
};

export type PlatformDef<
    _SpacesDef extends SpacesDef,
    _ConfigSchema extends z.ZodType<object>,
    _UserSchema extends z.ZodType<object>,
> = {
    name: string;
    spaces: _SpacesDef;
    defaultDirect: KeysBySpaceKindType<_SpacesDef, "direct">;
    defaultGroup: KeysBySpaceKindType<_SpacesDef, "group">;
    config: {
        schema: _ConfigSchema;
    };
    userSchema: _UserSchema;
    resolveUser: (_: { config: z.infer<_ConfigSchema> }) => Promise<BaseUser & KnownKeys<z.infer<_UserSchema>>>;
};

type AnyPlatformDef = PlatformDef<any, any, any>;

export type Platform<_PlatformDef extends PlatformDef<any, any, any>> = ((
    spectrum: BaseSpectrum,
) => Platform.Spectrum<_PlatformDef>) & {
    config(config: z.input<_PlatformDef["config"]["schema"]>): PlatformProviderConfig;
};

namespace Platform {
    export type Spectrum<_PlatformDef extends AnyPlatformDef> = BaseSpectrum & {
        user(userID: string): User<_PlatformDef>;
    };

    export type User<_PlatformDef extends AnyPlatformDef> = BaseUser & z.infer<_PlatformDef["userSchema"]>;
}

export function definePlatform<
    _SpacesDef extends SpacesDef,
    _ProviderSchema extends z.ZodType<object>,
    _UserSchema extends z.ZodType<object>,
>(
    def: PlatformDef<_SpacesDef, _ProviderSchema, _UserSchema>,
): Platform<PlatformDef<_SpacesDef, _ProviderSchema, _UserSchema>> {
    return null as any;
}

const imessage = definePlatform({
    name: "iMessage",
    spaces: {
        dm: {
            kind: SpaceKind.Direct,
        },
        group: {
            kind: SpaceKind.Group,
        },
    },
    defaultDirect: "dm",
    defaultGroup: "group",
    config: {
        schema: z.object({
            useLocal: z.boolean().default(false),
        }),
    },
    userSchema: z.object({
        test: z.object({
            name: z.string().min(2).max(100),
        }),
    }),
    resolveUser: async ({ config }) => {
        return {
            id: "ss",
            test: {
                name: "John Doe",
            },
        };
    },
});

const spectrum = new Spectrum({
    projectID: "1",
    projectSecret: "1",
    providers: [imessage.config({})],
});

const user = await imessage(spectrum).user("");
