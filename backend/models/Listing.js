// models/Listing.js
const mongoose = require('mongoose');
const { toJSONPlugin } = require('./plugins');
const C = require('../config/constants');

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    width: Number,
    height: Number,
  },
  { _id: true },
);

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: {
      type: [Number],
      required: true,
      validate: [(v) => v.length === 2 && Math.abs(v[0]) <= 180 && Math.abs(v[1]) <= 90, 'Invalid coordinates'],
    },
  },
  { _id: false },
);

const listingSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 3000, default: '' },

    district: { type: String, enum: C.DISTRICTS, required: true },
    area: { type: String, required: true, trim: true, maxlength: 80 }, // e.g. "Jutial", "Karimabad"
    address: { type: String, trim: true, maxlength: 200, default: '' }, // shown only to accepted tenants

    // GeoJSON point [lng, lat]. Exact point is private; the public API returns an approximate one.
    geo: { type: pointSchema, default: undefined },

    propertyType: { type: String, enum: C.PROPERTY_TYPES, required: true },
    rent: { type: Number, required: true, min: 500, max: 5_000_000 },
    deposit: { type: Number, min: 0, max: 50_000_000, default: 0 }, // "pakri"
    utilitiesIncluded: { type: Boolean, default: false },

    bedrooms: { type: Number, min: 0, max: 30, default: 1 },
    bathrooms: { type: Number, min: 0, max: 30, default: 1 },
    kitchens: { type: Number, min: 0, max: 10, default: 1 },
    floorAreaSqft: { type: Number, min: 0, max: 100000 },

    furnishing: { type: String, enum: C.FURNISHING, default: 'unfurnished' },
    tenantPreference: { type: String, enum: C.TENANT_PREFERENCES, default: 'any' },
    waterSupply: { type: String, enum: C.WATER_SUPPLY, default: 'unspecified' },
    heating: { type: String, enum: C.HEATING, default: 'none' },
    amenities: [{ type: String, enum: C.AMENITIES }],

    availableFrom: { type: Date },
    // Minimum lease length in months — DwellGB is for monthly rentals (no nightly stays).
    minStayMonths: { type: Number, min: C.MIN_LEASE_MONTHS, max: C.MAX_LEASE_MONTHS, default: 6 },

    images: { type: [imageSchema], validate: [(v) => v.length <= 10, 'At most 10 photos'] },

    status: { type: String, enum: C.LISTING_STATUS, default: 'available', index: true },
    // Listings are only public once an admin has approved the owner's identity documents.
    ownerApproved: { type: Boolean, default: false, index: true },
    // Filled when an admin removes the listing.
    moderation: {
      reason: { type: String, maxlength: 500 },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      at: { type: Date },
    },
    views: { type: Number, default: 0 },
    savesCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

listingSchema.index({ geo: '2dsphere' });
listingSchema.index({ status: 1, district: 1, rent: 1 });
listingSchema.index({ status: 1, createdAt: -1 });
listingSchema.index(
  { title: 'text', area: 'text', description: 'text' },
  { weights: { title: 5, area: 4, description: 1 }, name: 'listing_text' },
);

listingSchema.plugin(toJSONPlugin);

module.exports = mongoose.model('Listing', listingSchema);
