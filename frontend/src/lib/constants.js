// lib/constants.js — mirrors backend/config/constants.js. Labels come from i18n
// (keys like "district.Gilgit", "type.full_house", "amenity.parking").
import {
  Car, Fence, DoorOpen, Sun, BatteryCharging, Zap, Wifi, ShowerHead, Flame, Cctv,
  Trees, Mountain, Route, GraduationCap, Hospital, ShoppingBasket,
} from '@/components/icons';

export const DISTRICTS = [
  'Gilgit', 'Hunza', 'Nagar', 'Ghizer', 'Gupis-Yasin',
  'Skardu', 'Shigar', 'Kharmang', 'Ghanche', 'Roundu',
  'Astore', 'Diamer', 'Darel', 'Tangir',
];

// Approximate centres, used to fly the map to a district.
export const DISTRICT_CENTERS = {
  Gilgit: [74.3144, 35.9208], Hunza: [74.6600, 36.3167], Nagar: [74.6500, 36.2600], Ghizer: [73.7700, 36.1700],
  'Gupis-Yasin': [73.4000, 36.2300], Skardu: [75.6333, 35.2971], Shigar: [75.7413, 35.4236], Kharmang: [76.0833, 34.9500],
  Ghanche: [76.3300, 35.1600], Roundu: [75.2500, 35.4500], Astore: [74.8560, 35.3670], Diamer: [74.1000, 35.4200],
  Darel: [73.4500, 35.6300], Tangir: [73.3000, 35.6800],
};

export const POPULAR_AREAS = [
  { area: 'Jutial', district: 'Gilgit' }, { area: 'Danyore', district: 'Gilgit' }, { area: 'Konodas', district: 'Gilgit' },
  { area: 'Karimabad', district: 'Hunza' }, { area: 'Aliabad', district: 'Hunza' }, { area: 'Skardu', district: 'Skardu' },
  { area: 'Gahkuch', district: 'Ghizer' }, { area: 'Khaplu', district: 'Ghanche' },
];

// Long-term (monthly) rentals only.
export const PROPERTY_TYPES = ['full_house', 'upper_portion', 'lower_portion', 'apartment', 'single_room'];

// Minimum lease lengths an owner can choose, in months.
export const LEASE_OPTIONS = [1, 3, 6, 12, 24];
export const FURNISHING = ['unfurnished', 'semi_furnished', 'furnished'];
export const TENANT_PREFERENCES = ['any', 'family', 'bachelors', 'students', 'working_women'];
export const WATER_SUPPLY = ['24_7', 'few_hours', 'tanker', 'spring_channel', 'unspecified'];
export const HEATING = ['none', 'gas_heater', 'bukhari', 'electric', 'central'];

export const AMENITIES = [
  { key: 'parking', icon: Car },
  { key: 'boundary_wall', icon: Fence },
  { key: 'separate_entrance', icon: DoorOpen },
  { key: 'solar_backup', icon: Sun },
  { key: 'ups_backup', icon: BatteryCharging },
  { key: 'generator', icon: Zap },
  { key: 'internet', icon: Wifi },
  { key: 'geyser', icon: ShowerHead },
  { key: 'gas_cylinder', icon: Flame },
  { key: 'cctv', icon: Cctv },
  { key: 'garden', icon: Trees },
  { key: 'mountain_view', icon: Mountain },
  { key: 'near_main_road', icon: Route },
  { key: 'near_university', icon: GraduationCap },
  { key: 'near_hospital', icon: Hospital },
  { key: 'near_market', icon: ShoppingBasket },
];
export const AMENITY_ICON = Object.fromEntries(AMENITIES.map((a) => [a.key, a.icon]));

export const SORTS = ['newest', 'price_asc', 'price_desc', 'popular'];

export const PRICE_PRESETS = [
  { min: '', max: 15000 }, { min: 15000, max: 30000 }, { min: 30000, max: 60000 }, { min: 60000, max: '' },
];
