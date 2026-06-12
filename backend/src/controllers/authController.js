'use strict';

const bcrypt = require('bcryptjs');
const ApiError = require('../utils/ApiError');
const { signToken, cookieOptions } = require('../utils/jwt');
const config = require('../config/env');
const { Doctor } = require('../models');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// Shapes the doctor object returned to the client (never includes the hash).
function publicDoctor(doctor) {
  return { id: doctor.id, fullName: doctor.fullName, email: doctor.email };
}

// Issues the session cookie and returns the doctor profile. Shared by both
// register and login so a successful signup is immediately authenticated.
function sendSession(res, doctor) {
  const token = signToken(doctor.id);
  res.cookie(config.auth.cookieName, token, cookieOptions());
  res.json({ doctor: publicDoctor(doctor) });
}

// POST /api/auth/register — create a doctor and sign them in straight away.
async function register(req, res, next) {
  try {
    const fullName = String(req.body?.fullName || '').trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!fullName) throw new ApiError(400, 'Full name is required');
    if (!EMAIL_RE.test(email)) throw new ApiError(400, 'A valid email is required');
    if (password.length < 8) {
      throw new ApiError(400, 'Password must be at least 8 characters');
    }

    const existing = await Doctor.findOne({ where: { email } });
    if (existing) throw new ApiError(409, 'An account with this email already exists');

    const passwordHash = await bcrypt.hash(password, 10);
    const doctor = await Doctor.create({ fullName, email, passwordHash });

    sendSession(res, doctor);
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login — verify credentials and issue a session.
async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!EMAIL_RE.test(email) || !password) {
      throw new ApiError(400, 'Email and password are required');
    }

    // Use the scope that includes the hash so we can compare against it.
    const doctor = await Doctor.scope('withPassword').findOne({ where: { email } });
    const ok = doctor && (await bcrypt.compare(password, doctor.passwordHash));
    if (!ok) throw new ApiError(401, 'Invalid email or password');

    sendSession(res, doctor);
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout — clear the session cookie.
function logout(req, res) {
  res.clearCookie(config.auth.cookieName, { ...cookieOptions(), maxAge: undefined });
  res.json({ ok: true });
}

// GET /api/auth/me — return the signed-in doctor (used to restore the session
// on a fresh page load).
function me(req, res) {
  res.json({ doctor: publicDoctor(req.doctor) });
}

module.exports = { register, login, logout, me };
