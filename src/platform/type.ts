import type { Fn, Objects, Pipe } from "hotscript";
import z from "zod";
import { Spectrum, type Spectrum as BaseSpectrum } from "../core";

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

export type PlatformProviderConfig = {
    __tag: "PlatformProviderConfig"
}

export type PlatformDef<_SpacesDef extends SpacesDef> = {
    name: string;
    spaces: _SpacesDef;
    defaultDirect: KeysBySpaceKindType<_SpacesDef, "direct">;
    defaultGroup: KeysBySpaceKindType<_SpacesDef, "group">;
    configSchema: z.ZodType<object>;
};

export type Platform<_PlatformDef extends PlatformDef<any>> = ((
    spectrum: BaseSpectrum,
) => Platform.Spectrum<_PlatformDef>) & ({
    config(config: z.infer<_PlatformDef["configSchema"]>): PlatformProviderConfig;
})

namespace Platform {
    export type Spectrum<_PlatformDef extends PlatformDef<any>> = BaseSpectrum & {
        user(userID: string): void;
    };

    export type User<_PlatformDef extends PlatformDef<any>> = {};
}

export function definePlatform<_SpacesDef extends SpacesDef>(
    def: PlatformDef<_SpacesDef>,
): Platform<PlatformDef<_SpacesDef>> {
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
    configSchema: z.object({
        useLocal: z.boolean().default(false),
    }),
});

const spectrum = new Spectrum({
    projectID: "1",
    projectSecret: "1",
    providers: [
        imessage.config({})
    ]
})

const imessageSpectrum = imessage(null as unknown as BaseSpectrum);
const user = await imessageSpectrum.user("");
