import { UserContext } from "@/context/UserContext"
import { useContext, useEffect } from "react"
import { useNavigate } from "react-router-dom"

const Room = () => {
    const { user } = useContext(UserContext)
    const router = useNavigate()
    useEffect(() => {
        if (!user) {
            router("/signin")
            return
        }
    }, [])

    return (
        <div>Room</div>
    )
}

export default Room
