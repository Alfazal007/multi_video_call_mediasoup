import { useEffect, useState } from "react";
import { OutgoingMessage, OutgoingMessageType } from "./types";
import { sendMessage } from "./sendMessage";
import { init } from "./socketMessageHandler";

export let ws: WebSocket;

const MainComponent = () => {
    const [socket, setSocket] = useState<WebSocket>();

    useEffect(() => {
        console.log({ socket });
        if (!socket) {
            return;
        }
        socket.onopen = () => {
            let rtpCapabilitiesGetMessage: OutgoingMessage = {
                data: {},
                type: OutgoingMessageType.RTPCAPABILITIES
            };
            init();
            sendMessage(rtpCapabilitiesGetMessage);
        }
    }, [socket]);

    useEffect(() => {
        ws = new WebSocket("ws://localhost:8000");
        setSocket(ws);
    }, []);

    return (
        <div>Main</div>
    )
}

export default MainComponent
