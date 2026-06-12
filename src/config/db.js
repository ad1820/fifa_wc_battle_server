import mongoose from "mongoose"
import { DB_NAME } from "../constants.js"

const connectDB = async () => {
    const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
    console.log(`MONGODB connected successfully, DB host: ${connectionInstance.connection.host}`)
}

export { connectDB }