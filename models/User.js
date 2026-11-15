const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
    role:    { type: String, enum: ["ngo", "volunteer", "admin"], required: true },
    name:    { type: String, required: true, trim: true },
    email:   { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password:{ type: String, required: true, minlength: 8, select: false },

    orgName: { type: String, trim: true },
    areas:   { type: [String], default: [] },
    bio:     { type: String, default: "", trim: true },

    hours:           { type: Number, min: 1, max: 60 },
    backgroundCheck: { type: Boolean, default: false },
    linkedin:        { type: String, trim: true },

    active:            { type: Boolean, default: true },
    passwordChangedAt: { type: Date }
}, { timestamps: true });

// Hash ONLY when the password actually changed.
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 12);
    if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
    next();
});

userSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

// Frontend expects `id` and `org`, never the hash.
userSchema.methods.toSafeJSON = function () {
    const o = this.toObject({ versionKey: false });
    delete o.password;
    o.id = String(o._id);
    delete o._id;
    o.org = o.orgName;
    o.createdAt = o.createdAt || this._id.getTimestamp();
    return o;
};

module.exports = mongoose.model("User", userSchema);