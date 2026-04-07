import type { Content } from "./content";
import type { User } from "./user";

export interface Message<_Def = unknown> {
  content: Content[];
  platform: string;
  raw: unknown;
  sender: User;
  spaceId?: string;
  timestamp: Date;
}
