import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import * as mediasoup from "mediasoup-client";
import {
    connectSendTransport,
    createDeviceAndLoad,
    producerGenerator,
    producerTransport,
    signalNewConsumerTransport,
} from "./deviceHandler";
import { DtlsParameters, IceCandidate, IceParameters } from "mediasoup-client/lib/types";

export let audioParams: any = {};
export let videoParams: any = {
    params: {
        // mediasoup params
        encodings: [
            {
                rid: 'r0',
                maxBitrate: 100000,
                scalabilityMode: 'S1T3',
            },
            {
                rid: 'r1',
                maxBitrate: 300000,
                scalabilityMode: 'S1T3',
            },
            {
                rid: 'r2',
                maxBitrate: 900000,
                scalabilityMode: 'S1T3',
            },
        ],
        // https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerCodecOptions
        codecOptions: {
            videoGoogleStartBitrate: 1000
        }
    }
};

export const useSocket = (): [Socket | null, string] => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [socketId, setSocketId] = useState<string>("");
    const [mediaStreamReady, setMediaStreamReady] = useState<boolean>(false);
    const [transportReady, setTransportReady] = useState<boolean>(false);

    useEffect(() => {
        const webSocket = io("http://localhost:3000");
        setSocket(webSocket);

        // Get media stream first
        const getLocalStream = () => {
            navigator.mediaDevices.getUserMedia({
                audio: true,
                video: {
                    width: {
                        min: 640,
                        max: 1920,
                    },
                    height: {
                        min: 400,
                        max: 1080,
                    }
                }
            })
                .then(streamSuccess)
                .catch(error => {
                    console.log("Error getting media stream:", error.message);
                });
        };

        const streamSuccess = (stream: MediaStream) => {
            console.log("Got media stream successfully");

            // Set video in the DOM
            const videoElement = document.getElementById("localVideo") as HTMLVideoElement;
            if (videoElement) {
                videoElement.srcObject = stream;
            }

            // Update params with tracks
            audioParams = { ...audioParams, track: stream.getAudioTracks()[0] };
            videoParams = { ...videoParams, track: stream.getVideoTracks()[0] };

            // Set flag that media is ready
            setMediaStreamReady(true);
        };

        // Socket event handlers
        webSocket.on("connected", (data) => {
            console.log("Connected to signaling server:", data.socketId);
            setSocketId(data.socketId);
            getLocalStream();

            // Initialize MediaSoup client
            webSocket.emit("rtpCapabilities", async ({ rtpCapabilities }: { rtpCapabilities: mediasoup.types.RtpCapabilities }) => {
                await createDeviceAndLoad(rtpCapabilities);

                // Create producer transport
                webSocket.emit("createTransport", false, (params: {
                    id: string,
                    iceParameters: IceParameters,
                    iceCandidates: IceCandidate[],
                    dtlsParameters: DtlsParameters,
                }) => {
                    console.log("Producer transport created:", params);
                    // Just create the transport but don't connect yet
                    producerGenerator(params, webSocket);
                    setTransportReady(true);
                });
            });
        });

        webSocket.on('new-producer', ({ producerId }) => {
            console.log("New producer detected:", producerId);
            signalNewConsumerTransport(producerId, webSocket);
        });

        return () => {
            webSocket.disconnect();
        };
    }, []);

    // This effect runs when both media stream and transport are ready
    useEffect(() => {
        if (mediaStreamReady && transportReady && producerTransport) {
            console.log("Both media stream and transport are ready, connecting transport");
            // Now it's safe to connect the transport and produce media
            connectSendTransport();
        }
    }, [mediaStreamReady, transportReady]);

    return [socket, socketId];
};
