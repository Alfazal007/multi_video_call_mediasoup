import { Button } from "@/components/ui/button"
import { params } from "@/constants/videoParams"
import { UserContext } from "@/context/UserContext"
import { useSocket } from "@/hooks/useSocket"
import { useContext, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

const Room = () => {
    const { roomName } = useParams();
    const { user } = useContext(UserContext)
    const route = useNavigate()
    let socket = useSocket()
    const [audioConsume, setAudioConsume] = useState(true);
    const [videoConsume, setVideoConsume] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);

    let audioParams: any;
    let videoParams: any = { params };

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
        audioParams = { track: stream.getAudioTracks()[0], ...audioParams };
        videoParams = { track: stream.getVideoTracks()[0], ...videoParams };
        joinRoom()
    }

    const joinRoom = () => {
/*        socket?.emit('joinRoom', { roomName }, (data) => {
            console.log(`Router RTP Capabilities... ${data.rtpCapabilities}`)
            rtpCapabilities = data.rtpCapabilities

            // once we have rtpCapabilities from the Router, create Device
            createDevice()
        })
 */   }

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
