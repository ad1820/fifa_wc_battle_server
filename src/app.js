import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"

const app = express()

app.use(express.json({ limit: "16kb" }))
app.use(cors())
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(cookieParser())


// Routes
import matchRouter from './routes/match.routes.js';
import authRouter from './routes/auth.routes.js';
import userRouter from './routes/user.routes.js';
import leaderboardRouter from './routes/leaderboard.routes.js';
import historyRouter from './routes/history.routes.js';
import playersRouter from './routes/players.routes.js';

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/match", matchRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/history", historyRouter);
app.use("/api/players", playersRouter);

// app.use("/api/blogs", blogRouter)

export { app }