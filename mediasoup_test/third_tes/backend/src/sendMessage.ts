import { WebSocket } from "ws";
import { OutgoingMessage } from "./types";

export function sendMessage(ws: WebSocket, message: OutgoingMessage) {
    ws.send(JSON.stringify(message));
}
