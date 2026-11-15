require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("DB:", mongoose.connection.name);

    const email = process.argv[2] || "amara.sec@example.com";
    const plain = process.argv[3] || "Password1!";

    const u = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!u) {
        console.log("NO USER FOUND for", email);
        const all = await User.find().select("email role");
        console.log("Emails in DB:", all.map(x => x.email));
        return process.exit(0);
    }

    console.log("email stored as:", JSON.stringify(u.email));
    console.log("hash:", u.password);
    console.log("hash length:", u.password ? u.password.length : "undefined");
    console.log("looks like bcrypt:", /^\$2[aby]\$\d{2}\$/.test(u.password || ""));
    console.log("bcrypt.compare result:", await bcrypt.compare(plain, u.password || ""));
    process.exit(0);
})();
