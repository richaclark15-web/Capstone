require("dotenv").config();
console.log("cwd:", process.cwd());
console.log("MONGO_URI:", JSON.stringify(process.env.MONGO_URI));
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

const app = express();
app.use(express.json());
app.use(cors());

app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/admin", require("./routes/admin"));

app.get("/api/health", (req, res) => res.json({ ok: true }));

// Serve the frontend
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
    app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
});
