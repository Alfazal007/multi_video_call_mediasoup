import { useEffect, useState } from "react"
import { IncomingMessage, IncomingMessageType, OutgoingMessage, OutgoingMessageType } from "./types";
import mediasoupClient from "mediasoup-client";

const Main = () => {
    let device: mediasoupClient.types.Device;
    let rtpCapabilities
    let producerTransport: any
    let consumerTransports = []
    let audioProducer
    let videoProducer
    let consumer
    let isProducer = false;
    let socket: WebSocket | null;



    let params = {
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

    let audioParams;
    let videoParams = { params };
    let consumingTransports: any[] = [];

    async function createDevice(rtpCapabilities: any) {
        device = new mediasoupClient.Device();
        await device.load({
            routerRtpCapabilities: rtpCapabilities
        });
    }


    const connectSendTransport = async () => {
        audioProducer = await producerTransport.produce(audioParams);
        videoProducer = await producerTransport.produce(videoParams);

        audioProducer.on('trackended', () => {
            console.log('audio track ended')
        })

        audioProducer.on('transportclose', () => {
            console.log('audio transport ended')
        })

        videoProducer.on('trackended', () => {
            console.log('video track ended')
        })

        videoProducer.on('transportclose', () => {
            console.log('video transport ended')
        })
    }

    const signalNewConsumerTransport = async (remoteProducerId: any) => {
        //check if we are already consuming the remoteProducerId
        if (consumingTransports.includes(remoteProducerId)) return;
        consumingTransports.push(remoteProducerId);
        await socket.emit('createWebRtcTransport', { consumer: true }, ({ params }) => {
            // The server sends back params needed 
            // to create Send Transport on the client side
            if (params.error) {
                console.log(params.error)
                return
            }
            console.log(`PARAMS... ${params}`)
            let consumerTransport
            try {
                consumerTransport = device.createRecvTransport(params)
            } catch (error) {
                // exceptions: 
                // {InvalidStateError} if not loaded
                // {TypeError} if wrong arguments.
                console.log(error)
                return
            }
            consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                try {
                    // Signal local DTLS parameters to the server side transport
                    // see server's socket.on('transport-recv-connect', ...)
                    await socket.emit('transport-recv-connect', {
                        dtlsParameters,
                        serverConsumerTransportId: params.id,
                    })
                    // Tell the transport that parameters were transmitted.
                    callback()
                } catch (error) {
                    // Tell the transport that something was wrong
                    errback(error)
                }
            })
            connectRecvTransport(consumerTransport, remoteProducerId, params.id)
        })
    }

    function getRtpCapabilities() {
        let messageToSend: OutgoingMessage = {
            data: {},
            type: OutgoingMessageType.GETRTPPARAMETERS
        }
        socket?.send(JSON.stringify(messageToSend));
    }

    useEffect(() => {
        if (!socket) {
            socket = new WebSocket("ws://localhost:8000");
            return;
        }
        socket.onopen = () => { getRtpCapabilities() };

        socket.onmessage = async (event) => {
            let receivedMessage: IncomingMessage = JSON.parse(event.data);
            switch (receivedMessage.type) {
                case IncomingMessageType.GETRTPPARAMETERS:
                    await createDevice(receivedMessage.data);
                    break;
                case IncomingMessageType.CREATETRANSPORT:
                    producerTransport = device.createSendTransport(receivedMessage.data);

                    // @ts-ignore
                    producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                        try {
                            let messageToSend: OutgoingMessage = {
                                data: dtlsParameters,
                                type: OutgoingMessageType.TRANSPORTCONNECT
                            }
                            socket?.send(JSON.stringify(messageToSend));
                            callback()
                        } catch (error) {
                            errback(error)
                        }
                    })

                    // @ts-ignore
                    producerTransport.on('produce', async (parameters, callback, errback) => {
                        console.log(parameters)

                        try {
                            // tell the server to create a Producer
                            // with the following parameters and produce
                            // and expect back a server side producer id
                            // see server's socket.on('transport-produce', ...)
                            let messageToSend: OutgoingMessage = {
                                data: {
                                    kind: parameters.kind,
                                    rtpParameters: parameters.rtpParameters,
                                    appData: parameters.appData,
                                },
                                type: OutgoingMessageType.TRANSPORTPRODUCE
                            }
                            // TODO:: DO some stuff here
                            socket?.send(JSON.stringify(messageToSend));
                        } catch (error) {
                            errback(error)
                        }
                    })
                case IncomingMessageType.TRANSPORTPRODUCE:
                    let producersExist = receivedMessage.data.producersExist;
                    // @ts-ignore
                    producerTransport.on('produce', async (parameters, callback, errback) => {
                        callback({ id: receivedMessage.data.id });
                        if (producersExist) {
                            let messageToSend: OutgoingMessage = {
                                type: OutgoingMessageType.GETPRODUCERS,
                                data: {}
                            }
                            socket?.send(JSON.stringify(messageToSend));
                        }
                    });
                    break;
                case IncomingMessageType.GETPRODUCERS:
                    let producerIds = receivedMessage.data;
                    producerIds.forEach(signalNewConsumerTransport)

            }
        }
    }, []);

    return (
        <div>Start</div>
    )
}

export default Main
