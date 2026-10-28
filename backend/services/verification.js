// services/verification.js — owner identity verification (CNIC front, CNIC back, selfie).
//
// Flow:  owner uploads 3 photos  →  status "pending"  →  admin approves or rejects
//        approved  → badge on profile + their listings become public
//        rejected  → owner sees the reason and uploads new photos
const { User, Listing } = require('../models');
const { VERIFICATION_DOCS } = require('../config/constants');
const { processDocument, saveDocument, removeDocument } = require('./storage');
const { notify } = require('./notify');
const { AppError } = require('../utils');

const LABELS = { cnicFront: 'CNIC front', cnicBack: 'CNIC back', selfie: 'selfie' };

/**
 * Checks and converts the three uploaded files (from multer `upload.fields`).
 * Runs BEFORE anything is saved, so a bad photo never leaves half an account behind.
 */
async function prepareDocuments(files = {}) {
  const missing = VERIFICATION_DOCS.filter((kind) => !files[kind]?.[0]);
  if (missing.length) {
    const names = missing.map((k) => LABELS[k]).join(', ');
    throw new AppError(400, `Please add your ${names} photo${missing.length > 1 ? 's' : ''}.`, 'DOCUMENTS_REQUIRED', missing.map((field) => ({ field, message: `${LABELS[field]} photo is required.` })));
  }
  const prepared = {};
  for (const kind of VERIFICATION_DOCS) {
    prepared[kind] = await processDocument(files[kind][0].buffer);
  }
  return prepared;
}

/** Saves prepared documents for a user, replaces any old ones and marks the request pending. */
async function storeDocuments(userId, prepared) {
  const user = await User.findById(userId).select('+verification.cnicFront +verification.cnicBack +verification.selfie');
  const old = VERIFICATION_DOCS.map((kind) => user.verification?.[kind]).filter(Boolean);

  for (const kind of VERIFICATION_DOCS) {
    user.verification[kind] = await saveDocument(prepared[kind], user._id, kind);
  }
  user.verification.status = 'pending';
  user.verification.submittedAt = new Date();
  user.verification.rejectionReason = undefined;
  user.verification.reviewedAt = undefined;
  user.verification.reviewedBy = undefined;
  await user.save();
  await Promise.all(old.map(removeDocument));

  // Tell every admin there is something to review.
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  for (const admin of admins) {
    await notify(admin._id, {
      type: 'system',
      title: 'New owner to verify',
      body: `${user.name} uploaded their CNIC and selfie.`,
      link: '/admin/verifications',
      groupKey: 'admin:verifications',
    });
  }
  return user;
}

/** Admin decision. `approve` true/false; `reason` is required when rejecting. */
async function reviewVerification(adminId, userId, approve, reason) {
  const user = await User.findById(userId).select('+verification.cnicFront +verification.cnicBack +verification.selfie');
  if (!user) throw new AppError(404, 'User not found.', 'NOT_FOUND');
  if (user.role !== 'owner') throw new AppError(400, 'Only owners need identity verification.', 'NOT_OWNER');
  // An owner can only be approved after uploading all three photos.
  const hasAllDocs = VERIFICATION_DOCS.every((kind) => user.verification?.[kind]);
  if (approve && (user.verification?.status === 'not_submitted' || !hasAllDocs)) {
    throw new AppError(409, 'This owner has not uploaded their CNIC and selfie yet.', 'NO_DOCUMENTS');
  }

  user.verification.status = approve ? 'approved' : 'rejected';
  user.verification.reviewedAt = new Date();
  user.verification.reviewedBy = adminId;
  user.verification.rejectionReason = approve ? undefined : reason;
  user.isVerified = approve;
  await user.save();

  // Listings follow the owner's verification.
  await Listing.updateMany({ owner: user._id }, { ownerApproved: approve });

  await notify(user._id, approve
    ? {
        type: 'system',
        title: 'Your identity is verified',
        body: 'Your listings are now public and a verified badge shows on your profile.',
        link: '/dashboard/listings',
      }
    : {
        type: 'system',
        title: 'Please upload your documents again',
        body: `Your identity check was not approved: ${reason}`,
        link: '/verify-identity',
      });
  return user;
}

module.exports = { prepareDocuments, storeDocuments, reviewVerification };
