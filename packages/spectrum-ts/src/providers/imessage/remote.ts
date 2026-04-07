import {
  type AdvancedIMessage,
  chatGuid,
  type MessageEvent,
} from "@photon-ai/advanced-imessage";
import { type ManagedStream, mergeStreams, stream } from "../../utils/stream";
import type { IMessageMessage } from "./types";

type ReceivedEvent = Extract<MessageEvent, { type: "message.received" }>;

const toMessage = (event: ReceivedEvent): IMessageMessage => ({
  content: [{ type: "plain_text", text: event.message.text ?? "" }],
  sender: { id: event.message.sender?.address ?? "" },
  space: {
    id: event.chatGuid,
    type: event.chatGuid.includes(";+;") ? "group" : "dm",
  },
  timestamp: event.timestamp,
});

const clientStream = (
  client: AdvancedIMessage
): ManagedStream<IMessageMessage> => {
  const sub = client.messages.subscribe("message.received");
  return stream<IMessageMessage>((emit, end) => {
    (async () => {
      try {
        for await (const event of sub) {
          emit(toMessage(event));
        }
        end();
      } catch (e) {
        end(e);
      }
    })();
    return () => sub.close();
  });
};

export const messages = (
  clients: AdvancedIMessage[]
): ManagedStream<IMessageMessage> => mergeStreams(clients.map(clientStream));

export const send = async (
  clients: AdvancedIMessage[],
  spaceId: string,
  text: string
) => {
  const remote = clients[0];
  if (remote) {
    await remote.messages.send(chatGuid(spaceId), text);
  }
};
