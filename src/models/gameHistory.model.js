import mongoose, { Schema } from "mongoose";

const gameHistorySchema = new Schema(
    {
        userPlayer: {
            type: Schema.Types.ObjectId,
            ref: "User", // Reference to the User model
            required: true,
        },
        systemPlayer: {
            type: String, // E.g., 'System', 'Bot', or a specific AI team name
            required: true,
            default: "System",
        },
        winner: {
            type: String,
            enum: ["USER", "SYSTEM", "DRAW"],
            required: true,
        },
    },
    {
        timestamps: true, // Automatically manages createdAt (when the game was played) and updatedAt
    }
);

export const GameHistory = mongoose.model("GameHistory", gameHistorySchema);
