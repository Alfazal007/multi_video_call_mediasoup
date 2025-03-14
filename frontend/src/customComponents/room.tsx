import { UserContext } from "@/context/UserContext"
import { useSocket } from "@/hooks/useSocket"
import { useContext, useEffect } from "react"
import { useNavigate } from "react-router-dom"

const Room = () => {
    const { user } = useContext(UserContext)
    const route = useNavigate();
    let socket = useSocket()
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
    }, [socket])

    return (
        <>
            {
                JSON.stringify(socket?.id)
            }
            <div> Room</div>
        </>
    )
}

export default Room
