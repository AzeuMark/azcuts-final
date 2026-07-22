const mongoose = require('mongoose');

// refreshtokens — stored (hashed) refresh tokens for rotation/revocation (3.6).
const refreshTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true }, // sha256 hash of the JWT
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// TTL index: MongoDB auto-deletes the document once expiresAt passes.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ user: 1 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
