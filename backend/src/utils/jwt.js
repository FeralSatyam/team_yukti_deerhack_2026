'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');

// Signs a session token carrying the doctor's id. Kept intentionally small —
// the rest of the profile is loaded from the DB on each request.
function signToken(doctorId) {
  return jwt.sign({ sub: doctorId }, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn,
  });
}

// Verifies a token and returns its payload, or throws if invalid/expired.
function verifyToken(token) {
  return jwt.verify(token, config.auth.jwtSecret);
}

// Standard attributes for the session cookie used across login/register/logout.
function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.auth.cookieSecure,
    sameSite: 'lax',
    maxAge: config.auth.cookieMaxAgeMs,
    path: '/',
  };
}

module.exports = { signToken, verifyToken, cookieOptions };
