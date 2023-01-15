import React, { useState, useEffect } from 'react'
import { Router, navigate } from "@reach/router"

import Navigation from "./components/Navigation"
import Login from "./components/Login"
import Content from "./components/Content"
import Protected from "./components/Protected"
import Register from "./components/Register"

export const UserContext = React.createContext([]);

const App = () => {
    const [user, setUser] = useState({})
    const [loading, setLoading] = useState(true)

    const logOutCallBack = async () => {
        await fetch("http://localhost:4000/logout", {
            method: "POST",
            credentials: "include",
        })
        // clear from context
        setUser({})
        navigate("/")
    }

    // get a new access token if refresh token exists
    useEffect(() => {
        async function checkRefreshToken() {
            const result = await (await fetch("http://localhost:4000/refresh_token", {
                method: "POST",
                credentials: "include", // needed to include cookie
                headers: {
                    "Content-Type": "application/json"
                }
            })).json()
            setUser({
                accesstoken: result.accesstoken
            })
            setLoading(false)
        }
        checkRefreshToken()
    }, [])

    if (loading) return <div>Loading...</div>

    return (
        <UserContext.Provider value={[user, setUser]}>
            <div className='app'>
                <Navigation logOutCallBack={logOutCallBack} />
                <Router id='router'>
                    <Login path="login" />
                    <Register path="register" />
                    <Protected path="protected" />
                    <Content path="/" />
                </Router>
            </div>
        </UserContext.Provider>
    )
}

export default App