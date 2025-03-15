import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export const useSocket = () => {
    const [socket, setSocket] = useState<Socket | null>(null);
    useEffect(() => {
        const ws = io("http://localhost:3000");
        setSocket(ws)
        ws.on("connect", () => {
            console.log("Connected to server with ID:", ws.id);
        });

        ws.on("disconnect", () => {
            console.log("Disconnected from server");
        });

        return () => {
            ws.close();
            setSocket(null)
        };
    }, []);
    return socket;
};
