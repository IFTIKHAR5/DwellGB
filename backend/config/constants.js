// config/constants.js — domain vocabulary for Gilgit-Baltistan rentals.
// The frontend mirrors these values in src/lib/constants.js (labels live there).

// The 14 districts of Gilgit-Baltistan.
const DISTRICTS = [
  'Gilgit', 'Hunza', 'Nagar', 'Ghizer', 'Gupis-Yasin',
  'Skardu', 'Shigar', 'Kharmang', 'Ghanche', 'Roundu',
  'Astore', 'Diamer', 'Darel', 'Tangir',
];

// Long-term rentals only (monthly rent). No hotels, hostels or nightly stays.
const PROPERTY_TYPES = ['full_house', 'upper_portion', 'lower_portion', 'apartment', 'single_room'];

// Shortest lease an owner can offer, in months (monthly rent; no nightly stays).
const MIN_LEASE_MONTHS = 1;
const MAX_LEASE_MONTHS = 60;

const FURNISHING = ['unfurnished', 'semi_furnished', 'furnished'];

// Who the owner is willing to rent to — a very real filter in GB.
const TENANT_PREFERENCES = ['any', 'family', 'bachelors', 'students', 'working_women'];

const WATER_SUPPLY = ['24_7', 'few_hours', 'tanker', 'spring_channel', 'unspecified'];

// Winters are harsh — heating is one of the first things tenants ask about.
const HEATING = ['none', 'gas_heater', 'bukhari', 'electric', 'central'];

const AMENITIES = [
  'parking', 'boundary_wall', 'separate_entrance', 'solar_backup', 'ups_backup',
  'generator', 'internet', 'geyser', 'gas_cylinder', 'cctv', 'garden',
  'mountain_view', 'near_main_road', 'near_university', 'near_hospital', 'near_market',
];

// 'removed' is set only by an admin (moderation); owners cannot undo it.
const LISTING_STATUS = ['available', 'rented', 'hidden', 'removed'];
const OWNER_LISTING_STATUS = ['available', 'rented', 'hidden'];

const REPORT_TARGETS = ['listing', 'user'];
const REPORT_REASONS = ['scam', 'fake_listing', 'wrong_info', 'already_rented', 'inappropriate', 'harassment', 'spam', 'other'];
const REPORT_STATUS = ['open', 'resolved', 'dismissed'];

const BOOKING_STATUS = ['pending', 'accepted', 'rejected', 'cancelled'];

// Owner identity verification (CNIC front + back + selfie, reviewed by an admin).
const VERIFICATION_STATUS = ['not_submitted', 'pending', 'approved', 'rejected'];
const VERIFICATION_DOCS = ['cnicFront', 'cnicBack', 'selfie'];

const NOTIFICATION_TYPES = [
  'booking_request', 'booking_accepted', 'booking_rejected', 'booking_cancelled',
  'new_message', 'new_review', 'listing_saved', 'system',
];

// Rough bounding box of Gilgit-Baltistan [minLng, minLat, maxLng, maxLat].
const GB_BBOX = [72.4, 34.4, 77.9, 37.1];

module.exports = {
  DISTRICTS, PROPERTY_TYPES, MIN_LEASE_MONTHS, MAX_LEASE_MONTHS, FURNISHING, TENANT_PREFERENCES, WATER_SUPPLY, HEATING,
  AMENITIES, LISTING_STATUS, OWNER_LISTING_STATUS, BOOKING_STATUS, NOTIFICATION_TYPES, GB_BBOX,
  REPORT_TARGETS, REPORT_REASONS, REPORT_STATUS, VERIFICATION_STATUS, VERIFICATION_DOCS,
};
