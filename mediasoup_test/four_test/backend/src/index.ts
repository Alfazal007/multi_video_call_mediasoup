import WebSocket, { WebSocketServer } from 'ws';
import * as mediasoup from "mediasoup";
import { types as mediaSoupTypes } from "mediasoup";
import { mediaCodecs } from './codecs';
import { IncomingMessage, IncomingMessageType, OutgoingMessage, OutgoingMessageType } from './types';
import { sendMessage } from './sendMessage';
import { createWebRtcTransport, sendTransportDataToClient } from './createWebrtcTransport';

const wss = new WebSocketServer({ port: 8000 });
let worker: mediaSoupTypes.Worker;
export let router: mediaSoupTypes.Router;

let transports: { transport: mediaSoupTypes.WebRtcTransport, isConsumer: boolean }[] = [];
let producers = [];
let consumers = [];

(async () => {
    worker = await mediasoup.createWorker();
    router = await worker.createRouter({
        mediaCodecs: mediaCodecs
    });
})()

function getRtpCapabilities(ws: WebSocket) {
    let rtpCapabilities = router.rtpCapabilities;
    let message: OutgoingMessage = {
        data: rtpCapabilities,
        type: OutgoingMessageType.RTPCAPABILITIES
    }
    sendMessage(ws, message);
}

wss.on('connection', function connection(ws) {
    ws.on('error', console.error);

    ws.on('message', async function message(data) {
        const receivedMessage: IncomingMessage = JSON.parse(data.toString());
        switch (receivedMessage.type) {
            case IncomingMessageType.RTPCAPABILITIES:
                getRtpCapabilities(ws);
                break;
            case IncomingMessageType.CREATEWEBRTCTRANSPORT:
                try {
                    let isConsumer = receivedMessage.data.consumer;
                    const transport = await createWebRtcTransport();
                    sendTransportDataToClient(ws, transport);
                    transports = [
                        ...transports,
                        {
                            transport: transport,
                            isConsumer: isConsumer
                        }
                    ]
                } catch (err) {
                    console.log(err);
                }
                break
            case IncomingMessageType.TRANSPORTCONNECT:
                getTransport(socket.id).connect({ dtlsParameters })
                break;
            default: console.log("Invalid message");
                break;
        }
    });
});
