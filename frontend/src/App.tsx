import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './App.css'
import SignUpPage from './customComponents/signup'
import SignInPage from './customComponents/signin'
import Dashbaord from './customComponents/dashboard'
import UserProvider from './context/UserContext'
import Room from './customComponents/room'

export interface User {
    accessToken: string;
    id: string;
}

function App() {
    const router = createBrowserRouter([
        {
            path: "/signup",
            element: <SignUpPage />,
        },
        {
            path: "/signin",
            element: <SignInPage />,
        },
        {
            path: "/dashboard",
            element: <Dashbaord />,
        },
        {
            path: "/",
            element: <Dashbaord />,
        },
        {
            path: "/room/:roomName",
            element: <Room />,
        }
    ]);
    return (
        <>
            <div>
                <UserProvider>
                    <RouterProvider router={router} />
                </UserProvider>
            </div>
        </>
    )
}

export default App
