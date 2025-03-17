import { Button } from "@/components/ui/button"
import { params } from "@/constants/videoParams"
import { UserContext } from "@/context/UserContext"
import { useSocket } from "@/hooks/useSocket"
import { useContext, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { types as mediasoupTypes } from "mediasoup-client"
import * as mediasoup from "mediasoup-client"

type ConsumerTransportDataType = {
    consumerTransport: mediasoupTypes.Transport<mediasoupTypes.AppData>;
    serverConsumerTransportId: any;
    producerId: string;
    consumer: mediasoupTypes.Consumer<mediasoupTypes.AppData>;
}


const Room = () => {
    const { roomName } = useParams();
    const { user } = useContext(UserContext)
    const route = useNavigate()
    let socket = useSocket()
    const [audioConsume, setAudioConsume] = useState(true);
    const [videoConsume, setVideoConsume] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [rtpCapabilities, setRtpCapabilities] = useState<mediasoupTypes.RtpCapabilities>();
    const [producerTransportState, setProducerTransportState] = useState<mediasoupTypes.Transport>();
    let audioProducer: mediasoupTypes.Producer, videoProducer: mediasoupTypes.Producer;
    const [consumerTransports, setConsumerTransports] = useState<ConsumerTransportDataType[]>([]);
    const [consumingTransports, setConsumingTransports] = useState<string[]>([]);

    const audioParamsRef = useRef<any>(null);
    const videoParamsRef = useRef<any>({ params });

    async function setTrackAndData() {
        if (!producerTransportState) {
            console.log("early return")
            return
        }
        if (audioConsume) {
            console.log(audioParamsRef.current)
            audioProducer = await producerTransportState.produce(audioParamsRef.current);
            audioProducer.on('trackended', () => {
                console.log('audio track ended')
            })
            audioProducer.on('transportclose', () => {
                console.log('audio transport ended')
            })
        } else if (!audioConsume) {
            audioProducer?.close();
        }
        if (videoConsume) {
            console.log(videoParamsRef.current)
            videoProducer = await producerTransportState.produce(videoParamsRef.current);
            videoProducer.on('trackended', () => {
                console.log('video track ended')
            })
            videoProducer.on('transportclose', () => {
                console.log('video transport ended')
            })
        } else if (!videoConsume) {
            videoProducer?.close();
        }
    }

    useEffect(() => {
        setTrackAndData()
    }, [producerTransportState, audioConsume, videoConsume])


    useEffect(() => {
        if (rtpCapabilities) {
            console.log("RtpCapabilities")
            console.log(rtpCapabilities)
        }
    }, [rtpCapabilities])

    useEffect(() => {
        if (!user) {
            console.log({ user })
            if (!user) {
                console.warn("User not found, redirecting to sign-in.");
            }
            route("/signin")
            return
        }
    }, [user])

    useEffect(() => {
        return () => {
            if (socket?.active) {
                socket?.close();
            }
        };
    }, []);

    async function connectToSocket() {
        socket?.emit("establish-connection", {
            accessToken: user?.accessToken,
            room: roomName
        });

        joinRoom()
        getLocalStream()
    }

    useEffect(() => {
        if (socket) {
            getLocalStream()
        }
    }, [audioConsume, videoConsume])

    const getLocalStream = () => {
        navigator.mediaDevices.getUserMedia({
            audio: audioConsume,
            video: videoConsume && {
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
                console.log(error.message)
            })
    }

    const streamSuccess = (stream: any) => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
        audioParamsRef.current = { track: stream.getAudioTracks()[0], ...audioParamsRef.current };
        videoParamsRef.current = { track: stream.getVideoTracks()[0], ...videoParamsRef.current };
        console.log("set data")
        console.log(audioParamsRef.current)
    }

    const joinRoom = () => {
        socket?.emit('rtp', { roomName }, async (data: { rtpCapabilities: mediasoupTypes.RtpCapabilities }) => {
            console.log(`Router RTP Capabilities...${data.rtpCapabilities}`)
            setRtpCapabilities(data.rtpCapabilities)
            setTimeout(
                async () => {
                    await createDevice(data.rtpCapabilities)
                }, 2000)
        })
    }

    const createDevice = async (rtpCaps: mediasoupTypes.RtpCapabilities) => {
        console.log("create device called")
        let device = new mediasoup.Device()
        console.log({ rtpCaps })
        await device.load({
            routerRtpCapabilities: rtpCaps
        })
        console.log("device loaded")
        await new Promise((resolve) => {
            setTimeout(() => {
                resolve(1);
            }, 2000);
        });

        console.log("after promise")

        // create the send transport
        socket?.emit('createWebRtcTransport', { consumer: false, roomName }, async ({
            id,
            iceParameters,
            iceCandidates,
            dtlsParameters,
            error
        }: {
            id: string,
            iceParameters: mediasoupTypes.IceParameters,
            iceCandidates: mediasoupTypes.IceCandidate[],
            dtlsParameters: mediasoupTypes.DtlsParameters,
            error: any
        }) => {
            if (error) {
                console.log(error)
                return
            }


            let producerTransport = device.createSendTransport({
                dtlsParameters,
                iceParameters,
                iceCandidates,
                id
            })

            producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                try {
                    socket.emit('transport-connect', {
                        dtlsParameters,
                        consumer: false
                    })
                    console.log("Producer transport connceted");
                    callback()
                } catch (error: any) {
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
                        roomName
                    }, ({ id, producersExist }: { id: string, producersExist: boolean }) => {
                        console.log("callback called")
                        callback({ id })
                        if (producersExist) {
                            socket?.on('new-producer', ({ producerId }) => signalNewConsumerTransport(producerId))

                            socket?.on('producer-closed', ({ remoteProducerId }) => {
                                // server notification is received when a producer is closed
                                // we need to close the client-side consumer and associated transport
                                const producerToClose = consumerTransports.find(transportData => transportData.producerId === remoteProducerId)
                                producerToClose?.consumerTransport.close()
                                producerToClose?.consumer.close()

                                // remove the consumer transport from the list
                                let newConsumerTransports = consumerTransports.filter(transportData => transportData.producerId !== remoteProducerId)
                                setConsumerTransports(newConsumerTransports)

                                let itemToRemove = document.getElementById(`td-${remoteProducerId}`) as HTMLElement
                                document.getElementById("videoContainer")?.removeChild(itemToRemove)
                            })

                            socket.emit('getProducers', roomName, (producerIds: string[]) => {
                                console.log("get producers called")
                                producerIds.forEach(async (id) => {
                                    await signalNewConsumerTransport(id)
                                })
                            })
                        }
                        else { console.log("no producer") }
                    })
                } catch (error: any) {
                    errback(error)
                }
            })

            setProducerTransportState(producerTransport)
        })

        const signalNewConsumerTransport = async (remoteProducerId: string) => {
            if (consumingTransports.includes(remoteProducerId)) return;

            let newConsumerTransports = [...consumingTransports, remoteProducerId]
            setConsumingTransports(newConsumerTransports)

            socket?.emit('createWebRtcTransport', { consumer: true, roomName }, async ({
                id,
                iceParameters,
                iceCandidates,
                dtlsParameters,
                error
            }: {
                id: string,
                iceParameters: mediasoupTypes.IceParameters,
                iceCandidates: mediasoupTypes.IceCandidate[],
                dtlsParameters: mediasoupTypes.DtlsParameters,
                error: any
            }) => {
                if (error) {
                    console.log(error)
                    return
                }
                console.log(`PARAMS... ${params}`)
                let consumerTransport
                try {
                    consumerTransport = device.createRecvTransport({
                        id,
                        iceCandidates,
                        dtlsParameters,
                        iceParameters
                    })

                    consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                        try {
                            socket.emit('transport-recv-connect', {
                                dtlsParameters,
                                serverConsumerTransportId: id,
                            })

                            // Tell the transport that parameters were transmitted.
                            callback()
                        } catch (error: any) {
                            errback(error)
                        }
                    })

                    connectRecvTransport(consumerTransport, remoteProducerId, id);
                } catch (error) {
                    // exceptions: 
                    // {InvalidStateError} if not loaded
                    // {TypeError} if wrong arguments.
                    console.log(error)
                    return
                }
            })
        }

        const connectRecvTransport = async (consumerTransport: mediasoupTypes.Transport, remoteProducerId: string, serverConsumerTransportId: string) => {
            // for consumer, we need to tell the server first
            // to create a consumer based on the rtpCapabilities and consume
            // if the router can consume, it will send back a set of params as below
            socket?.emit('consume', {
                rtpCapabilities: device.rtpCapabilities,
                remoteProducerId,
                serverConsumerTransportId,
                roomName
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

                let newConsumerTransports = [
                    ...consumerTransports,
                    {
                        consumerTransport,
                        serverConsumerTransportId: params.id,
                        producerId: remoteProducerId,
                        consumer,
                    },
                ]

                setConsumerTransports(newConsumerTransports)

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
                let value = document.getElementById(remoteProducerId) as HTMLVideoElement
                // @ts-ignore
                value.srcObject = new MediaStream([track])

                // the server consumer started with media paused
                // so we need to inform the server to resume
                socket.emit('consumer-resume', { serverConsumerId: params.serverConsumerId })
            })
        }
    }












    useEffect(() => {
        if (!socket) {
            return;
        } else {
            socket.on("error-response", (data) => {
                console.log(data);
                socket.close()
                route("/dashboard")
                return
            });
            connectToSocket();
        }
    }, [socket])

    return (
        <>
            <div>
                <video ref={videoRef} autoPlay className="video" muted hidden={!videoConsume} />
                <Button onClick={() => { setAudioConsume((prev) => !prev) }}>
                    {
                        audioConsume ? "No audio" : "Start audio"
                    }
                </Button>

                <Button onClick={() => { setVideoConsume((prev) => !prev) }}>
                    {
                        videoConsume ? "No video" : "Start video"
                    }
                </Button>
            </div>
        </>
    )
}


export default Room
