import { createDevice } from "./createDevice";
import { createSendTransport } from "./createSendTransport";
import { ws } from "./MainFile";
import { createProducerTransport, pendingProducerCallbacks } from "./producerTransport";
import { IncomingMessage, IncomingMessageType } from "./types";
import mediasoup from "mediasoup-client";

export let rtpCapabilities: mediasoup.types.RtpCapabilities;

export function init() {
    ws.onmessage = async (event) => {
        const receivedMessage: IncomingMessage = JSON.parse(event.data);
        switch (receivedMessage.type) {
            case IncomingMessageType.RTPCAPABILITIES:
                rtpCapabilities = receivedMessage.data;
                await createDevice();
                await createSendTransport(false);
                break;
            case IncomingMessageType.CREATEWEBRTCTRANSPORT:
                await createProducerTransport(receivedMessage.data);
                break;
            case IncomingMessageType.TRANSPORTPRODUCE:
                const { id, kind, producersExist } = receivedMessage.data;
                // @ts-ignore
                if (pendingProducerCallbacks[kind]) {
                    // @ts-ignore
                    pendingProducerCallbacks[kind]({ id });
                    // @ts-ignore
                    pendingProducerCallbacks[kind] = null;
                    if (producersExist) {
                        getProducers();
                    }
                }
                break;
            default:
                break;
        }
    }
}

function getProducers() {
    console.log("get producers called");
}
