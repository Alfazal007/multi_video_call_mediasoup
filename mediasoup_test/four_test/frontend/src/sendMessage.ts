import { ws } from "./MainFile";
import { OutgoingMessage } from "./types";

export function sendMessage(message: OutgoingMessage) {
    ws.send(JSON.stringify(message));
}

