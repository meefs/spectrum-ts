import type z from "zod";
import type { Platform, PlatformDef, SpacesDef } from "./type";

export function definePlatform<
    _SpacesDef extends SpacesDef,
    _ProviderSchema extends z.ZodType<object>,
    _UserSchema extends z.ZodType<object>,
    _SpaceSchema extends z.ZodType<object>
>(
    def: PlatformDef<_SpacesDef, _ProviderSchema, _UserSchema, _SpaceSchema>,
): Platform<PlatformDef<_SpacesDef, _ProviderSchema, _UserSchema, _SpaceSchema>> {
    return null as any;
}
