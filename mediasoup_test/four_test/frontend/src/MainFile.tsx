import { useEffect, useState } from "react";
import { OutgoingMessage, OutgoingMessageType } from "./types";
import { sendMessage, videoParameters } from "./sendMessage";
import { init } from "./socketMessageHandler";
import HtmlComponent from "./HtmlComponent";
import { createSendTransport } from "./createSendTransport";

export let ws: WebSocket;

const MainComponent = () => {
    const [socket, setSocket] = useState<WebSocket>();
    let audioParams;
    let videoParams = { params: videoParameters };

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
        <>
            <HtmlComponent />
        </>
    )
}

export default MainComponent
