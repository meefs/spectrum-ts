import {
  AdvancedIMessageKit,
  type MessageResponse,
} from "@photon-ai/advanced-imessage-kit";
import { IMessageSDK } from "@photon-ai/imessage-kit";
import z from "zod";
import { definePlatform } from "../platform/define";
import { SpaceKind } from "../platform/types";

export const imessage = definePlatform({
  name: "iMessage",

  spaces: {
    dm: { kind: SpaceKind.Direct },
    group: { kind: SpaceKind.Group },
  },
  defaultDirect: "dm",
  defaultGroup: "group",

  config: z.object({
    useLocal: z.boolean().default(false),
    serverUrl: z.string().optional(),
    apiKey: z.string().optional(),
  }),

  events: {
    "new-message": (
      client: IMessageSDK | AdvancedIMessageKit,
      handler: (data: MessageResponse) => void
    ) => {
      if (client instanceof AdvancedIMessageKit) {
        client.on("new-message", handler);
      }
    },
  },

  lifecycle: {
    createClient: async ({ config }) => {
      if (config.useLocal) {
        const sdk = new IMessageSDK();
        return sdk as IMessageSDK | AdvancedIMessageKit;
      }
      const sdk = AdvancedIMessageKit.getInstance({
        serverUrl: config.serverUrl,
        apiKey: config.apiKey,
      });
      await sdk.connect();
      return sdk as IMessageSDK | AdvancedIMessageKit;
    },

    destroyClient: async ({ client }) => {
      if (client instanceof AdvancedIMessageKit) {
        await client.close();
      }
    },

    listen: async ({ client, push }) => {
      if (client instanceof AdvancedIMessageKit) {
        client.on("new-message", (msg: MessageResponse) => {
          push(msg);
        });
      }
    },
  },

  actions: {
    send: async ({ space, content, client }) => {
      const text = content
        .filter((c) => c.type === "plain_text")
        .map((c) => c.text)
        .join("\n");

      if (client instanceof AdvancedIMessageKit) {
        await client.messages.sendMessage({
          chatGuid: space.id,
          message: text,
        });
      } else if (client instanceof IMessageSDK) {
        await client.send(space.id, text);
      }
    },
  },

  user: {
    resolve: async ({ input }) => ({
      id: input.userID,
      __platform: "iMessage" as const,
    }),
  },

  space: {
    resolve: async ({ input }) => {
      const id =
        input.users.length === 1 ? `iMessage;-;${input.users[0]?.id}` : "";
      return { id, __platform: "iMessage" as const };
    },
  },
});
