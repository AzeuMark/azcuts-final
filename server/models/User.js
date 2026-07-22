const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// users — customers, staff, and admin in one role-discriminated collection (3.1).
const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    nickname: { type: String, trim: true }, // staff title (from Settings.nicknames)
    username: {
      type: String,
      required: true,
      unique: true,
      sparse: true, // tolerates any legacy docs created before usernames existed
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    password: { type: String, required: true, select: false }, // never returned by default
    role: { type: String, enum: ['user', 'staff', 'admin'], default: 'user' },
    status: {
      type: String,
      enum: ['active', 'inactive', 'in_service'],
      default: 'active',
    },
    isApproved: { type: Boolean, default: true }, // reserved
    avatar: { type: String },
    // Preferred UI theme, persisted across devices. Unset until the user (or the
    // first authenticated sync) saves one.
    theme: { type: String, enum: ['light', 'dark'] },

    // Staff denormalized stats
    totalServed: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// email already has a unique index via the field option above.
userSchema.index({ role: 1, status: 1 });

// Hash the password whenever it is set/changed.
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare a plaintext candidate against the stored hash.
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Public-safe projection (drops password + internal fields).
userSchema.methods.toPublic = function toPublic() {
  const obj = this.toObject({ versionKey: false });
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
