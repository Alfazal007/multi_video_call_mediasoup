import { useEffect, useState } from "react"
import { IncomingMessage, OutgoingMessage, OutgoingMessageType } from "./types";

const Main = () => {
    const [socket, setSocket] = useState<null | WebSocket>(null);
    const [rtpCapabilities, setRtpCapabilities] = useState();

    useEffect(() => {
        console.log({ rtpCapabilities });
    }, [rtpCapabilities]);

    function getRtpCapabilities() {
        let messageToSend: OutgoingMessage = {
            data: {},
            type: OutgoingMessageType.GETRTPPARAMETERS
        }
        socket?.send(JSON.stringify(messageToSend));
    }

    useEffect(() => {
        if (!socket) {
            const ws = new WebSocket("ws://localhost:8000");
            setSocket(ws);
            return;
        }
        socket.onopen = () => { getRtpCapabilities() };

        socket.onmessage = (event) => {
            let receivedMessage: IncomingMessage = event.data;
            console.log({ yo: receivedMessage.data });
            setRtpCapabilities(receivedMessage.data);
        }

    }, [socket]);

    return (
        <div>Start</div>
    )
}

export default Main
