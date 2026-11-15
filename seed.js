// require("dotenv").config();
// const mongoose = require("mongoose");
// const connectDB = require("./config/db");
// const User = require("./models/User");
// const ResetRequest = require("./models/ResetRequest");
//
// (async () => {
//     await connectDB();
//     await User.deleteMany({});
//     await ResetRequest.deleteMany({});
//
//     await User.create([
//         { name: "Site Administrator", email: "admin@guardianlink.org", password: "Admin123!", role: "admin" },
//         { name: "Tom Mitchell", email: "tom@harvesttable.org", password: "Password1!", role: "ngo",
//             orgName: "Harvest Table", mission: "Redistributing surplus food across the region.",
//             location: "Niagara Falls, ON", website: "https://harvesttable.org" },
//         { name: "Amara Osei", email: "amara.sec@example.com", password: "Password1!", role: "volunteer",
//             skills: ["Penetration Testing", "Incident Response", "Security Awareness Training"],
//             bio: "Eight years in offensive security, volunteering evenings.",
//             location: "Toronto, ON" }
//     ]);
//
//     console.log("Seeded 3 demo accounts");
//     await mongoose.disconnect();
// })();
