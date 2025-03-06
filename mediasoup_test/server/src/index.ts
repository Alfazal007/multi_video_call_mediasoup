import WebSocket, { WebSocketServer } from 'ws';
import {
    createWorker,
} from "mediasoup";
import { types as mediasoupTypes } from "mediasoup";
import { Message } from './message';
import { WebRtcTransport } from 'mediasoup/node/lib/WebRtcTransportTypes';
import express from "express";
import path from 'path';
import http from "http";

/**
 * Worker
 * |-> Router(s)
 *     |-> Producer Transport(s)
 *         |-> Producer
 *     |-> Consumer Transport(s)
 *         |-> Consumer 
 **/

const app = express();

// Serve static files from the 'public' directory
app.use('/', express.static(path.join(__dirname, '../public')));

// Create an HTTP server
const server = http.createServer(app);

// Attach WebSocket server to the HTTP server
const wss = new WebSocketServer({ server });

let worker: mediasoupTypes.Worker;
const createWorkerr = async () => {
    let worker = await createWorker({
        rtcMinPort: 2000,
        rtcMaxPort: 2020,
        // TODO:: This is deprecated
    })
    console.log(`worker pid ${worker.pid}`)

    worker.on('died', error => {
        console.error('mediasoup worker has died')
        setTimeout(() => process.exit(1), 2000) // exit in 2 seconds
    })
    return worker
}

async function main() {
    worker = await createWorkerr();
}

main();

let router: mediasoupTypes.Router;
let producerTransport: mediasoupTypes.WebRtcTransport
let consumerTransport: mediasoupTypes.WebRtcTransport;
let producer: mediasoupTypes.Producer
let consumer: mediasoupTypes.Consumer

wss.on('connection', async function connection(ws) {
    console.log("A client just connected");

    router = await worker.createRouter({
        mediaCodecs
            : [
                {
                    kind: 'audio',
                    mimeType: 'audio/opus',
                    clockRate: 48000,
                    channels: 2,
                },
                {
                    kind: 'video',
                    mimeType: 'video/VP8',
                    clockRate: 90000,
                    parameters: {
                        'x-google-start-bitrate': 1000,
                    },
                },
            ]
    })
    ws.on('error', console.error);

    ws.on('message', async function message(data) {
        console.log('received: %s', data);
        const jsonMessage: Message = JSON.parse(data.toString());
        if (jsonMessage.type == "getRtpCapabilities") {
            const rtpCapabilities = router.rtpCapabilities
            ws.send(JSON.stringify(rtpCapabilities));
        } else if (jsonMessage.type == "createWebRtcTransport") {
            if (jsonMessage.data.sender) {
                producerTransport = await createWebRtcTransport(ws) as WebRtcTransport
            } else {
                consumerTransport = await createWebRtcTransport(ws) as WebRtcTransport
            }
        } else if (jsonMessage.type == "transport-connect") {
            // TODO:: Check what client is something
            // @ts-ignore
            await producerTransport.connect(jsonMessage.data)
        } else if (jsonMessage.type == "transport-produce") {
            const { kind, rtpParameters, appData } = jsonMessage.data;
            producer = await producerTransport.produce({
                kind,
                rtpParameters,
            })

            console.log('Producer ID: ', producer.id, producer.kind)

            producer.on('transportclose', () => {
                console.log('transport for this producer closed ')
                producer.close()
            })

            // Send back to the client the Producer's id
            ws.send(JSON.stringify({
                id: producer.id
            }))
        } else if (jsonMessage.type == "transport-recv-connect") {
            const { dtlsParameters } = jsonMessage.data;
            await consumerTransport.connect({ dtlsParameters })
        } else if (jsonMessage.type == "consume") {
            const { rtpCapabilities } = jsonMessage.data;
            try {
                // check if the router can consume the specified producer
                if (router.canConsume({
                    producerId: producer.id,
                    rtpCapabilities
                })) {
                    // transport can now consume and return a consumer
                    consumer = await consumerTransport.consume({
                        producerId: producer.id,
                        rtpCapabilities,
                        paused: true,
                    })

                    consumer.on('transportclose', () => {
                        console.log('transport close from consumer')
                    })

                    consumer.on('producerclose', () => {
                        console.log('producer of consumer closed')
                    })

                    // from the consumer extract the following params
                    // to send back to the Client
                    const params = {
                        id: consumer.id,
                        producerId: producer.id,
                        kind: consumer.kind,
                        rtpParameters: consumer.rtpParameters,
                    }

                    // send the parameters to the client
                    ws.send(JSON.stringify({ params }))
                }
            } catch (error) {
                // @ts-ignore
                console.log(error.message)
                JSON.stringify({
                    params: {
                        error: error
                    }
                })
            }
        } else if (jsonMessage.type == "consumer-resume") {
            await consumer.resume()
        }
    });

    ws.send('something');
});



const createWebRtcTransport = async (ws: WebSocket) => {
    try {
        // https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
        const webRtcTransport_options = {
            listenIps: [
                {
                    ip: '0.0.0.0', // replace with relevant IP address
                    announcedIp: '127.0.0.1',
                }
            ],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
        }

        // https://mediasoup.org/documentation/v3/mediasoup/api/#router-createWebRtcTransport
        let transport = await router.createWebRtcTransport(webRtcTransport_options)
        console.log(`transport id: ${transport.id}`)

        transport.on('dtlsstatechange', dtlsState => {
            if (dtlsState === 'closed') {
                transport.close()
            }
        })

        transport.on('listenserverclose', () => {
            console.log('transport closed')
        })

        // send back to the client the following prameters
        ws.send(JSON.stringify({
            // https://mediasoup.org/documentation/v3/mediasoup-client/api/#TransportOptions
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        }))

        return transport

    } catch (error) {
        console.log(error)
        ws.send(JSON.stringify({
            params: {
                error: error
            }
        }))
    }
}

server.listen(8000, () => {
    console.log(`Server running on http://localhost:8000`);
});
