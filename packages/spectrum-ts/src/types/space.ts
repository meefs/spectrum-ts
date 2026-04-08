import type { ContentBuilder } from "./content";

export interface Space<_Def = unknown> {
  readonly __platform: string;
  readonly id: string;
  send(...content: [ContentBuilder, ...ContentBuilder[]]): Promise<void>;
}
