// services/serialize.js — the ONLY place that decides what each audience can see.
const crypto = require('crypto');
const { formatPhone, maskCnic } = require('../utils');
const { isOnline } = require('./realtime');

const idOf = (v) => (v ? String(v._id || v.id || v) : null);

function publicUser(u) {
  if (!u) return null;
  return {
    id: idOf(u),
    name: u.name,
    avatar: u.avatar || null,
    role: u.role,
    place: u.place || '',
    bio: u.bio || '',
    ratingAvg: u.ratingAvg || 0,
    ratingCount: u.ratingCount || 0,
    isVerified: !!u.isVerified,
    memberSince: u.createdAt,
    online: isOnline(idOf(u)),
    lastSeenAt: u.lastSeenAt || null,
  };
}

/** The logged-in user's own profile. */
function selfUser(u) {
  return {
    id: idOf(u),
    name: u.name,
    fatherName: u.fatherName || '',
    email: u.email || null,
    emailVerified: !!u.emailVerified,
    phone: u.phone || null,
    phoneDisplay: formatPhone(u.phone),
    cnicMasked: u.cnic ? maskCnic(u.cnic) : null, // only if selected
    hasCnic: u.cnic !== undefined ? !!u.cnic : undefined,
    place: u.place || '',
    bio: u.bio || '',
    avatar: u.avatar || null,
    role: u.role,
    authProviders: u.authProviders || [],
    ratingAvg: u.ratingAvg || 0,
    ratingCount: u.ratingCount || 0,
    savedListings: (u.savedListings || []).map(idOf),
    isVerified: !!u.isVerified,
    verification: u.role === 'owner'
      ? {
          status: u.verification?.status || 'not_submitted',
          submittedAt: u.verification?.submittedAt || null,
          reviewedAt: u.verification?.reviewedAt || null,
          rejectionReason: u.verification?.rejectionReason || '',
        }
      : null,
    createdAt: u.createdAt,
  };
}

/**
 * Deterministic "fuzzing" of a location by ~150–350 m, so the public map shows
 * the neighbourhood but not the exact house (like Airbnb). Same listing → same offset.
 */
function approximate([lng, lat], seed) {
  const h = crypto.createHash('sha256').update(String(seed)).digest();
  const angle = (h.readUInt16BE(0) / 65535) * 2 * Math.PI;
  const dist = 10 // metres
  const dLat = (dist * Math.cos(angle)) / 111320;
  const dLng = (dist * Math.sin(angle)) / (111320 * Math.cos((lat * Math.PI) / 180));
  return { lat: +(lat + dLat).toFixed(5), lng: +(lng + dLng).toFixed(5) };
}

function listingLocation(l, exact) {
  const c = l.geo && l.geo.coordinates;
  if (!c || c.length !== 2) return null;
  return exact ? { lat: c[1], lng: c[0], exact: true } : { ...approximate(c, l._id), exact: false };
}

/** Compact version for cards, search results and the map. */
function listingCard(l, { savedIds } = {}) {
  const id = idOf(l);
  return {
    id,
    title: l.title,
    district: l.district,
    area: l.area,
    propertyType: l.propertyType,
    rent: l.rent,
    deposit: l.deposit || 0,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    furnishing: l.furnishing,
    tenantPreference: l.tenantPreference,
    heating: l.heating,
    cover: l.images?.[0]?.url || null,
    imageCount: l.images?.length || 0,
    location: listingLocation(l, false),
    status: l.status,
    ownerApproved: !!l.ownerApproved,
    ...(l.status === 'removed' ? { moderationReason: l.moderation?.reason || '' } : {}),
    isSaved: savedIds ? savedIds.has(id) : false,
    owner: l.owner && l.owner.name ? { id: idOf(l.owner), name: l.owner.name, avatar: l.owner.avatar || null, ratingAvg: l.owner.ratingAvg || 0, ratingCount: l.owner.ratingCount || 0, isVerified: !!l.owner.isVerified } : undefined,
    createdAt: l.createdAt,
  };
}

/** Full detail. `access` = { isOwner, isAcceptedTenant } decides private fields. */
function listingDetail(l, access = {}, extra = {}) {
  const privileged = access.isOwner || access.isAcceptedTenant;
  return {
    ...listingCard(l, extra),
    description: l.description,
    kitchens: l.kitchens,
    floorAreaSqft: l.floorAreaSqft || null,
    utilitiesIncluded: !!l.utilitiesIncluded,
    waterSupply: l.waterSupply,
    amenities: l.amenities || [],
    availableFrom: l.availableFrom || null,
    minStayMonths: l.minStayMonths || 6,
    images: (l.images || []).map((img) => ({ id: idOf(img), url: img.url, width: img.width, height: img.height })),
    views: l.views || 0,
    savesCount: l.savesCount || 0,
    updatedAt: l.updatedAt,
    location: listingLocation(l, privileged),
    address: privileged ? l.address || '' : undefined,
    owner: l.owner
      ? {
          ...publicUser(l.owner),
          ...(privileged
            ? { phone: l.owner.phone || null, phoneDisplay: formatPhone(l.owner.phone), fatherName: l.owner.fatherName || '', email: l.owner.email || null }
            : {}),
        }
      : null,
    canSeeContact: !!privileged,
    isOwner: !!access.isOwner,
  };
}

module.exports = { publicUser, selfUser, listingCard, listingDetail, idOf };
