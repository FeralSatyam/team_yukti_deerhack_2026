'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// A saved interaction analysis for a patient — the medication set that was
// checked, the headline risk level, and the full result payload for replay.
const AnalysisHistory = sequelize.define(
  'AnalysisHistory',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    medications: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    // 'low' | 'moderate' | 'high' | 'critical' — drives the history badge color.
    riskLevel: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'low',
    },
    // Full analysis result so a past run can be reopened without recomputing.
    result: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: 'analysis_history',
    indexes: [{ fields: ['patientId'] }, { fields: ['createdAt'] }],
  }
);

module.exports = AnalysisHistory;
