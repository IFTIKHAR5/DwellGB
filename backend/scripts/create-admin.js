// scripts/create-admin.js — create an admin account, or promote an existing user.
//
//   npm run create-admin -- --email admin@dwellgb.pk --name "Site Admin" --password "S3cure-Pass"
//   npm run create-admin -- --promote 03551234567          (phone or email of an existing account)
//
// Admin accounts can't be created from the website on purpose.
const env = require('../config/env');
const { connectDB, disconnectDB } = require('../db');
const { User } = require('../models');
const { normalizePhone } = require('../utils');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function run() {
  await connectDB(env.MONGODB_URI);
  const promote = arg('promote');

  if (promote) {
    const isEmail = promote.includes('@');
    const phone = isEmail ? null : normalizePhone(promote);
    // Without this check a typo gave { phone: null }, which matches the first user with no phone.
    if (!isEmail && !phone) throw new Error(`"${promote}" is not a valid email or Pakistani phone number.`);
    const user = await User.findOne(isEmail ? { email: promote.toLowerCase() } : { phone });
    if (!user) throw new Error(`No user found for "${promote}".`);
    user.role = 'admin';
    await user.save();
    console.log(`${user.name} is now an admin.`);
    return;
  }

  const email = arg('email')?.toLowerCase();
  const name = arg('name') || 'DwellGB Admin';
  const password = arg('password');
  if (!email || !password) {
    console.log('Usage: npm run create-admin -- --email you@example.com --password "Strong-Pass1" [--name "Your Name"]');
    console.log('   or: npm run create-admin -- --promote <email or phone of an existing user>');
    process.exitCode = 1;
    return;
  }
  if (password.length < 10 || !/\d/.test(password) || !/[A-Za-z]/.test(password)) {
    throw new Error('Admin passwords must be at least 10 characters with letters and numbers.');
  }
  if (await User.exists({ email })) throw new Error(`An account with ${email} already exists — use --promote instead.`);

  const user = new User({ name, email, emailVerified: true, role: 'admin', authProviders: ['password'], isVerified: true });
  await user.setPassword(password);
  await user.save();
  console.log(`Admin created: ${email}. Log in at /login, then open /admin.`);
}

run()
  .catch((err) => {
    console.error('Error:', err.message);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB().catch(() => {}));
