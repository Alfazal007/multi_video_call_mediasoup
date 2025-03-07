import { WebSocketServer } from 'ws';
import mediasoup from "mediasoup";
import { mediaCodecs } from './mediaCodecs';

const wss = new WebSocketServer({ port: 8000 });

let worker: mediasoup.types.Worker;
let router: mediasoup.types.Router;

async function main() {
    worker = await mediasoup.createWorker();
    console.log(`Worker process ID ${worker.pid}`);

    worker.on("died", (error) => {
        console.error("mediasoup worker has died ", error);
        process.exit();
    });

    router = await worker.createRouter({
        mediaCodecs: mediaCodecs,
    });
}
main();

wss.on('connection', function connection(ws) {
    ws.on('error', console.error);

    ws.on('message', function message(data) {
        const message = JSON.parse(data.toString());
    });
});
