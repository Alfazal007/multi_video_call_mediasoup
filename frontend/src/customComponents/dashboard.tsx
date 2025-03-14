import { useState, useEffect, useContext } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { VideoIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { UserContext } from "@/context/UserContext"

export default function Dashbaord() {
    const [roomName, setRoomName] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const router = useNavigate()
    const { user } = useContext(UserContext)

    useEffect(() => {
        if (!user) {
            router("/signin")
            return
        }
    }, [])

    const handleCreateRoom = () => {
        router(`/room/${roomName}`);
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="flex flex-col items-center mb-8">
                <div className="flex items-center justify-center mb-4">
                    <VideoIcon className="h-10 w-10 text-primary mr-2" />
                    <h1 className="text-3xl font-bold">Video Call App</h1>
                </div>
                <p className="text-muted-foreground text-center max-w-md mb-8">
                    Create or join a room to start your video call with friends, family, or colleagues
                </p>

                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Create a New Room</CardTitle>
                        <CardDescription>Enter a name for your room and click create</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateRoom} className="flex space-x-2">
                            <Input
                                placeholder="Enter room name"
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                className="flex-1"
                            />
                            <Button type="submit" disabled={isLoading || !roomName.trim()}>
                                {isLoading ? "Creating..." : "Create Room"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

