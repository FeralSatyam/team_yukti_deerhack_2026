'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// A clinician account. Patients are owned by exactly one doctor, so every
// query in the app is scoped to the authenticated doctor's id.
const Doctor = sequelize.define(
  'Doctor',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    fullName: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    // Stored lowercased + trimmed so logins are case-insensitive.
    email: {
      type: DataTypes.STRING(160),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    // bcrypt hash — never the plaintext password.
    passwordHash: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
  },
  {
    tableName: 'doctors',
    indexes: [{ unique: true, fields: ['email'] }],
    defaultScope: {
      // Keep the hash out of every read unless a query explicitly asks for it.
      attributes: { exclude: ['passwordHash'] },
    },
    scopes: {
      withPassword: { attributes: { include: ['passwordHash'] } },
    },
  }
);

module.exports = Doctor;
