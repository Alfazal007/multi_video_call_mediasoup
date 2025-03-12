import express from 'express';
import { createServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import cors from "cors";
import { initMessageHandler } from './websocketHandler';
import { initWorker } from './workerHandler';
import { Consumer, Producer, WebRtcTransport } from 'mediasoup/node/lib/types';

const app = express();
app.use(cors({ origin: "*" }));
const server = createServer(app);
export let transportsArray: { isConsumer: boolean, transport: WebRtcTransport, socketId: string }[] = [];
export let producersArray: { producer: Producer, socketId: string, producerId: string }[] = [];
export let peers: Map<string, Socket> = new Map();
export let consumers: {
    socketId: string,
    consumer: Consumer,
}[] = [];

export const addConsumer = (consumer: Consumer, socket: Socket) => {
    // add the consumer to the consumers list
    consumers = [
        ...consumers,
        { socketId: socket.id, consumer, }
    ]
}
export const wss = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

initWorker();
initMessageHandler();

export function addTransport(transport: WebRtcTransport, isConsumer: boolean, socketId: string) {
    transportsArray = [
        ...transportsArray,
        {
            isConsumer,
            transport,
            socketId
        }
    ]
    console.log("transport updated");
    console.log(transportsArray);
}

export function getTransport(socketId: string) {
    let transportToReturn = transportsArray.filter((transport) => transport.socketId == socketId && !transport.isConsumer);
    return transportToReturn[0].transport;
}

export function addProducer(producer: Producer, socketId: string) {
    producersArray.push({
        producer,
        socketId,
        producerId: producer.id
    })
}

export function informConsumers(socketId: string, producerId: string) {
    producersArray.forEach(producerData => {
        if (producerData.socketId !== socketId) {
            const producerSocket = peers.get(producerData.socketId);
            if (producerSocket)
                producerSocket.emit('new-producer', { producerId })
        }
    })
}

server.listen(3000, () => {
    console.log('server running at 3000');
});
