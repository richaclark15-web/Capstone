const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");


const router = express.Router();

router.post("/login", async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: String(email || "").toLowerCase().trim() })
            .select("+password");
        if (!user) return res.status(401).json({ message: "Invalid email or password" });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ message: "Invalid email or password" });
        if (user.active === false) return res.status(403).json({ message: "Account disabled" });

        const token = jwt.sign({ sub: user._id }, process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES || "2h" });
        res.json({ token, user: user.toSafeJSON() });
    } catch (err) { next(err); }
});


const signToken = (user) =>
    jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES || "7d"
    });

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
    try {
        const b = req.body || {};
        const role = String(b.role || "").toLowerCase();

        const doc = {
            role,
            name: String(b.name || "").trim(),
            email: String(b.email || "").toLowerCase().trim(),
            password: b.password,
            bio: String(b.bio || "").trim()
        };

        if (role === "ngo") {
            doc.orgName = String(b.orgName ?? b.org ?? "").trim();
        }

        if (role === "volunteer") {
            // Accept an array, or a comma-separated string from a text input.
            doc.areas = Array.isArray(b.areas)
                ? b.areas.map(s => String(s).trim()).filter(Boolean)
                : String(b.areas || "").split(",").map(s => s.trim()).filter(Boolean);

            // "" must become undefined, not NaN.
            const h = Number(b.hours);
            if (Number.isFinite(h) && h > 0) doc.hours = h;

            // Accept the UI's name and the schema's name; handle checkbox strings.
            const bg = b.backgroundCheck ?? b.background;
            doc.backgroundCheck = bg === true || bg === "true" || bg === "on" || bg === 1 || bg === "1";

            doc.linkedin = String(b.linkedin || "").trim();
        }

        const user = await User.create(doc);
        const token = jwt.sign({ sub: user._id }, process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES || "2h" });
        res.status(201).json({ token, user: user.toSafeJSON() });
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ message: "Email already registered" });
        if (err.name === "ValidationError") {
            return res.status(400).json({ message: Object.values(err.errors).map(e => e.message).join(", ") });
        }
        next(err);
    }
});



// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
    res.json({ user: req.user.toSafeJSON() });
});

// POST /api/auth/forgot-password  → creates an admin ticket
router.post("/forgot-password", async (req, res, next) => {
    try {
        const email = (req.body.email || "").toLowerCase();
        const user = await User.findOne({ email });
        if (user) {
            const existing = await ResetRequest.findOne({ email, status: "pending" });
            if (!existing) await ResetRequest.create({ email, user: user._id });
        }
        // Same response either way — don't reveal which emails exist
        res.json({ message: "If that account exists, an administrator has been notified." });
    } catch (err) { next(err); }
});

// POST /api/auth/change-password
router.post("/change-password", requireAuth, async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ message: "New password must be at least 8 characters" });
        }
        const user = await User.findById(req.user._id).select("+password");
        if (!(await user.comparePassword(currentPassword || ""))) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        if (await user.comparePassword(newPassword)) {
            return res.status(400).json({ message: "New password must differ from the current one" });
        }

        user.password = newPassword;
        await user.save();
        res.json({ message: "Password updated" });
    } catch (err) { next(err); }
});

module.exports = router;


