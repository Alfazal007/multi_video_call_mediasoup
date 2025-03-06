const mediasoupClient = require('mediasoup-client');

// ✅ Correct WebSocket URL
const socket = new WebSocket("ws://127.0.0.1:8000");

socket.onopen = () => {
    console.log("Connected");
};

socket.onmessage = (event) => {
    console.log("Message from server:", event.data);
};

socket.onerror = (error) => {
    console.error("WebSocket Error:", error);
};

socket.onclose = () => {
    console.log("WebSocket connection closed");
};

let device;
let rtpCapabilities;
let producerTransport;
let consumerTransport;
let producer;
let consumer;

let params = {
    encodings: [
        { rid: 'r0', maxBitrate: 100000, scalabilityMode: 'S1T3' },
        { rid: 'r1', maxBitrate: 300000, scalabilityMode: 'S1T3' },
        { rid: 'r2', maxBitrate: 900000, scalabilityMode: 'S1T3' },
    ],
    codecOptions: { videoGoogleStartBitrate: 1000 },
};

const streamSuccess = async (stream) => {
    localVideo.srcObject = stream;
    const track = stream.getVideoTracks()[0];
    params = { track, ...params };
};

const getLocalStream = () => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(streamSuccess)
        .catch(error => console.error(error.message));
};

const createDevice = async () => {
    try {
        device = new mediasoupClient.Device();
        await device.load({ routerRtpCapabilities: rtpCapabilities });
        console.log("RTP Capabilities", device.rtpCapabilities);
    } catch (error) {
        console.error(error);
        if (error.name === "UnsupportedError") console.warn("Browser not supported");
    }
};

const getRtpCapabilities = () => {
    socket.send(JSON.stringify({ action: "getRtpCapabilities" }));
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.action === "getRtpCapabilities") {
        console.log(`Router RTP Capabilities:`, data.rtpCapabilities);
        rtpCapabilities = data.rtpCapabilities;
    }
};

const createSendTransport = () => {
    socket.send(JSON.stringify({ action: "createWebRtcTransport", sender: true }));
};

socket.onmessage = async (event) => {
    const data = JSON.parse(event.data);

    if (data.action === "createWebRtcTransport") {
        if (data.params.error) {
            console.error(data.params.error);
            return;
        }

        producerTransport = device.createSendTransport(data.params);

        producerTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
            socket.send(JSON.stringify({ action: "transport-connect", dtlsParameters }));
            callback();
        });

        producerTransport.on("produce", async (parameters, callback, errback) => {
            socket.send(JSON.stringify({
                action: "transport-produce",
                kind: parameters.kind,
                rtpParameters: parameters.rtpParameters,
                appData: parameters.appData,
            }));

            socket.onmessage = (event) => {
                const response = JSON.parse(event.data);
                if (response.action === "transport-produce") {
                    callback({ id: response.id });
                }
            };
        });
    }
};

const connectSendTransport = async () => {
    producer = await producerTransport.produce(params);
    producer.on("trackended", () => console.log("Track ended"));
    producer.on("transportclose", () => console.log("Transport closed"));
};

const createRecvTransport = async () => {
    socket.send(JSON.stringify({ action: "createWebRtcTransport", sender: false }));
};

socket.onmessage = async (event) => {
    const data = JSON.parse(event.data);

    if (data.action === "createWebRtcTransport" && !data.params.sender) {
        consumerTransport = device.createRecvTransport(data.params);

        consumerTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
            socket.send(JSON.stringify({ action: "transport-recv-connect", dtlsParameters }));
            callback();
        });
    }
};

const connectRecvTransport = async () => {
    socket.send(JSON.stringify({ action: "consume", rtpCapabilities: device.rtpCapabilities }));

    socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        if (data.action === "consume") {
            consumer = await consumerTransport.consume({
                id: data.params.id,
                producerId: data.params.producerId,
                kind: data.params.kind,
                rtpParameters: data.params.rtpParameters,
            });

            remoteVideo.srcObject = new MediaStream([consumer.track]);
            socket.send(JSON.stringify({ action: "consumer-resume" }));
        }
    };
};

// ✅ Ensure buttons are correctly assigned
document.getElementById("btnLocalVideo").addEventListener("click", getLocalStream);
document.getElementById("btnRtpCapabilities").addEventListener("click", getRtpCapabilities);
document.getElementById("btnDevice").addEventListener("click", createDevice);
document.getElementById("btnCreateSendTransport").addEventListener("click", createSendTransport);
document.getElementById("btnConnectSendTransport").addEventListener("click", connectSendTransport);
document.getElementById("btnRecvSendTransport").addEventListener("click", createRecvTransport);
document.getElementById("btnConnectRecvTransport").addEventListener("click", connectRecvTransport);

