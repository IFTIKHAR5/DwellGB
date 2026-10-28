// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { toJSONPlugin } = require('./plugins');
const { VERIFICATION_STATUS } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    fatherName: { type: String, trim: true, maxlength: 80, default: '' },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    emailVerified: { type: Boolean, default: false },
    // Canonical "923XXXXXXXXX" form (see utils.normalizePhone)
    phone: { type: String, trim: true },
    // 13 digits, never returned to other users. Stored for accountability only —
    // it is NOT government (NADRA) verified.
    cnic: { type: String, select: false },
    place: { type: String, trim: true, maxlength: 120, default: '' },
    bio: { type: String, trim: true, maxlength: 500, default: '' },
    avatar: { type: String, default: null }, // public URL path, e.g. /uploads/avatars/abc.webp
    role: { type: String, enum: ['owner', 'tenant', 'admin'], required: true },

    passwordHash: { type: String, select: false },
    googleId: { type: String, select: false },
    authProviders: { type: [{ type: String, enum: ['password', 'google'] }], default: [] },

    savedListings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }],

    // Expo push tokens of the user's phones (mobile app notifications).
    pushTokens: { type: [String], default: [], select: false },

    // Denormalised owner rating (updated whenever a review is written).
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    isVerified: { type: Boolean, default: false }, // true once an admin approves the identity documents

    // Owners upload CNIC front, CNIC back and a selfie. Files are stored PRIVATELY
    // (backend/private, never public) and only admins can view them.
    verification: {
      status: { type: String, enum: VERIFICATION_STATUS, default: 'not_submitted' },
      cnicFront: { type: String, select: false },
      cnicBack: { type: String, select: false },
      selfie: { type: String, select: false },
      submittedAt: { type: Date },
      reviewedAt: { type: Date },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      rejectionReason: { type: String, maxlength: 500 },
    },
    isActive: { type: Boolean, default: true },
    banReason: { type: String, maxlength: 500 },
    bannedAt: { type: Date },
    lastSeenAt: { type: Date },
  },
  { timestamps: true },
);

// Uniqueness is enforced by the database, not just by a find() before insert
// (the old code had a race condition there).
userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string' } } });
userSchema.index({ cnic: 1 }, { unique: true, partialFilterExpression: { cnic: { $type: 'string' } } });
userSchema.index({ googleId: 1 }, { unique: true, partialFilterExpression: { googleId: { $type: 'string' } } });

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
  if (!this.authProviders.includes('password')) this.authProviders.push('password');
};

userSchema.methods.checkPassword = async function checkPassword(plain) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.plugin(toJSONPlugin);

// Remove secrets even if they were explicitly selected.
userSchema.set('toJSON', {
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    delete ret.googleId;
    delete ret.cnic;
    if (ret.verification) {
      delete ret.verification.cnicFront;
      delete ret.verification.cnicBack;
      delete ret.verification.selfie;
    }
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
