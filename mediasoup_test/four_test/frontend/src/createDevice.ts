import * as mediasoup from "mediasoup-client";
import { rtpCapabilities } from "./socketMessageHandler";

export let device: mediasoup.types.Device;

export async function createDevice() {
    device = new mediasoup.Device();
    await device.load({
        routerRtpCapabilities: rtpCapabilities
    });
}

