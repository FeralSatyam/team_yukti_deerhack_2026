'use strict';

// Central place to register models, declare associations, and sync the schema.
// Importing the models here registers them on the shared sequelize instance.
const sequelize = require('../config/database');
const InteractionCache = require('./InteractionCache');
const SearchLog = require('./SearchLog');
const Doctor = require('./Doctor');
const Patient = require('./Patient');
const AnalysisHistory = require('./AnalysisHistory');

// --- Associations ---
// A doctor owns many patients; deleting a doctor removes their patients.
Doctor.hasMany(Patient, { foreignKey: 'doctorId', as: 'patients', onDelete: 'CASCADE' });
Patient.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });

// A patient accumulates many saved analyses.
Patient.hasMany(AnalysisHistory, { foreignKey: 'patientId', as: 'history', onDelete: 'CASCADE' });
AnalysisHistory.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

// Verifies connectivity and creates/updates tables to match the models.
// Uses { alter: true } so the local schema stays in step during development.
async function initDatabase() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
}

module.exports = {
  sequelize,
  initDatabase,
  InteractionCache,
  SearchLog,
  Doctor,
  Patient,
  AnalysisHistory,
};
