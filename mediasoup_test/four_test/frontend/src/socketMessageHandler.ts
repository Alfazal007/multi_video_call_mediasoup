import { ws } from "./MainFile";
import { IncomingMessage, IncomingMessageType } from "./types";
import mediasoup from "mediasoup-client";

export let rtpCapabilities: mediasoup.types.RtpCapabilities;

export function init() {
    ws.onmessage = (event) => {
        const receivedMessage: IncomingMessage = JSON.parse(event.data);
        switch (receivedMessage.type) {
            case IncomingMessageType.RTPCAPABILITIES:
                rtpCapabilities = receivedMessage.data;
                console.log(rtpCapabilities);
                break;
            default:
                break;
        }
    }
}
