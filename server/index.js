require("dotenv/config")
const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const { verify } = require("jsonwebtoken")
const { hash, compare } = require("bcryptjs")
const { createAccessToken, createRefreshToken, sendAccessToken, sendRefreshToken } = require("./tokens.js")
const { fakeDB } = require("./fakeDB.js")
const { isAuth } = require("./isAuth.js")


//1. Register a User
//2. Login a User
//3. LogOut a User
//4. Setup a Protected route
//5. Get a new accesstoken with a refresh token

const server = express()
// use Express middleware for easier for cookie handling
server.use(cookieParser())
server.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}))


// needed to be able to read body data
server.use(express.json())
// to support use encoded bodies
server.use(express.urlencoded({
    extended: true
}))

//1.Register a User
server.post("/register", async (req, res) => {
    const { email, password } = req.body;
    try {
        // check if user exists
        const user = fakeDB.find(user => user.email === email)
        if (user) throw new Error("User alreay exists")
        // if not user exists
        const hashedPassword = await hash(password, 10)
        // insert a user
        fakeDB.push({
            id: fakeDB.length,
            email,
            password: hashedPassword
        })

        res.send({
            meessage: "User Created"
        })
        console.log(fakeDB)
    } catch (error) {
        res.send({
            error: `${error.message}`
        })
    }
})

//2.  Login a User
server.post("/login", async (req, res) => {
    const { email, password } = req.body
    try {
        // 1. Find user in database 
        const user = fakeDB.find(user => user.email === email)
        if (!user) {
            throw new Error("User not exists with this email")
        }
        // compare with password
        const valid = await compare(password, user.password)
        if (!valid) {
            throw new Error("Password not correct")
        }
        // create refresh & access token
        const accessToken = createAccessToken(user.id);
        const refreshToken = createRefreshToken(user.id);
        // put refresh token in database
        user.refreshToken = refreshToken
        console.log(fakeDB)
        // send token. refresh token as a cookie and accesstoken as response
        sendRefreshToken(res, refreshToken)
        sendAccessToken(res, req, accessToken)
    } catch (error) {
        res.send({
            message: `${error.message}`
        })
    }
})

// 3. LogOut a User
server.post('/logout', (req, res) => {
    res.clearCookie("refreshtoken", {
        path: "/refresh_token"
    })
    return res.send({
        message: "Logged Out Successfully"
    })
})

// 4. Protected Route
server.post("/protected", async (req, res) => {
    try {
        const userId = isAuth(req)
        if (userId !== null) {
            res.send({
                data: "This is Protected Data"
            })
        }
    } catch (error) {
        res.send({
            message: `${error.message}`
        })
    }
})

//5. Get a new access token with a refresh token
server.post("/refresh_token", (req, res) => {
    const token = req.cookies.refreshtoken;
    // If we don't have a token in our request
    console.log(token)
    if (!token) return res.send({ accesstoken: '' });
    // We have a token, let's verify it!
    let payload = null;
    try {
        payload = verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
        return res.send({ accesstoken: '' });
    }
    // token is valid, check if user exist
    const user = fakeDB.find(user => user.id === payload.userId);
    console.log(user)
    if (!user) return res.send({ accesstoken: '' });
    // user exist, check if refreshtoken exist on user
    // if (user.refreshtoken !== token)
    //     return res.send({ accesstoken: '' });
    // token exist, create new Refresh- and accesstoken
    const accesstoken = createAccessToken(user.id);
    const refreshtoken = createRefreshToken(user.id);
    // update refreshtoken on user in db
    // Could have different versions instead!
    user.refreshtoken = refreshtoken;
    // All good to go, send new refreshtoken and accesstoken
    sendRefreshToken(res, refreshtoken);
    return res.send({ accesstoken });
})





server.listen(process.env.PORT, () => {
    console.log(`Server Listening on PORT : ${process.env.PORT}`)
})