'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// A patient record owned by a doctor. The active medication list lives on the
// record itself so switching patients in the UI restores their working set.
const Patient = sequelize.define(
  'Patient',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    doctorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    // The doctor's current working medication list for this patient.
    medications: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    tableName: 'patients',
    indexes: [{ fields: ['doctorId'] }],
  }
);

module.exports = Patient;
