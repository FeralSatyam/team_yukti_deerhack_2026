'use strict';

const ApiError = require('../utils/ApiError');
const { Patient, AnalysisHistory } = require('../models');

// Loads a patient and asserts the authenticated doctor owns it. Centralizes
// the ownership check so no route can read or mutate another doctor's records.
async function ownedPatient(doctorId, patientId) {
  const patient = await Patient.findOne({ where: { id: patientId, doctorId } });
  if (!patient) throw new ApiError(404, 'Patient not found');
  return patient;
}

function sanitizeMeds(input) {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .map((m) => String(m).trim())
        .filter(Boolean)
    )
  );
}

// GET /api/patients — list the doctor's patients, most recently updated first.
async function list(req, res, next) {
  try {
    const patients = await Patient.findAll({
      where: { doctorId: req.doctor.id },
      order: [['updatedAt', 'DESC']],
    });
    res.json({ patients });
  } catch (err) {
    next(err);
  }
}

// POST /api/patients — add a patient under the current doctor.
async function create(req, res, next) {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) throw new ApiError(400, 'Patient name is required');

    const patient = await Patient.create({
      doctorId: req.doctor.id,
      name,
      medications: sanitizeMeds(req.body?.medications),
    });
    res.status(201).json({ patient });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/patients/:id — rename and/or replace the working medication list.
async function update(req, res, next) {
  try {
    const patient = await ownedPatient(req.doctor.id, req.params.id);

    if (typeof req.body?.name === 'string') {
      const name = req.body.name.trim();
      if (!name) throw new ApiError(400, 'Patient name cannot be empty');
      patient.name = name;
    }
    if (req.body?.medications !== undefined) {
      patient.medications = sanitizeMeds(req.body.medications);
    }

    await patient.save();
    res.json({ patient });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/patients/:id — remove a patient and their history.
async function remove(req, res, next) {
  try {
    const patient = await ownedPatient(req.doctor.id, req.params.id);
    await patient.destroy();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// GET /api/patients/:id/history — saved analyses for a patient, newest first.
async function listHistory(req, res, next) {
  try {
    await ownedPatient(req.doctor.id, req.params.id);
    const history = await AnalysisHistory.findAll({
      where: { patientId: req.params.id },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json({ history });
  } catch (err) {
    next(err);
  }
}

// POST /api/patients/:id/history — record a completed analysis run.
async function addHistory(req, res, next) {
  try {
    await ownedPatient(req.doctor.id, req.params.id);
    const medications = sanitizeMeds(req.body?.medications);
    if (medications.length < 2) {
      throw new ApiError(400, 'An analysis needs at least two medications');
    }
    const entry = await AnalysisHistory.create({
      patientId: Number(req.params.id),
      medications,
      riskLevel: String(req.body?.riskLevel || 'low'),
      result: req.body?.result ?? null,
    });
    res.status(201).json({ entry });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove, listHistory, addHistory };
