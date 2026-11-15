const mongoose = require("mongoose");

const resetRequestSchema = new mongoose.Schema({
    email:      { type: String, required: true, lowercase: true, trim: true },
    user:       { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status:     { type: String, enum: ["pending", "resolved"], default: "pending" },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model("ResetRequest", resetRequestSchema);