import * as mediasoup from "mediasoup";

let worker: mediasoup.types.Worker;
export let router: mediasoup.types.Router;

export async function initWorker() {
    worker = await mediasoup.createWorker();
    router = await worker.createRouter({
        mediaCodecs
    });
}


const mediaCodecs: mediasoup.types.RtpCodecCapability[] = [
    {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
    },
    {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
            'x-google-start-bitrate': 1000,
        },
    },
]
