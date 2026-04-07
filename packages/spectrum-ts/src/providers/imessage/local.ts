import type { IMessageSDK } from "@photon-ai/imessage-kit";
import { type ManagedStream, stream } from "../../utils/stream";
import type { IMessageMessage } from "./types";

export const messages = (client: IMessageSDK): ManagedStream<IMessageMessage> =>
  stream((emit) => {
    client.startWatching({
      onMessage: (msg) =>
        emit({
          content: [{ type: "plain_text", text: msg.text ?? "" }],
          sender: { id: msg.sender ?? "" },
          space: { id: msg.sender ?? "", type: "dm" },
          timestamp: msg.date ?? new Date(),
        }),
    });
    return () => client.stopWatching();
  });

export const send = async (
  client: IMessageSDK,
  spaceId: string,
  text: string
) => {
  await client.send(spaceId, text);
};
