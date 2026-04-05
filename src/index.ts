// biome-ignore lint/performance/noBarrelFile: library entry point
export { definePlatform } from "./platform/define";
export {
  type AnyPlatformDef,
  type Platform,
  type PlatformDef,
  type PlatformInstance,
  type PlatformMessage,
  type PlatformProviderConfig,
  type PlatformSpace,
  type PlatformUser,
  SpaceKind,
  type SpacesDef,
  type UnifiedMessage,
} from "./platform/types";
export { Spectrum, type SpectrumInstance } from "./spectrum";
export { type Content, text } from "./types/content";
export type { Message } from "./types/message";
export type { RichSpace, Space } from "./types/space";
export type { User } from "./types/user";
