const express = require("express");
const crypto = require("crypto");
const User = require("../models/User");
const ResetRequest = require("../models/ResetRequest");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

const countActiveAdmins = () => User.countDocuments({ role: "admin", active: true });

// GET /api/admin/users
router.get("/users", async (req, res, next) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.json({ users: users.map(u => u.toSafeJSON()) });
    } catch (err) { next(err); }
});

// PATCH /api/admin/users/:id/role
router.patch("/users/:id/role", async (req, res, next) => {
    try {
        const { role } = req.body;
        if (!["ngo", "volunteer", "admin"].includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (user.role === "admin" && role !== "admin" && (await countActiveAdmins()) <= 1) {
            return res.status(409).json({ message: "Cannot demote the last remaining admin" });
        }
        user.role = role;
        await user.save();
        res.json({ user: user.toSafeJSON() });
    } catch (err) { next(err); }
});

// PATCH /api/admin/users/:id/status
router.patch("/users/:id/status", async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const active = !!req.body.active;
        if (!active && user.role === "admin" && (await countActiveAdmins()) <= 1) {
            return res.status(409).json({ message: "Cannot deactivate the last remaining admin" });
        }
        user.active = active;
        await user.save();
        res.json({ user: user.toSafeJSON() });
    } catch (err) { next(err); }
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (user._id.equals(req.user._id)) {
            return res.status(409).json({ message: "You cannot delete your own account" });
        }
        if (user.role === "admin" && (await countActiveAdmins()) <= 1) {
            return res.status(409).json({ message: "Cannot delete the last remaining admin" });
        }
        await user.deleteOne();
        await ResetRequest.deleteMany({ user: user._id });
        res.json({ message: "User deleted", id: req.params.id });
    } catch (err) { next(err); }
});

// GET /api/admin/reset-requests
router.get("/reset-requests", async (req, res, next) => {
    try {
        const requests = await ResetRequest.find().sort({ createdAt: -1 }).populate("user", "name role");
        res.json({ requests });
    } catch (err) { next(err); }
});

// POST /api/admin/reset-requests/:id/resolve → issue a temporary password
router.post("/reset-requests/:id/resolve", async (req, res, next) => {
    try {
        const reqDoc = await ResetRequest.findById(req.params.id);
        if (!reqDoc) return res.status(404).json({ message: "Request not found" });

        const user = await User.findById(reqDoc.user).select("+password");
        if (!user) return res.status(404).json({ message: "Linked user no longer exists" });

        const tempPassword = crypto.randomBytes(6).toString("base64url") + "A1!";
        user.password = tempPassword;
        await user.save();

        reqDoc.status = "resolved";
        reqDoc.resolvedBy = req.user._id;
        reqDoc.resolvedAt = new Date();
        await reqDoc.save();

        // Returned once so the admin can send it via mailto
        res.json({ message: "Password reset", tempPassword, email: user.email });
    } catch (err) { next(err); }
});

// POST /api/admin/users — admin creates an account WITHOUT logging in as them
router.post("/users", async (req, res, next) => {
    try {
        const { name, email, password, role, orgName, mission, skills, bio, location, website } = req.body;
        if (!["ngo", "volunteer", "admin"].includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }
        if (!password || password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters" });
        }
        const user = await User.create({
            name, email, password, role, orgName, mission,
            skills: Array.isArray(skills) ? skills : [], bio, location, website
        });
        res.status(201).json({ user: user.toSafeJSON() });
    } catch (err) { next(err); }
});

// PATCH /api/admin/users/:id/password — admin force-sets a password
router.patch("/users/:id/password", async (req, res, next) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters" });
        }
        const user = await User.findById(req.params.id).select("+password");
        if (!user) return res.status(404).json({ message: "User not found" });
        user.password = password;
        await user.save();
        res.json({ message: "Password updated" });
    } catch (err) { next(err); }
});

module.exports = router;
