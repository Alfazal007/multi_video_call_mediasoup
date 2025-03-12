import { useSocket } from "./useSocket";

export async function createSendTransport() {
    const [socket] = useSocket();
    if (!socket) {
        console.log("Socket not initialized");
        return;
    }
}
