import WebSocket, { WebSocketServer } from 'ws';
import * as mediasoup from "mediasoup";
import { mediaCodecs } from './mediaCodecs';
import { Message, MessageType } from './types';

const wss = new WebSocketServer({ port: 8000 });

let worker: mediasoup.types.Worker;
let router: mediasoup.types.Router;
let producerTransport: mediasoup.types.WebRtcTransport;
let consumerTransport: mediasoup.types.WebRtcTransport;
let producer: mediasoup.types.Producer;
let consumer: mediasoup.types.Consumer;

async function main() {
    worker = await mediasoup.createWorker();
    console.log(`Worker process ID ${worker.pid}`);

    worker.on("died", (error) => {
        console.error("mediasoup worker has died ", error);
        process.exit();
    });

    router = await worker.createRouter({
        mediaCodecs: mediaCodecs,
    });
}
main();

wss.on('connection', function connection(ws) {
    ws.on('error', console.error);

    ws.on('message', async function message(data) {
        const message: Message = JSON.parse(data.toString());
        if (message.type == MessageType.getRouterRtpCapabilities) {
            const rtpCapabilities = router.rtpCapabilities;
            ws.send(JSON.stringify({ rtpCapabilities }))
        } else if (message.type == MessageType.createTransport) {
            const isSender = message.data.sender;
            if (isSender) {
                producerTransport = await createWebRtcTransport(ws) as mediasoup.types.WebRtcTransport;
            } else {
                consumerTransport = await createWebRtcTransport(ws) as mediasoup.types.WebRtcTransport;
            }
        } else if (message.type == MessageType.connectProducerTransport) {
            // @ts-ignore
            await producerTransport?.connect({ dtlsParameters: message.data.dtlsParameters });
        } else if (message.type == MessageType.transportproduce) {
            const { kind, rtpParameters } = message.data;
            producer = await producerTransport?.produce({
                // @ts-ignore
                kind,
                // @ts-ignore
                rtpParameters,
            });
            producer?.on("transportclose", () => {
                console.log("Producer transport closed");
                producer?.close();
            });
            ws.send(JSON.stringify({ id: producer?.id }));
        } else if (message.type == MessageType.connectConsumerTransport) {
            // @ts-ignore
            await consumerTransport?.connect({ dtlsParameters: message.data.dtlsParameters });
        } else if (message.type == MessageType.consumeMedia) {
            const { rtpCapabilities } = message.data;
            try {
                // Ensure there's a producer to consume from
                if (producer) {
                    // @ts-ignore
                    if (!router.canConsume({ producerId: producer?.id, rtpCapabilities })) {
                        console.error("Cannot consume");
                        return;
                    }
                    console.log("-------> consume");

                    consumer = await consumerTransport?.consume({
                        producerId: producer?.id,
                        // @ts-ignore
                        rtpCapabilities,
                        paused: producer?.kind === "video",
                    });

                    consumer?.on("transportclose", () => {
                        console.log("Consumer transport closed");
                        consumer?.close();
                    });

                    consumer?.on("producerclose", () => {
                        console.log("Producer closed");
                        consumer?.close();
                    });

                    ws.send(JSON.stringify({
                        producerId: producer?.id,
                        id: consumer?.id,
                        kind: consumer?.kind,
                        rtpParameters: consumer?.rtpParameters,
                    }));
                }
            } catch (error) {
                // Handle any errors that occur during the consume process
                console.error("Error consuming:", error);
            }
        } else if (message.type == MessageType.resumePausedConsumer) {
            await consumer?.resume();
        }
    });
});

const createWebRtcTransport = async (ws: WebSocket) => {
    try {
        const webRtcTransportOptions = {
            // for incoming data
            listenIps: [
                {
                    ip: "127.0.0.1",
                },
            ],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
        };

        const transport = await router.createWebRtcTransport(
            webRtcTransportOptions
        );

        console.log(`Transport created: ${transport.id}`);

        transport.on("dtlsstatechange", (dtlsState) => {
            if (dtlsState === "closed") {
                transport.close();
            }
        });

        transport.on("@close", () => {
            console.log("Transport closed");
        });

        ws.send(JSON.stringify(
            {
                id: transport.id,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters,
            },
        ));

        return transport;
    } catch (error) {
        console.log(error);
    }
};
