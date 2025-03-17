import { Socket } from "socket.io";
import { types as mediasoupTypes } from "mediasoup";
import { mediaCodecs } from "./mediacodecs";
import { worker } from "..";
import { WebRtcTransport } from "mediasoup/node/lib/WebRtcTransportTypes";
import { Consumer } from "mediasoup/node/lib/ConsumerTypes";

type Peerdata = {
    socket: Socket;
    socketId: string;
}

type TransportData = {
    transport: WebRtcTransport,
    roomName: string,
    isConsumer: boolean,
    socketId: string
}

export class PeerManager {
    private roomSocketMap: Map<string, { peerData: Peerdata[], router: mediasoupTypes.Router }>;
    private static instance: PeerManager;
    private connectedIdsSet: Set<string>;
    private transports: TransportData[];
    private producers: { roomName: string, producer: mediasoupTypes.Producer, socketId: string }[];
    private consumers: { roomName: string, consumer: mediasoupTypes.Consumer, socketId: string }[];

    private constructor() {
        this.roomSocketMap = new Map();
        this.connectedIdsSet = new Set();
        this.transports = []
        this.producers = []
        this.consumers = []
    }

    static getInstance(): PeerManager {
        if (!PeerManager.instance) {
            PeerManager.instance = new PeerManager();
        }
        return PeerManager.instance;
    }

    hasRoom(roomName: string): boolean {
        return this.roomSocketMap.has(roomName);
    }

    async createRoom(roomName: string) {
        const newRouter = await worker.createRouter({
            mediaCodecs: mediaCodecs
        })

        this.roomSocketMap.set(roomName, {
            peerData: [], router: newRouter
        });
    }

    addUserToRoom(roomName: string, socket: Socket) {
        if (this.roomSocketMap.has(roomName)) {
            let newRoomDataWithRouter = this.roomSocketMap.get(roomName) as { peerData: Peerdata[], router: mediasoupTypes.Router };
            let newRoomData = newRoomDataWithRouter?.peerData as Peerdata[];
            newRoomData.push({
                socket,
                socketId: socket.id
            });
            this.roomSocketMap.set(roomName, {
                router: newRoomDataWithRouter.router as mediasoupTypes.Router,
                peerData: newRoomData
            });
            this.connectedIdsSet.add(socket.id);
        }
    }

    currentState() {
        console.log("The current peermanager state is :");
        console.log(this.roomSocketMap);
        console.log(this.connectedIdsSet);
    }

    cleanUp(socket: Socket) {
        if (!this.connectedIdsSet.has(socket.id)) {
            return;
        }
        this.connectedIdsSet.delete(socket.id);
        this.roomSocketMap.forEach((peerDataArray, roomName) => {
            for (let i = 0; i < peerDataArray.peerData.length; i++) {
                if (peerDataArray.peerData[i].socketId == socket.id) {
                    peerDataArray.peerData.splice(i, 1);
                    break;
                }
            }
            if (peerDataArray.peerData.length == 0) {
                //                peerDataArray.router.rtpCapabilities
                peerDataArray.router.close();
                this.roomSocketMap.delete(roomName);
            }
        });
    }

    getRtpCapabilities(roomName: string) {
        let requiredRoom = this.roomSocketMap.get(roomName);
        console.log({ requiredRoom })
        if (!requiredRoom) {
            return null;
        }
        return requiredRoom.router.rtpCapabilities;
    }

    getRouter(roomName: string) {
        let requiredRoom = this.roomSocketMap.get(roomName);
        return requiredRoom?.router;
    }

    addTransport(transport: WebRtcTransport, roomName: string, isConsumer: boolean, socketId: string) {
        this.transports = [
            ...this.transports,
            {
                isConsumer,
                roomName,
                transport,
                socketId
            }
        ]
    }

    getTransport(socketId: string, isConsumer: boolean) {
        const transport = this.transports.find((transport) =>
            transport.socketId === socketId && transport.isConsumer === isConsumer
        );
        return transport
    }

    transportDisplayer() {
        console.log(this.transports)
    }

    addProducer(producer: mediasoupTypes.Producer, roomName: string, socketId: string) {
        this.producers = [
            ...this.producers,
            {
                producer,
                roomName,
                socketId
            }
        ]
    }

    remove(producerId: string) {
        this.producers = this.producers.filter((producer) => producer.producer.id != producerId)
    }

    hasProducers(roomName: string) {
        let count = 0;
        this.producers.forEach((producer) => {
            if (producer.roomName == roomName && !producer.producer.closed) {
                count++;
            }
        })
        // one for audio and one for video
        return count > 2
    }

    removeTransport(socketId: string) {
        this.transports = this.transports.filter((transport) => transport.socketId !== socketId)
        this.transports = this.transports.filter((transport) => transport.socketId !== socketId)
    }

    getProduerList(roomName: string, socketId: string) {
        let producers: string[] = []
        this.producers.forEach((producer) => {
            if (producer.roomName === roomName && producer.socketId !== socketId)
                producers = [
                    ...producers,
                    producer.producer.id
                ]
        })
        return producers
    }


    getConsumerTranport(serverConsumerTransportId: string): WebRtcTransport | undefined {
        let transport = this.transports.find((transpor) => (transpor.isConsumer && transpor.transport.id == serverConsumerTransportId))?.transport
        return transport
    }


    getTransportsForRemovingConsumers(consumerId: string) {
        this.transports = this.transports.filter(transportData => transportData.transport.id !== consumerId)
    }

    removeConsumers(consumerId: string) {
        this.consumers = this.consumers.filter((consumer) => consumer.consumer.id !== consumerId)
    }

    addConsumer(consumer: Consumer, roomName: string, socketId: string) {
        this.consumers.push({
            consumer,
            roomName,
            socketId
        })
    }

    async resumeConsumer(consumerId: string) {
        const consumer = this.consumers.find(consumerData => consumerData.consumer.id === consumerId)
        await consumer?.consumer.resume()
    }

}
