import http from 'http'
import socketIo from 'socket.io';
import { isValidUser } from './helpers/isValidUser';
import { PeerManager } from './managers/PeerManager';
import * as mediaousp from "mediasoup";
import { types as mediasoupTypes } from "mediasoup";
import { WebRtcTransport } from 'mediasoup/node/lib/WebRtcTransportTypes';
import { Router } from 'mediasoup/node/lib/RouterTypes';

export let worker: mediaousp.types.Worker;

(async function () {
    worker = await mediaousp.createWorker();
})()

let server = http.createServer();

let peerManager = PeerManager.getInstance();
let io = new socketIo.Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

io.on('connection', socket => {
    console.log("A user connected:", socket.id);

    socket.on("establish-connection", async (data: {
        accessToken: string,
        room: string
    }) => {
        if (!data.accessToken || !data.room) {
            socket.emit("error-response", "Invalid data");
            socket.conn.close();
            return;
        }

        const isUserValid = await isValidUser(data.accessToken);
        if (!isUserValid) {
            socket.emit("error-response", "Invalid user");
            socket.conn.close();
            return;
        }

        if (!peerManager.hasRoom(data.room)) {
            console.log("\n\n\n\n\n\ncreate room called\n\n\n\n\n\n\n")
            await peerManager.createRoom(data.room);
        }
        peerManager.addUserToRoom(data.room, socket);
        peerManager.currentState();
    });

    socket.on('disconnect', () => {
        console.log("disconnected");
        peerManager.cleanUp(socket);
        peerManager.currentState();
        peerManager.removeTransport(socket.id);
    });

    socket.on('rtp', ({ roomName }, callback) => {
        let rtpCapabilities = peerManager.getRtpCapabilities(roomName);
        callback({ rtpCapabilities })
    })

    socket.on("createWebRtcTransport", async ({ consumer, roomName }: { consumer: boolean, roomName: string }, callback) => {
        console.log("received create wenrtc transport")
        let router = peerManager.getRouter(roomName)
        if (!router) {
            return;
        }
        const transport = await createWebRtcTransport(router);
        callback({
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        })

        peerManager.addTransport(transport, roomName, consumer, socket.id)
    })

    socket.on("transport-connect", async ({ consumer, dtlsParameters }: { consumer: boolean, dtlsParameters: mediasoupTypes.DtlsParameters }) => {
        let transport = peerManager.getTransport(socket.id, consumer)
        await transport?.transport.connect({
            dtlsParameters: dtlsParameters
        });
        console.log("producer transport connceted")
        peerManager.transportDisplayer()
    })

    socket.on("transport-produce", async ({
        kind,
        rtpParameters,
        appData,
        roomName
    }: {
        kind: mediasoupTypes.MediaKind,
        rtpParameters: mediasoupTypes.RtpParameters,
        appData: mediasoupTypes.AppData,
        roomName: string
    }, callback) => {
        const producer = await peerManager.getTransport(socket.id, false)?.transport.produce({
            kind,
            rtpParameters
        })
        if (!producer) {
            return
        }
        peerManager.addProducer(producer, roomName, socket.id);
        producer?.on('transportclose', () => {
            console.log('transport for this producer closed ')
            producer.close()
            peerManager.remove(producer.id);
            peerManager.removeTransport(socket.id);
        })

        callback({
            id: producer.id,
            producersExist: peerManager.hasProducers(roomName)
        })
    })

    socket.on("getProducers", (roomName: string, callback) => {
        let producerList = peerManager.getProduerList(roomName, socket.id)
        callback(producerList)
    })

});

server.listen(3000, () => {
    console.log("server listening on port 3000");
});

const createWebRtcTransport = async (router: Router): Promise<WebRtcTransport> => {
    return new Promise(async (resolve, reject) => {
        try {
            const webRtcTransport_options = {
                listenIps: [
                    {
                        ip: '0.0.0.0',
                        announcedIp: '127.0.0.1',
                    }
                ],
                enableUdp: true,
                enableTcp: true,
                preferUdp: true,
            }

            let transport = await router.createWebRtcTransport(webRtcTransport_options)
            console.log(`transport id: ${transport.id}`)

            transport.on('dtlsstatechange', dtlsState => {
                if (dtlsState === 'closed') {
                    transport.close()
                }
            })

            transport.on('@close', () => {
                console.log('transport closed')
            })

            resolve(transport)

        } catch (error) {
            reject(error)
        }
    })
}
