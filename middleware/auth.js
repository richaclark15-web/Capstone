const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function requireAuth(req, res, next) {
    try {
        const hdr = req.headers.authorization || "";
        const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
        if (!token) return res.status(401).json({ message: "Not authenticated" });

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({ message: "Session expired" });
        }

        const user = await User.findById(payload.sub);
        if (!user) return res.status(401).json({ message: "Not authenticated" });
        if (user.active === false) return res.status(403).json({ message: "Account disabled" });

        // Reject tokens issued before the last password change.
        if (user.passwordChangedAt) {
            const changedAt = Math.floor(user.passwordChangedAt.getTime() / 1000);
            if (payload.iat < changedAt) {
                return res.status(401).json({ message: "Password changed — please sign in again" });
            }
        }

        req.user = user;
        next();
    } catch (err) {
        next(err);
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ message: "Not authenticated" });
        if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
        next();
    };
}

module.exports = { requireAuth, requireRole };
