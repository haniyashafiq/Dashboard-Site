const mongoose = require('mongoose');
const { connectTenantDB } = require('../config/database');

/**
 * Generate a unique tenant database name
 * @param {string} companyName - The company name
 * @returns {string} - Sanitized database name
 */
const generateTenantDbName = (companyName) => {
  // Sanitize company name: lowercase, remove special chars, replace spaces with underscores
  const sanitized = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 30); // Limit length

  // Add timestamp for uniqueness
  const timestamp = Date.now();
  return `tenant_${sanitized}_${timestamp}`;
};

/**
 * Create a new tenant database with initial schema
 * @param {string} tenantDbName - The name of the tenant database
 * @returns {Object} - Contains connection info
 */
const createTenantDatabase = async (tenantDbName) => {
  try {
    // Create connection to the new tenant database
    const tenantConnection = connectTenantDB(tenantDbName);

    // Define initial schemas for the tenant database
    // These are basic placeholder collections that will be used during the trial
    const patientSchema = new mongoose.Schema({
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: String,
      phone: String,
      dateOfBirth: Date,
      address: String,
      medicalHistory: String,
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    });

    const appointmentSchema = new mongoose.Schema({
      patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
      appointmentDate: { type: Date, required: true },
      appointmentType: String,
      duration: Number, // in minutes
      status: {
        type: String,
        enum: ['scheduled', 'completed', 'cancelled', 'no-show'],
        default: 'scheduled',
      },
      notes: String,
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    });

    const staffSchema = new mongoose.Schema({
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      role: {
        type: String,
        enum: ['admin', 'doctor', 'therapist', 'nurse', 'receptionist'],
        default: 'staff',
      },
      phone: String,
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    });

    const settingsSchema = new mongoose.Schema({
      clinicName: { type: String, required: true },
      clinicAddress: String,
      clinicPhone: String,
      clinicEmail: String,
      businessHours: {
        monday: { open: String, close: String },
        tuesday: { open: String, close: String },
        wednesday: { open: String, close: String },
        thursday: { open: String, close: String },
        friday: { open: String, close: String },
        saturday: { open: String, close: String },
        sunday: { open: String, close: String },
      },
      timezone: { type: String, default: 'UTC' },
      updatedAt: { type: Date, default: Date.now },
    });

    // Create models in the tenant database
    const Patient = tenantConnection.model('Patient', patientSchema);
    const Appointment = tenantConnection.model('Appointment', appointmentSchema);
    const Staff = tenantConnection.model('Staff', staffSchema);
    const Settings = tenantConnection.model('Settings', settingsSchema);

    // Wait for connection to be established
    await new Promise((resolve, reject) => {
      tenantConnection.once('open', resolve);
      tenantConnection.once('error', reject);
    });

    // Explicitly create collections by inserting and removing a dummy document
    // This ensures the database and collections are physically created in MongoDB
    console.log(`✓ Creating collections for tenant: ${tenantDbName}`);

    await Patient.createCollection();
    await Appointment.createCollection();
    await Staff.createCollection();
    await Settings.createCollection();

    const tenantDbUrl = `${process.env.MONGO_TENANT_BASE_URI}/${tenantDbName}`;

    console.log(`✓ Tenant database created: ${tenantDbName}`);

    // Close the connection after initialization
    await tenantConnection.close();

    return {
      tenantDbName,
      tenantDbUrl,
      success: true,
    };
  } catch (error) {
    console.error('Error creating tenant database:', error.message);
    throw new Error(`Failed to create tenant database: ${error.message}`);
  }
};

/**
 * Provision a new tenant (create database and return connection info)
 * @param {string} companyName - The company name
 * @returns {Object} - Tenant database information
 */
const provisionTenant = async (companyName) => {
  try {
    const tenantDbName = generateTenantDbName(companyName);
    const tenantInfo = await createTenantDatabase(tenantDbName);

    return tenantInfo;
  } catch (error) {
    console.error('Error provisioning tenant:', error.message);
    throw error;
  }
};

/**
 * Get a connection to an existing tenant database
 * @param {string} tenantDbName - The name of the tenant database
 * @returns {mongoose.Connection} - Mongoose connection instance
 */
const getTenantConnection = (tenantDbName) => {
  return connectTenantDB(tenantDbName);
};

module.exports = {
  generateTenantDbName,
  createTenantDatabase,
  provisionTenant,
  getTenantConnection,
};
