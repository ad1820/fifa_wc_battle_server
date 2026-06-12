import "dotenv/config";
import { connectDB } from "./config/db.js"
import { app } from "./app.js"
import "./config/firebase.js"
import "./config/redis.js"

import { loadPlayerStore } from "./services/playerStore.service.js"
import { initializeAI } from "./services/commentary.service.js"

const startServer = async () =>{
    try {
        await connectDB()
        loadPlayerStore() // Load JSON files into memory arrays
        initializeAI() // Spin up the LangChain Agent
        app.listen(process.env.PORT || 8000, () =>
            console.log(`✅Server started at port: ${process.env.PORT}`)
        )
    } catch (err) {
        console.error("❌MONGODB connection failed:", err)
    }
}

startServer()