// controllers/chat.controller.js — DwellGB assistant.
// Listing questions are answered from the database (never invented).
// General questions go to Gemini with DwellGB facts only.
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Listing } = require('../models');

const MAX_LENGTH = 500;
const SITE = process.env.FRONTEND_URL || 'http://localhost:5173';

const DISTRICTS = ['Gilgit', 'Hunza', 'Nagar', 'Ghizer', 'Gupis-Yasin', 'Skardu', 'Shigar', 'Kharmang', 'Ghanche', 'Roundu', 'Astore', 'Diamer', 'Darel', 'Tangir'];

// First matching rule wins.
const TYPE_RULES = [
  { re: /\bupper portion\b/i, types: ['upper_portion'] },
  { re: /\blower portion\b/i, types: ['lower_portion'] },
  { re: /\bportions?\b/i, types: ['upper_portion', 'lower_portion'] },
  { re: /\b(flat|flats|apartment|apartments)\b/i, types: ['apartment'] },
  { re: /\b(single room|kamra|kamre|room|rooms)\b/i, types: ['single_room'] },
  { re: /\b(house|houses|ghar|makan|makaan)\b/i, types: ['full_house'] },
];

const GREETING = /^\s*(hi|hello|hey|salam|salaam|assalam|asalam|aoa)\b/i;
const LISTING_TALK = /\b(list|listing|verify|verification|cnic|register|signup|sign up|login|payment|pay|advance)\b/i;
const SEARCH_WORDS = /\b(available|availability|house|ghar|makan|room|rooms|kamra|bed|bedroom|bedrooms|portion|flat|apartment|rent|rental|kiraya|find|search|dhoond|dhundo)\b/i;

const COPY = {
  en: {
    greeting: 'Assalam o Alaikum! How can I help you?',
    intro: 'Here are some available homes:',
    more: 'See all matching homes on the website:',
    none: 'I could not find a matching home right now. Try the Browse homes page on the DwellGB website with other filters.',
    fallback: 'Sorry, I cannot answer that right now. Please try again later.',
    error: 'Chatbot is currently unavailable.',
  },
  ur: {
    greeting: 'السلام علیکم! میں آپ کی کیسے مدد کر سکتا ہوں؟',
    intro: 'یہ کچھ دستیاب گھر ہیں:',
    more: 'ویب سائٹ پر تمام نتائج دیکھیں:',
    none: 'ابھی اس تلاش سے کوئی گھر نہیں ملا۔ DwellGB ویب سائٹ کے "گھر تلاش کریں" صفحے پر دوسرے فلٹر آزما کر دیکھیں۔',
    fallback: 'معذرت، ابھی اس کا جواب نہیں دے سکتا۔ تھوڑی دیر بعد دوبارہ کوشش کریں۔',
    error: 'چیٹ بوٹ اس وقت دستیاب نہیں ہے۔',
  },
};

const SYSTEM_PROMPT = `You are the support assistant for DwellGB, a long-term rental platform in Gilgit-Baltistan, Pakistan.
Reply in a friendly tone, in English or Roman Urdu, matching the user.
Answer only questions about DwellGB, renting, listing a property, verification, messages and bookings.
For anything else, politely say you can only help with DwellGB.
Never invent listings, prices or availability. If the user wants to find homes, tell them to use the Browse homes page on the website.
Facts:
- Rentals are long-term. Minimum stay is usually one month.
- Owners verify identity (CNIC and selfie) before their listings become public.
- DwellGB does not take payments. Tenants send requests and arrange everything directly with the owner.
- An owner's phone number and exact address are shared only after the owner accepts a request.
- To list a property, the owner signs up and uses "List your property".
Keep answers to two or three short sentences.`;

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' }) : null;

function toAmount(raw, kSuffix) {
  const n = Number(String(raw).replace(/,/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return kSuffix ? n * 1000 : n;
}

function parseFilters(text) {
  const f = {};

  const beds = text.match(/(\d+)\s*(bedrooms|bedroom|beds|bed|kamre|kamra)\b/i);
  if (beds) f.bedrooms = Number(beds[1]);

  const district = DISTRICTS.find((d) => new RegExp(`\\b${d}\\b`, 'i').test(text));
  if (district) f.district = district;

  const under = text.match(/(?:under|below|less than|upto|up to|max)\s*(?:rs\.?\s*)?([\d,]+)\s*(k)?/i)
    || text.match(/([\d,]+)\s*(k)?\s*(?:tak|se kam)\b/i);
  if (under) f.maxRent = toAmount(under[1], under[2]);

  const rule = TYPE_RULES.find((r) => r.re.test(text));
  if (rule) f.types = rule.types;

  return f;
}

function detectIntent(text) {
  if (GREETING.test(text) && text.split(/\s+/).length <= 3) return 'greeting';
  const f = parseFilters(text);
  const strong = Boolean(f.bedrooms || f.district || f.maxRent);
  if (LISTING_TALK.test(text) && !strong) return 'general';
  if (strong || f.types || SEARCH_WORDS.test(text)) return 'search';
  return 'general';
}

async function searchListings(f) {
  const query = { status: 'available', ownerApproved: true };
  if (f.bedrooms) query.bedrooms = { $gte: f.bedrooms };
  if (f.district) query.district = f.district;
  if (f.maxRent) query.rent = { $lte: f.maxRent };
  if (f.types) query.propertyType = { $in: f.types };
  return Listing.find(query)
    .sort({ createdAt: -1 })
    .limit(3)
    .select('title area district rent bedrooms propertyType')
    .lean();
}

function browseLink(f) {
  const p = new URLSearchParams();
  if (f.district) p.set('district', f.district);
  if (f.types && f.types.length === 1) p.set('propertyType', f.types[0]);
  const qs = p.toString();
  return `${SITE}/listings${qs ? `?${qs}` : ''}`;
}

function searchReply(items, f, lang) {
  const C = COPY[lang];
  if (!items.length) return `${C.none}`;
  const lines = items.map(
    (l, i) => `${i + 1}. ${l.title}, ${l.area}, ${l.district}: Rs ${Number(l.rent).toLocaleString('en-US')}/month, ${l.bedrooms} bedroom(s)`,
  );
  return `${C.intro}\n${lines.join('\n')}\n${C.more} ${browseLink(f)}`;
}

async function generalReply(message, lang) {
  if (!model) return COPY[lang].fallback;
  try {
    const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nUser: ${message}`);
    return result.response.text().trim() || COPY[lang].fallback;
  } catch (err) {
    console.error('Gemini error:', err.message);
    return COPY[lang].fallback;
  }
}

const cleanMessage = (value) => (typeof value === 'string' ? value.trim() : '');

const handleChat = async (req, res) => {
  try {
    const message = cleanMessage(req.body?.message);
    const lang = req.body?.lang === 'ur' ? 'ur' : 'en';
    const C = COPY[lang];

    if (!message) return res.status(400).json({ error: 'Please type a message.' });
    if (message.length > MAX_LENGTH) {
      return res.status(400).json({ error: `Please keep messages under ${MAX_LENGTH} characters.` });
    }

    const intent = detectIntent(message);

    if (intent === 'greeting') return res.json({ reply: C.greeting });

    if (intent === 'search') {
      const f = parseFilters(message);
      const items = await searchListings(f);
      return res.json({ reply: searchReply(items, f, lang) });
    }

    return res.json({ reply: await generalReply(message, lang) });
  } catch (err) {
    console.error('Chatbot error:', err);
    return res.status(500).json({ error: COPY.en.error });
  }
};

module.exports = { handleChat, parseFilters, detectIntent };