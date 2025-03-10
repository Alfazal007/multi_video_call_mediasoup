import WebSocket, { WebSocketServer } from 'ws';
import * as mediasoup from "mediasoup";
import { types as mediaSoupTypes } from "mediasoup";
import { mediaCodecs } from './codecs';
import { IncomingMessage, IncomingMessageType, OutgoingMessage, OutgoingMessageType, TransportTypeCustom } from './types';
import { sendMessage } from './sendMessage';
import { handleCreateTransport } from './createTransport';

const wss = new WebSocketServer({ port: 8000 });

let worker: mediaSoupTypes.Worker;
let router: mediaSoupTypes.Router;
let transports: TransportTypeCustom[] = [];
let producers = [];
let consumers = [];

export function addTransport(ws: WebSocket, transport: mediaSoupTypes.WebRtcTransport, isConsumer: boolean) {
    transports = [
        ...transports,
        {
            transport,
            ws,
            isConsumer
        }
    ];
    console.log({ transports })
}

(async function () {
    worker = await mediasoup.createWorker();
    worker.on("died", () => {
        console.log("Mediasoup worker died");
        process.exit(1);
    })
    router = await worker.createRouter({
        mediaCodecs: mediaCodecs
    })
    console.log("worker id is ", worker.pid);
})()

wss.on('connection', function connection(ws) {
    ws.on('error', console.error);

    ws.on('message', async function message(data) {
        const receivedMessage: IncomingMessage = JSON.parse(data.toString());
        switch (receivedMessage.type) {
            case IncomingMessageType.GETRTPPARAMETERS:
                let messageData = router.rtpCapabilities;
                let message: OutgoingMessage = {
                    data: messageData,
                    type: OutgoingMessageType.GETRTPPARAMETERS
                }
                sendMessage(ws, message);
                break;
            case IncomingMessageType.CREATETRANSPORT:
                let transport = await handleCreateTransport(ws, router);
                if (transport) {
                    addTransport(ws, transport, receivedMessage.data.isConsumer);
                    let toBeSentData = {
                        id: transport.id,
                        iceParameters: transport.iceParameters,
                        iceCandidates: transport.iceCandidates,
                        dtlsParameters: transport.dtlsParameters,
                    }
                    let message: OutgoingMessage = {
                        data: toBeSentData,
                        type: OutgoingMessageType.CREATETRANSPORT
                    }
                    sendMessage(ws, message);
                }
                break;
            default:
                console.log("Invalid message", data.toString());
        }
    });
});
