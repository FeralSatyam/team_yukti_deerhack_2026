'use strict';

const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/jwt');
const config = require('../config/env');
const { Doctor } = require('../models');

// Guards routes that require a signed-in doctor. Reads the session token from
// the httpOnly cookie, verifies it, loads the doctor, and attaches it to the
// request. Any failure surfaces as a clean 401.
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[config.auth.cookieName];
    if (!token) {
      throw new ApiError(401, 'Authentication required');
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (_) {
      throw new ApiError(401, 'Session expired or invalid');
    }

    const doctor = await Doctor.findByPk(payload.sub);
    if (!doctor) {
      throw new ApiError(401, 'Account no longer exists');
    }

    req.doctor = doctor;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth };
