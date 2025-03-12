import { createTransport } from "./createTransport";
import { addConsumer, addProducer, addTransport, consumers, getTransport, informConsumers, peers, producersArray, transportsArray, wss } from "./index";
import { router } from "./workerHandler";

export function initMessageHandler() {
    wss.on('connection', (socket) => {
        console.log('a user connected');
        peers.set(socket.id, socket);

        socket.emit("connected", { socketId: socket.id });

        socket.on("message", (data) => {
            console.log({ data });
        });

        socket.on("rtpCapabilities", (callback) => {
            let rtpCapabilities = router.rtpCapabilities;
            callback({ rtpCapabilities })
        });

        socket.on("createTransport", async (isConsumer: boolean, callback) => {
            console.log({ isConsumer });
            try {
                let newTransport = await createTransport();
                callback({
                    id: newTransport.id,
                    iceParameters: newTransport.iceParameters,
                    iceCandidates: newTransport.iceCandidates,
                    dtlsParameters: newTransport.dtlsParameters,
                });
                addTransport(newTransport, isConsumer, socket.id);
            } catch (err) {
                console.log("Issue creating the transport");
            }
        });

        socket.on('transport-produce', async ({ kind, rtpParameters, appData }, callback) => {
            // call produce based on the prameters from the client
            const producer = await getTransport(socket.id).produce({
                kind,
                rtpParameters,
            });

            addProducer(producer, socket.id);

            informConsumers(socket.id, producer.id)

            console.log('Producer ID: ', producer.id, producer.kind)

            producer.on('transportclose', () => {
                console.log('transport for this producer closed ')
                producer.close()
            })

            // Send back to the client the Producer's id
            callback({
                id: producer.id,
                producersExist: producersArray.length > 1 ? true : false
            })
        });

        socket.on('transport-connect', ({ dtlsParameters }) => {
            getTransport(socket.id).connect({ dtlsParameters });
        })

        socket.on('getProducers', callback => {
            let producerList: string[] = [];
            producersArray.forEach(producerData => {
                if (producerData.socketId !== socket.id) {
                    producerList = [...producerList, producerData.producer.id]
                }
            })

            callback(producerList)
        });

        socket.on('transport-recv-connect', async ({ dtlsParameters, serverConsumerTransportId }) => {
            console.log(`DTLS PARAMS: ${dtlsParameters}`);
            const consumerTransport = transportsArray.find(transportData => (
                transportData.isConsumer && transportData.transport.id == serverConsumerTransportId
            ));
            await consumerTransport?.transport.connect({ dtlsParameters })
        });

        socket.on('consume', async ({ rtpCapabilities, remoteProducerId, serverConsumerTransportId }, callback) => {
            try {

                let consumerTransport = transportsArray.find(transportData => (
                    transportData.isConsumer && transportData.transport.id == serverConsumerTransportId
                ))?.transport

                // check if the router can consume the specified producer
                if (router.canConsume({
                    producerId: remoteProducerId,
                    rtpCapabilities
                })) {
                    // transport can now consume and return a consumer
                    const consumer = await consumerTransport?.consume({
                        producerId: remoteProducerId,
                        rtpCapabilities,
                        paused: true,
                    })

                    consumer?.on('transportclose', () => {
                        console.log('transport close from consumer')
                    })

                    consumer?.on('producerclose', () => {
                        console.log('producer of consumer closed')
                        socket.emit('producer-closed', { remoteProducerId })

                        consumerTransport?.close()
                        // @ts-ignore
                        transports = transports.filter(transportData => transportData.transport.id !== consumerTransport?.id)
                        consumer.close()
                        // @ts-ignore
                        consumers = consumers.filter(consumerData => consumerData.consumer.id !== consumer.id)
                    })

                    // @ts-ignore
                    addConsumer(consumer, socket)

                    // from the consumer extract the following params
                    // to send back to the Client
                    const params = {
                        id: consumer?.id,
                        producerId: remoteProducerId,
                        kind: consumer?.kind,
                        rtpParameters: consumer?.rtpParameters,
                        serverConsumerId: consumer?.id,
                    }

                    // send the parameters to the client
                    callback({ params })
                }
            } catch (error: any) {
                console.log(error.message)
                callback({
                    params: {
                        error: error
                    }
                })
            }
        })

        socket.on('consumer-resume', async ({ serverConsumerId }) => {
            console.log('consumer resume')
            const consumer
                = consumers.find(consumerData => consumerData.consumer.id
                    === serverConsumerId);
            await consumer?.consumer.resume()
        })
    })

}
