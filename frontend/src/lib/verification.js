// lib/verification.js — helpers for the owner identity photos.
export const DOCUMENT_KINDS = ['cnicFront', 'cnicBack', 'selfie'];

export const EMPTY_DOCUMENTS = { cnicFront: null, cnicBack: null, selfie: null };

/** Names of the photos that are still missing. */
export function missingDocuments(docs) {
  return DOCUMENT_KINDS.filter((kind) => !docs[kind]);
}

/** Adds the photos to a FormData object (field names match the backend). */
export function appendDocuments(formData, docs) {
  for (const kind of DOCUMENT_KINDS) if (docs[kind]) formData.append(kind, docs[kind]);
  return formData;
}

/** Owners must finish identity verification before using their dashboard. */
export function needsVerification(user) {
  return user?.role === 'owner' && ['not_submitted', 'rejected'].includes(user.verification?.status);
}
