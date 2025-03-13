import { Socket } from "socket.io";

type Peerdata = {
    socket: Socket;
}

export class PeerManager {
    private roomSocketMap: Map<string, Peerdata[]> = new Map();
    private static instance: PeerManager;

    private constructor() {
        PeerManager.instance = new PeerManager();
        console.log("connstruictor called");
    }

    static getInstance(): PeerManager {
        if (!PeerManager.instance) {
            PeerManager.instance = new PeerManager();
        }
        return PeerManager.instance;
    }
}
