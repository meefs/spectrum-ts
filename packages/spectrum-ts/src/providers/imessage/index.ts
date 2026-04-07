import {
  createClient,
  directChat,
  groupChat,
} from "@photon-ai/advanced-imessage";
import { IMessageSDK } from "@photon-ai/imessage-kit";
import { definePlatform } from "../../platform/define";
import { messages as localMessages, send as localSend } from "./local";
import { messages as remoteMessages, send as remoteSend } from "./remote";
import { configSchema, type IMessageClient, spaceSchema } from "./types";

const isLocal = (client: IMessageClient): client is IMessageSDK =>
  client instanceof IMessageSDK;

export const imessage = definePlatform("iMessage", {
  config: configSchema,

  user: {
    resolve: async ({ input }) => ({ id: input.userID }),
  },

  space: {
    schema: spaceSchema,
    resolve: async ({ input }) => {
      if (input.users.length === 0) {
        throw new Error("iMessage space creation requires at least one user");
      }

      const type = input.users.length === 1 ? "dm" : "group";

      return type === "dm"
        ? {
            id: directChat(input.users[0]?.id ?? "") as string,
            type: "dm" as const,
          }
        : { id: groupChat("") as string, type: "group" as const };
    },
  },

  lifecycle: {
    createClient: async ({ config }): Promise<IMessageClient> => {
      if (config.local) {
        return new IMessageSDK();
      }

      const raw = config.clients ?? [];
      const entries = Array.isArray(raw) ? raw : [raw];
      return entries.map((e) =>
        createClient({ address: e.address, tls: true, token: e.token })
      );
    },

    destroyClient: async ({ client }: { client: IMessageClient }) => {
      if (isLocal(client)) {
        await client.close();
        return;
      }
      await Promise.all(client.map((c) => c.close()));
    },
  },

  events: {
    messages: ({ client }) =>
      isLocal(client) ? localMessages(client) : remoteMessages(client),
  },

  actions: {
    send: async ({ space, content, client }) => {
      const text = content
        .filter((c) => c.type === "plain_text")
        .map((c) => c.text)
        .join("\n");

      if (isLocal(client)) {
        return localSend(client, space.id, text);
      }
      return remoteSend(client, space.id, text);
    },
  },
});
