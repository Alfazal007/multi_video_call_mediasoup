import http from 'http'
import socketIo from 'socket.io';
import { isValidUser } from './helpers/isValidUser';
import { PeerManager } from './managers/PeerManager';
import * as mediaousp from "mediasoup";
import { types as mediasoupTypes } from "mediasoup";

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
            await peerManager.createRoom(data.room);
        }
        peerManager.addUserToRoom(data.room, socket);
        peerManager.currentState();
    });

    socket.on('disconnect', () => {
        console.log("disconnected");
        peerManager.cleanUp(socket);
        peerManager.currentState();
    });

    socket.on('rtp', ({ roomName }, callback) => {
        let rtpCapabilities = peerManager.getRtpCapabilities(roomName);
        callback({ rtpCapabilities })
    })

});

server.listen(3000, () => {
    console.log("server listening on port 3000");
});
