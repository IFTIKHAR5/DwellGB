// tests/api.test.js — end-to-end API tests against an in-memory MongoDB.
// Run with:  npm test
// (first run downloads a MongoDB binary for mongodb-memory-server, ~70 MB)
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;
let app;
let request;
let mongoose;

// Tiny valid 1×1 PNG for upload tests.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

before(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = mongo.getUri();
  process.env.JWT_SECRET = 'test-secret-0123456789abcdef0123456789';
  process.env.CLIENT_URLS = 'http://localhost:5173';

  mongoose = require('mongoose');
  request = require('supertest');
  const { connectDB } = require('../db');
  const { ensureDirs } = require('../services/storage');
  await ensureDirs();
  await connectDB(process.env.MONGODB_URI);
  await Promise.all(Object.values(require('../models')).map((m) => m.init()));
  app = require('../app');
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

// An "agent" is like a browser: it keeps the login cookie between requests.
async function register(body) {
  const agent = request.agent(app);
  let req = agent.post('/api/auth/register');
  if (body.role === 'owner') {
    body = { place: 'Jutial, Gilgit', ...body };
    // Owners sign up with a multipart form: fields + CNIC front, CNIC back and selfie.
    for (const [k, v] of Object.entries(body)) req = req.field(k, v);
    for (const kind of ['cnicFront', 'cnicBack', 'selfie']) req = req.attach(kind, PNG, { filename: `${kind}.png`, contentType: 'image/png' });
  } else {
    req = req.send(body);
  }
  const res = await req;
  return { agent, res, user: res.body.user };
}

async function login(identifier, password) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ identifier, password });
  return { agent, res, user: res.body.user };
}

/** Simulates an admin approving the owner's identity documents. */
async function approveOwner(userId) {
  const { User, Listing } = require('../models');
  await User.updateOne({ _id: userId }, { 'verification.status': 'approved', isVerified: true });
  await Listing.updateMany({ owner: userId }, { ownerApproved: true });
}

describe('auth', () => {
  test('registers an owner (CNIC required) and normalises phone', async () => {
    const noCnic = await request(app).post('/api/auth/register').send({ name: 'Ali', phone: '03001234567', password: 'Passw0rd', role: 'owner' });
    assert.equal(noCnic.status, 400);

    const noPhotos = await request(app).post('/api/auth/register').send({ name: 'Ali', phone: '03009999999', cnic: '71501-0000000-1', place: 'Gilgit', password: 'Passw0rd', role: 'owner' });
    assert.equal(noPhotos.status, 400);
    assert.equal(noPhotos.body.code, 'DOCUMENTS_REQUIRED');

    const { res } = await register({ name: 'Ali Owner', phone: '0300-1234567', cnic: '71501-1234567-1', password: 'Passw0rd', role: 'owner' });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.verification.status, 'pending');
    assert.equal(res.body.user.phone, '923001234567');
    assert.equal(res.body.token, undefined); // the token is only in the cookie
    assert.equal(res.body.user.passwordHash, undefined);
    assert.match(res.headers['set-cookie'].join(';'), /token=.*HttpOnly/i);
  });

  test('rejects duplicate phone in another format and duplicate CNIC', async () => {
    const dupPhone = await request(app).post('/api/auth/register').send({ name: 'Dup', phone: '+92 300 1234567', password: 'Passw0rd', role: 'tenant' });
    assert.equal(dupPhone.status, 409);
    const dupCnic = await request(app).post('/api/auth/register').send({ name: 'Dup', phone: '03111111111', cnic: '7150112345671', place: 'Gilgit', password: 'Passw0rd', role: 'owner' });
    assert.equal(dupCnic.status, 409);
  });

  test('logs in with phone in any format, refuses wrong password', async () => {
    const ok = await request(app).post('/api/auth/login').send({ identifier: '+923001234567', password: 'Passw0rd' });
    assert.equal(ok.status, 200);
    const bad = await request(app).post('/api/auth/login').send({ identifier: '03001234567', password: 'nope' });
    assert.equal(bad.status, 401);
  });

  test('the cookie logs you in, logout clears it', async () => {
    const { agent } = await register({ name: 'Cookie User', email: 'cookie@test.pk', password: 'Passw0rd', role: 'tenant' });
    const me = await agent.get('/api/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.email, 'cookie@test.pk');

    await agent.post('/api/auth/logout');
    const afterLogout = await agent.get('/api/auth/me');
    assert.equal(afterLogout.status, 401);
  });

  test('the mobile app gets a Bearer token instead of a cookie', async () => {
    const login = await request(app).post('/api/auth/login').set('X-DwellGB-App', 'mobile').send({ identifier: '03001234567', password: 'Passw0rd' });
    assert.equal(login.status, 200);
    assert.ok(login.body.token, 'token returned to the app');
    assert.equal(login.headers['set-cookie'], undefined, 'no cookie for the app');
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.id, login.body.user.id);
    const bad = await request(app).get('/api/auth/me').set('Authorization', 'Bearer nope');
    assert.equal(bad.status, 401);
    // The website still never sees the token in the response body.
    const web = await request(app).post('/api/auth/login').send({ identifier: '03001234567', password: 'Passw0rd' });
    assert.equal(web.body.token, undefined);
  });

  test('the mobile app can register and remove a push token', async () => {
    const login = await request(app).post('/api/auth/login').set('X-DwellGB-App', 'mobile').send({ identifier: '03001234567', password: 'Passw0rd' });
    const auth = { Authorization: `Bearer ${login.body.token}` };
    const bad = await request(app).post('/api/users/me/push-token').set(auth).send({ token: 'not-a-token' });
    assert.equal(bad.status, 400);
    const ok = await request(app).post('/api/users/me/push-token').set(auth).send({ token: 'ExponentPushToken[test123]' });
    assert.equal(ok.status, 200);
    const { User } = require('../models');
    let u = await User.findById(login.body.user.id).select('+pushTokens');
    assert.deepEqual([...u.pushTokens], ['ExponentPushToken[test123]']);
    await request(app).delete('/api/users/me/push-token').set(auth).send({ token: 'ExponentPushToken[test123]' });
    u = await User.findById(login.body.user.id).select('+pushTokens');
    assert.deepEqual([...u.pushTokens], []);
  });

  test('a tampered token is refused', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'token=not-a-real-token');
    assert.equal(res.status, 401);
  });

  test('protected route needs a login', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
  });
});

describe('listings, bookings, reviews, chat, notifications', () => {
  let owner;
  let tenant;
  let listingId;
  let bookingId;

  before(async () => {
    owner = await register({ name: 'Karim', phone: '03551230000', cnic: '7150100000001', password: 'Passw0rd', role: 'owner' });
    await approveOwner(owner.user.id);
    tenant = await register({ name: 'Ayesha', email: 'ayesha@test.pk', password: 'Passw0rd', role: 'tenant' });
  });

  test('owner creates a listing with a photo; validation errors are clean', async () => {
    const bad = await owner.agent
      .post('/api/listings')
      .field('title', 'x')
      .attach('images', PNG, { filename: 'a.png', contentType: 'image/png' });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.code, 'VALIDATION_ERROR');

    const res = await owner.agent
      .post('/api/listings')
      .field('title', 'Family house in Jutial')
      .field('district', 'Gilgit')
      .field('area', 'Jutial')
      .field('propertyType', 'full_house')
      .field('rent', '40000')
      .field('lat', '35.8996')
      .field('lng', '74.3521')
      .field('amenities', JSON.stringify(['parking', 'mountain_view']))
      .attach('images', PNG, { filename: 'a.png', contentType: 'image/png' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.match(res.body.images[0].url, /\.webp$/);
    listingId = res.body.id;
  });

  test('monthly rentals only: no hostels, minimum stay 1 month', async () => {
    const hostel = await owner.agent
      .post('/api/listings')
      .field('title', 'Beds in a shared hostel').field('district', 'Gilgit').field('area', 'Jutial')
      .field('propertyType', 'hostel').field('rent', '8000').field('lat', '35.9').field('lng', '74.35')
      .attach('images', PNG, { filename: 'a.png', contentType: 'image/png' });
    assert.equal(hostel.status, 400);

    const zeroMonths = await owner.agent
      .post('/api/listings')
      .field('title', 'Room for a few nights').field('district', 'Gilgit').field('area', 'Jutial')
      .field('propertyType', 'single_room').field('rent', '8000').field('minStayMonths', '0')
      .field('lat', '35.9').field('lng', '74.35')
      .attach('images', PNG, { filename: 'a.png', contentType: 'image/png' });
    assert.equal(zeroMonths.status, 400);
    assert.equal(zeroMonths.body.details[0].field, 'minStayMonths');

    const oneMonth = await owner.agent
      .post('/api/listings')
      .field('title', 'Room for one month').field('district', 'Gilgit').field('area', 'Jutial')
      .field('propertyType', 'single_room').field('rent', '8000').field('minStayMonths', '1')
      .field('lat', '35.9').field('lng', '74.35')
      .attach('images', PNG, { filename: 'a.png', contentType: 'image/png' });
    assert.equal(oneMonth.status, 201, JSON.stringify(oneMonth.body));
    assert.equal(oneMonth.body.minStayMonths, 1);
  });

  test('fake image (text renamed to .png) is rejected', async () => {
    const res = await owner.agent
      .post('/api/listings')
      .field('title', 'Another house here')
      .field('district', 'Gilgit').field('area', 'Jutial').field('propertyType', 'full_house').field('rent', '40000')
      .field('lat', '35.9').field('lng', '74.35')
      .attach('images', Buffer.from('not an image'), { filename: 'evil.png', contentType: 'image/png' });
    assert.equal(res.status, 400);
  });

  test('tenants cannot create listings; public search hides exact location', async () => {
    const forbidden = await tenant.agent.post('/api/listings').send({});
    assert.equal(forbidden.status, 403);

    const search = await request(app).get('/api/listings?district=Gilgit&q=Jutial');
    assert.equal(search.status, 200);
    assert.equal(search.body.total, 1);
    assert.equal(search.body.items[0].location.exact, false);

    const detail = await request(app).get(`/api/listings/${listingId}`);
    assert.equal(detail.body.owner.phone, undefined);
    assert.equal(detail.body.canSeeContact, false);
  });

  test('facets only list options that have homes', async () => {
    const res = await request(app).get('/api/listings/facets?district=Gilgit');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 1);
    assert.equal(res.body.propertyType.full_house, 1);
    assert.equal(res.body.propertyType.apartment, undefined);
    assert.equal(res.body.amenities.parking, 1);
  });

  test('booking flow: request → notify → accept → contact unlocked', async () => {
    const b = await tenant.agent.post('/api/bookings').send({ listingId, message: 'Salam', occupants: 3 });
    assert.equal(b.status, 201);
    bookingId = b.body.id;

    const dup = await tenant.agent.post('/api/bookings').send({ listingId });
    assert.equal(dup.status, 409);

    const notes = await owner.agent.get('/api/notifications');
    assert.equal(notes.body.unreadCount, 1);
    assert.equal(notes.body.items[0].type, 'booking_request');

    const acc = await owner.agent.patch(`/api/bookings/${bookingId}/status`).send({ status: 'accepted' });
    assert.equal(acc.status, 200);
    const again = await owner.agent.patch(`/api/bookings/${bookingId}/status`).send({ status: 'rejected' });
    assert.equal(again.status, 409);

    const detail = await tenant.agent.get(`/api/listings/${listingId}`);
    assert.equal(detail.body.canSeeContact, true);
    assert.equal(detail.body.owner.phone, '923551230000');
    assert.equal(detail.body.location.exact, true);
    assert.equal(detail.body.status, 'rented');
  });

  test('accepted booking can be reviewed exactly once; ratings validated', async () => {
    const bad = await tenant.agent.post('/api/reviews').send({ bookingId, rating: 'abc' });
    assert.equal(bad.status, 400);
    const ok = await tenant.agent.post('/api/reviews').send({ bookingId, rating: 4, comment: 'Good' });
    assert.equal(ok.status, 201);
    const dup = await tenant.agent.post('/api/reviews').send({ bookingId, rating: 5 });
    assert.equal(dup.status, 409);
    const summary = await request(app).get(`/api/reviews/owner/${owner.user.id}`);
    assert.equal(summary.body.average, 4);
  });

  test('messaging: conversation exists after accept, messages + unread counts work', async () => {
    const list = await tenant.agent.get('/api/conversations');
    assert.equal(list.body.length, 1);
    const convoId = list.body[0].id;

    const sent = await tenant.agent.post(`/api/conversations/${convoId}/messages`).send({ text: 'When can I move in?' });
    assert.equal(sent.status, 201);

    const unread = await owner.agent.get('/api/conversations/unread-count');
    assert.equal(unread.body.count, 1);

    const outsider = await register({ name: 'Nosy', email: 'nosy@test.pk', password: 'Passw0rd', role: 'tenant' });
    const peek = await outsider.agent.get(`/api/conversations/${convoId}/messages`);
    assert.equal(peek.status, 404);

    await owner.agent.post(`/api/conversations/${convoId}/read`);
    const after = await owner.agent.get('/api/conversations/unread-count');
    assert.equal(after.body.count, 0);
  });

  test('saved listings', async () => {
    const s = await tenant.agent.post(`/api/users/me/saved/${listingId}`);
    assert.equal(s.status, 200);
    const saved = await tenant.agent.get('/api/users/me/saved');
    assert.equal(saved.body.length, 1);
    assert.equal(saved.body[0].isSaved, true);
  });

  test('NoSQL injection attempt in login is neutralised', async () => {
    const res = await request(app).post('/api/auth/login').send({ identifier: { $ne: null }, password: { $ne: null } });
    assert.equal(res.status, 400);
  });
});

describe('reports & admin panel', () => {
  let admin;
  let owner;
  let tenant;
  let listingId;

  before(async () => {
    const { User } = require('../models');
    const a = new User({ name: 'Admin', email: 'admin@test.pk', role: 'admin', authProviders: ['password'] });
    await a.setPassword('Adm1nPassword');
    await a.save();
    admin = await login('admin@test.pk', 'Adm1nPassword');

    owner = await register({ name: 'Mod Owner', phone: '03557778888', cnic: '7150199999991', password: 'Passw0rd', role: 'owner' });
    await approveOwner(owner.user.id);
    tenant = await register({ name: 'Mod Tenant', email: 'modtenant@test.pk', password: 'Passw0rd', role: 'tenant' });
    const l = await owner.agent
      .post('/api/listings')
      .field('title', 'Suspicious cheap house').field('district', 'Hunza').field('area', 'Aliabad')
      .field('propertyType', 'full_house').field('rent', '5000').field('lat', '36.3').field('lng', '74.61')
      .attach('images', PNG, { filename: 'a.png', contentType: 'image/png' });
    listingId = l.body.id;
  });

  test('non-admins get 403 on admin routes', async () => {
    const res = await tenant.agent.get('/api/admin/stats');
    assert.equal(res.status, 403);
  });

  test('tenant reports a listing once; admin sees it and a notification', async () => {
    const r1 = await tenant.agent.post('/api/reports').send({ targetType: 'listing', targetId: listingId, reason: 'scam' });
    assert.equal(r1.status, 201);
    const dup = await tenant.agent.post('/api/reports').send({ targetType: 'listing', targetId: listingId, reason: 'scam' });
    assert.equal(dup.status, 409);
    const own = await owner.agent.post('/api/reports').send({ targetType: 'listing', targetId: listingId, reason: 'spam' });
    assert.equal(own.status, 400);

    const queue = await admin.agent.get('/api/admin/reports');
    assert.equal(queue.status, 200);
    assert.equal(queue.body.counts.open, 1);
    assert.equal(queue.body.items[0].listing.title, 'Suspicious cheap house');

    const n = await admin.agent.get('/api/notifications/unread-count');
    assert.equal(n.body.count, 1);
  });

  test('resolving with remove_listing hides it from everyone but owner/admin', async () => {
    const queue = await admin.agent.get('/api/admin/reports');
    const res = await admin.agent
      .patch(`/api/admin/reports/${queue.body.items[0].id}`)
      .send({ status: 'resolved', resolution: 'Fake rent to lure deposits', enforce: 'remove_listing' });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'resolved');

    assert.equal((await request(app).get(`/api/listings/${listingId}`)).status, 404);
    const asOwner = await owner.agent.get(`/api/listings/${listingId}`);
    assert.equal(asOwner.body.status, 'removed');
    assert.equal(asOwner.body.moderationReason, 'Fake rent to lure deposits');

    // Owner can't flip it back to available.
    const flip = await owner.agent.patch(`/api/listings/${listingId}/status`).send({ status: 'available' });
    assert.equal(flip.status, 404);
  });

  test('ban kills the session immediately; unban restores login', async () => {
    const ban = await admin.agent.patch(`/api/admin/users/${owner.user.id}`).send({ action: 'ban', reason: 'Scam listings' });
    assert.equal(ban.status, 200);
    assert.equal(ban.body.isActive, false);

    const me = await owner.agent.get('/api/auth/me');
    assert.equal(me.status, 401);
    const blocked = await request(app).post('/api/auth/login').send({ identifier: '03557778888', password: 'Passw0rd' });
    assert.equal(blocked.status, 403);

    const selfBan = await admin.agent.patch(`/api/admin/users/${admin.user.id}`).send({ action: 'ban', reason: 'oops' });
    assert.equal(selfBan.status, 403);

    await admin.agent.patch(`/api/admin/users/${owner.user.id}`).send({ action: 'unban' });
    const again = await request(app).post('/api/auth/login').send({ identifier: '03557778888', password: 'Passw0rd' });
    assert.equal(again.status, 200);
  });

  test('stats, user search, CNIC reveal and broadcast', async () => {
    const stats = await admin.agent.get('/api/admin/stats');
    assert.equal(stats.status, 200);
    assert.equal(stats.body.series.signups.length, 30);
    assert.ok(stats.body.users.total >= 3);

    const found = await admin.agent.get('/api/admin/users').query({ q: '0355 7778888' });
    assert.equal(found.body.total, 1);
    assert.equal(found.body.items[0].cnicMasked, '71501-*******-1');

    const cnic = await admin.agent.post(`/api/admin/users/${owner.user.id}/cnic`);
    assert.equal(cnic.body.cnic, '71501-9999999-1');

    const b = await admin.agent.post('/api/admin/broadcast').send({ title: 'Winter maintenance tonight', audience: 'tenants' });
    assert.equal(b.status, 201);
    assert.ok(b.body.recipients >= 1);
  });
});

describe('owner identity verification', () => {
  let admin;
  let owner;

  before(async () => {
    const { User } = require('../models');
    const a = new User({ name: 'Verifier', email: 'verifier@test.pk', role: 'admin', authProviders: ['password'] });
    await a.setPassword('Adm1nPassword');
    await a.save();
    admin = await login('verifier@test.pk', 'Adm1nPassword');
    owner = await register({ name: 'New Owner', phone: '03461112222', cnic: '7150122222221', password: 'Passw0rd', role: 'owner' });
  });

  test('listings of an unverified owner stay hidden until an admin approves', async () => {
    const created = await owner.agent
      .post('/api/listings')
      .field('title', 'Pending owner house').field('district', 'Nagar').field('area', 'Nagar Khas')
      .field('propertyType', 'full_house').field('rent', '20000').field('lat', '36.27').field('lng', '74.74')
      .attach('images', PNG, { filename: 'a.png', contentType: 'image/png' });
    assert.equal(created.status, 201);
    assert.equal((await request(app).get(`/api/listings/${created.body.id}`)).status, 404);

    const queue = await admin.agent.get('/api/admin/verifications');
    assert.ok(queue.body.items.some((u) => u.id === owner.user.id));

    const photo = await admin.agent.get(`/api/admin/users/${owner.user.id}/documents/cnicFront`);
    assert.equal(photo.status, 200);
    assert.equal(photo.headers['content-type'], 'image/webp');

    // Documents are never reachable without logging in as an admin.
    const anon = await request(app).get(`/api/admin/users/${owner.user.id}/documents/cnicFront`);
    assert.equal(anon.status, 401);

    const rejectNoReason = await admin.agent.patch(`/api/admin/users/${owner.user.id}/verification`).send({ action: 'reject' });
    assert.equal(rejectNoReason.status, 400);

    const ok = await admin.agent.patch(`/api/admin/users/${owner.user.id}/verification`).send({ action: 'approve' });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.verification.status, 'approved');
    assert.equal((await request(app).get(`/api/listings/${created.body.id}`)).status, 200);
  });
});
