import { ws } from "./MainFile";
import { OutgoingMessage, OutgoingMessageType } from "./types";

export async function createSendTransport(consumer: boolean) {
    let messageToSend: OutgoingMessage = {
        type: OutgoingMessageType.CREATEWEBRTCTRANSPORT,
        data: { consumer }
    }
    ws.send(JSON.stringify(messageToSend));
}
