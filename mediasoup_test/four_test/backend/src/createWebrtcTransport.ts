import { types as mediaSoupTypes } from "mediasoup";
import { router } from ".";
import { WebSocket } from "ws";
import { OutgoingMessage, OutgoingMessageType } from "./types";

export function sendTransportDataToClient(ws: WebSocket, transport: mediaSoupTypes.WebRtcTransport) {
    let messageToSend: OutgoingMessage = {
        type: OutgoingMessageType.CREATEWEBRTCTRANSPORT,
        data: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        }
    }
    ws.send(JSON.stringify(messageToSend));
}

export const createWebRtcTransport = async (): Promise<mediaSoupTypes.WebRtcTransport> => {
    return new Promise(async (resolve, reject) => {
        try {
            const webRtcTransport_options = {
                listenIps: [
                    {
                        ip: '0.0.0.0', // replace with relevant IP address
                        announcedIp: '10.0.0.115',
                    }
                ],
                enableUdp: true,
                enableTcp: true,
                preferUdp: true,
            }

            let transport = await router.createWebRtcTransport(webRtcTransport_options)
            console.log(`transport id: ${transport.id}`)

            transport.on('dtlsstatechange', dtlsState => {
                if (dtlsState === 'closed') {
                    transport.close()
                }
            })

            transport.on('@close', () => {
                console.log('transport closed')
            })

            resolve(transport)

        } catch (error) {
            reject(error)
        }
    })
}
