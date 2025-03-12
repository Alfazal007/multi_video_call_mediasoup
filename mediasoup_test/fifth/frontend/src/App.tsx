import './App.css'
import { useSocket } from './useSocket'

function App() {
    const [socket, socketId] = useSocket();
    return (
        <>
            <video id="localVideo" autoPlay={true} className="video" muted ></video>
            <div id="videoContainer"></div>
        </>
    )
}

export default App
