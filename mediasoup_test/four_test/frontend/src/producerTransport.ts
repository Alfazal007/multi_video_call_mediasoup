import { device } from "./createDevice";
import * as mediasoup from "mediasoup-client";
import { OutgoingMessage, OutgoingMessageType } from "./types";
import { sendMessage } from "./sendMessage";

export let producerTransport: mediasoup.types.Transport;

export let pendingProducerCallbacks = {
    audio: null,
    video: null
};

type ParamType = {
    id: string,
    iceParameters: mediasoup.types.IceParameters,
    iceCandidates: mediasoup.types.IceCandidate[],
    dtlsParameters: mediasoup.types.DtlsParameters,
}

export async function createProducerTransport(params: ParamType) {
    producerTransport = device.createSendTransport(params);
    producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
            // Signal local DTLS parameters to the server side transport
            // see server's socket.on('transport-connect', ...)
            let messageToSend: OutgoingMessage = {
                data: {
                    dtlsParameters
                },
                type: OutgoingMessageType.TRANSPORTCONNECT
            }
            sendMessage(messageToSend);
            callback()

        } catch (error: any) {
            errback(error)
        }
    })

    producerTransport.on('produce', async (parameters, callback, errback) => {
        console.log(parameters)

        try {
            // tell the server to create a Producer
            // with the following parameters and produce
            // and expect back a server side producer id
            // see server's socket.on('transport-produce', ...)
            let messageToSend: OutgoingMessage = {
                data: {
                    kind: parameters.kind,
                    rtpParameters: parameters.rtpParameters,
                    appData: parameters.appData,
                },
                type: OutgoingMessageType.TRANSPORTPRODUCE
            }
            sendMessage(messageToSend);
            // @ts-ignore
            pendingProducerCallbacks[parameters.kind] = callback;

        } catch (error: any) {
            errback(error)
        }
    })
}
