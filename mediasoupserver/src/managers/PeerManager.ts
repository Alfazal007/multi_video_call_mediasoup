import { Socket } from "socket.io";
import { types as mediasoupTypes } from "mediasoup";
import { mediaCodecs } from "./mediacodecs";
import { worker } from "..";

type Peerdata = {
    socket: Socket;
    socketId: string;
}

export class PeerManager {
    private roomSocketMap: Map<string, { peerData: Peerdata[], router: mediasoupTypes.Router }>;
    private static instance: PeerManager;
    private connectedIdsSet: Set<string>;

    private constructor() {
        this.roomSocketMap = new Map();
        this.connectedIdsSet = new Set();
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
        if (!requiredRoom) {
            return null;
        }
        return requiredRoom.router.rtpCapabilities;
    }
}
