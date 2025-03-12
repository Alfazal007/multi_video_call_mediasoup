import * as mediasoup from "mediasoup-client";
import { DtlsParameters, IceCandidate, IceParameters, Transport } from "mediasoup-client/lib/types";
import { Socket } from "socket.io-client";
import { audioParams, videoParams } from "./useSocket";
export let device: mediasoup.types.Device;
export let producerTransport: mediasoup.types.Transport;
export let consumingTransports: string[];
export let consumerTransports: {
    consumerTransport: Transport,
    serverConsumerTransportId: string,
    producerId: string,
    consumer: mediasoup.types.Consumer,

}[] = [];
export let audioProducer: any;
export let videoProducer: any;

export async function createDeviceAndLoad(rtpCapabilities: mediasoup.types.RtpCapabilities) {
    device = new mediasoup.Device();
    await device.load({
        routerRtpCapabilities: rtpCapabilities
    });
}

export const producerGenerator = async (params: {
    id: string,
    iceParameters: IceParameters,
    iceCandidates: IceCandidate[],
    dtlsParameters: DtlsParameters,
}, socket: Socket) => {
    producerTransport = device.createSendTransport(params);
    producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
            socket.emit('transport-connect', {
                dtlsParameters,
            })

            // Tell the transport that parameters were transmitted.
            callback()

        } catch (error: any) {
            console.log({ error });
            errback(error)
        }
    })

    producerTransport.on('produce', async (parameters, callback, errback) => {
        console.log(parameters)
        try {
            socket.emit('transport-produce', {
                kind: parameters.kind,
                rtpParameters: parameters.rtpParameters,
                appData: parameters.appData,
            }, (id: string, producersExist: boolean) => {
                callback({ id })
                if (producersExist) {
                    socket.emit('getProducers', (producerIds: string[]) => {
                        console.log(producerIds)
                        producerIds.forEach((id) => signalNewConsumerTransport(id, socket));
                    })
                }
            })
        } catch (error: any) {
            console.log({ error });
            errback(error)
        }
    })

    connectSendTransport()
}


export const connectSendTransport = async () => {
    // we now call produce() to instruct the producer transport
    // to send media to the Router
    // https://mediasoup.org/documentation/v3/mediasoup-client/api/#transport-produce
    // this action will trigger the 'connect' and 'produce' events above

    audioProducer = await producerTransport.produce(audioParams);
    videoProducer = await producerTransport.produce(videoParams);

    audioProducer.on('trackended', () => {
        console.log('audio track ended')

        // close audio track
    })

    audioProducer.on('transportclose', () => {
        console.log('audio transport ended')

        // close audio track
    })

    videoProducer.on('trackended', () => {
        console.log('video track ended')

        // close video track
    })

    videoProducer.on('transportclose', () => {
        console.log('video transport ended')

        // close video track
    })
}


export const signalNewConsumerTransport = async (remoteProducerId: string, socket: Socket) => {
    //check if we are already consuming the remoteProducerId
    if (consumingTransports.includes(remoteProducerId)) return;
    consumingTransports.push(remoteProducerId);

    socket.emit('createTransport', true, (params: {
        id: string,
        iceParameters: IceParameters,
        iceCandidates: IceCandidate[],
        dtlsParameters: DtlsParameters,
    }) => {
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
                socket.emit('transport-recv-connect', {
                    dtlsParameters,
                    serverConsumerTransportId: params.id,
                })

                // Tell the transport that parameters were transmitted.
                callback()
            } catch (error: any) {
                // Tell the transport that something was wrong
                errback(error)
            }
        })

        connectRecvTransport(consumerTransport, remoteProducerId, params.id, socket)
    })
}

const connectRecvTransport = async (consumerTransport: mediasoup.types.Transport, remoteProducerId: string, serverConsumerTransportId: string, socket: Socket) => {
    // for consumer, we need to tell the server first
    // to create a consumer based on the rtpCapabilities and consume
    // if the router can consume, it will send back a set of params as below
    socket.emit('consume', {
        rtpCapabilities: device.rtpCapabilities,
        remoteProducerId,
        serverConsumerTransportId,
    }, async ({ params }: { params: any }) => {
        if (params.error) {
            console.log('Cannot Consume')
            return
        }

        console.log(`Consumer Params ${params}`)
        // then consume with the local consumer transport
        // which creates a consumer
        const consumer = await consumerTransport.consume({
            id: params.id,
            producerId: params.producerId,
            kind: params.kind,
            rtpParameters: params.rtpParameters
        })

        consumerTransports = [
            ...consumerTransports,
            {
                consumerTransport,
                serverConsumerTransportId: params.id as string,
                producerId: remoteProducerId as string,
                consumer,
            },
        ]

        // create a new div element for the new consumer media
        const newElem = document.createElement('div')
        newElem.setAttribute('id', `td-${remoteProducerId}`)

        if (params.kind == 'audio') {
            //append to the audio container
            newElem.innerHTML = '<audio id="' + remoteProducerId + '" autoplay></audio>'
        } else {
            //append to the video container
            newElem.setAttribute('class', 'remoteVideo')
            newElem.innerHTML = '<video id="' + remoteProducerId + '" autoplay class="video" ></video>'
        }

        document.getElementById("videoContainer")?.appendChild(newElem)

        // destructure and retrieve the video track from the producer
        const { track } = consumer

        // @ts-ignore
        document.getElementById(remoteProducerId).srcObject = new MediaStream([track])

        // the server consumer started with media paused
        // so we need to inform the server to resume
        socket.emit('consumer-resume', { serverConsumerId: params.serverConsumerId })
    })
}
