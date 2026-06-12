import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
    {
        firebaseUid: {
            type: String,
            required: true,
            unique: true,
            index: true, // Indexed for fast lookups during authentication
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        avatar: {
            type: String, // Google Profile Picture URL
        },
        role: {
            type: String,
            enum: ["USER", "ADMIN"],
            default: "USER"
        },
        current_xp: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true, // Automatically manages createdAt and updatedAt
    }
);

export const User = mongoose.model("User", userSchema);
