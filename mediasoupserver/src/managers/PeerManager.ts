import { Socket } from "socket.io";

type Peerdata = {
    socket: Socket;
    socketId: string;
}

export class PeerManager {
    private roomSocketMap: Map<string, Peerdata[]>;
    private static instance: PeerManager;

    private constructor() {
        this.roomSocketMap = new Map();
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
        }
    }

    currentState() {
        console.log("The current peermanager state is :");
        console.log(this.roomSocketMap);
    }
}
