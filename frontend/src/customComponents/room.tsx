import { Button } from "@/components/ui/button"
import { params } from "@/constants/videoParams"
import { UserContext } from "@/context/UserContext"
import { useSocket } from "@/hooks/useSocket"
import { useContext, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { types as mediasoupTypes } from "mediasoup-client"
import * as mediasoup from "mediasoup-client"

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
                            socket.emit('getProducers', roomName, (producerIds: string[]) => {
                                console.log(producerIds)
                                //TODO: for each of them signal a consumer transport
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
