import { Socket } from "socket.io";

type Peerdata = {
    socket: Socket;
    socketId: string;
}

export class PeerManager {
    private roomSocketMap: Map<string, Peerdata[]>;
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

    createRoom(roomName: string) {
        this.roomSocketMap.set(roomName, []);
    }

    addUserToRoom(roomName: string, socket: Socket) {
        if (this.roomSocketMap.has(roomName)) {
            let newRoomData = this.roomSocketMap.get(roomName) as Peerdata[];
            newRoomData.push({
                socket,
                socketId: socket.id
            });
            this.roomSocketMap.set(roomName, newRoomData);
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
            for (let i = 0; i < peerDataArray.length; i++) {
                if (peerDataArray[i].socketId == socket.id) {
                    peerDataArray.splice(i, 1);
                    break;
                }
            }
            if (peerDataArray.length == 0) {
                this.roomSocketMap.delete(roomName);
            }
        });
    }
}
