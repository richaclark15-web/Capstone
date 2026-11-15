const express = require("express");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/users/directory?q=searchterm
router.get("/directory", requireAuth, async (req, res, next) => {
    try {
        // NGOs browse volunteers, volunteers browse NGOs, admins see everyone
        let roleFilter;
        if (req.user.role === "ngo")            roleFilter = ["volunteer"];
        else if (req.user.role === "volunteer") roleFilter = ["ngo"];
        else                                    roleFilter = ["ngo", "volunteer"];

        const filter = { role: { $in: roleFilter }, active: true };

        if (req.query.q) {
            const rx = new RegExp(req.query.q.trim(), "i");
            filter.$or = [{ name: rx }, { orgName: rx }, { skills: rx }, { location: rx }];
        }

        const users = await User.find(filter).sort({ createdAt: -1 }).limit(100);
        res.json({ users: users.map(u => u.toSafeJSON()) });
    } catch (err) { next(err); }
});

// PATCH /api/users/me/password
router.patch("/me/password", requireAuth, async (req, res, next) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters" });
        }
        const user = await User.findById(req.user._id).select("+password");
        user.password = password;
        await user.save();
        res.json({ message: "Password updated" });
    } catch (err) { next(err); }
});

// DELETE /api/users/me — self-deletion
router.delete("/me", requireAuth, async (req, res, next) => {
    try {
        if (req.user.role === "admin") {
            const admins = await User.countDocuments({ role: "admin", active: true });
            if (admins <= 1) {
                return res.status(409).json({ message: "Cannot delete the last remaining admin" });
            }
        }
        await req.user.deleteOne();
        res.json({ message: "Account deleted" });
    } catch (err) { next(err); }
});

// GET /api/users/:id  (full profile incl. email for mailto)
router.get("/:id", requireAuth, async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || !user.active) return res.status(404).json({ message: "Profile not found" });
        if (req.user.role !== "admin" && user.role === req.user.role) {
            return res.status(403).json({ message: "Not visible to your account type" });
        }
        res.json({ user: user.toSafeJSON() });
    } catch (err) { next(err); }
});

// PATCH /api/users/me
router.patch("/me", requireAuth, async (req, res, next) => {
    try {
        const allowed = ["name", "orgName", "mission", "skills", "bio", "location", "website"];
        allowed.forEach(f => {
            if (req.body[f] !== undefined) req.user[f] = req.body[f];
        });
        await req.user.save();
        res.json({ user: req.user.toSafeJSON() });
    } catch (err) { next(err); }
});

module.exports = router;
