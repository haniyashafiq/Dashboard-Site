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

    // Enhanced Inventory/Medicine Schema for Pharmacy
    const inventorySchema = new mongoose.Schema({
      name: { type: String, required: true },
      description: String,
      sku: { type: String, unique: true, sparse: true }, // Stock Keeping Unit
      category: { type: String, default: 'general' }, // e.g., antibiotics, painkillers, supplements
      manufacturer: String,
      batchNumber: String,
      barcode: String,
      quantity: { type: Number, default: 0 },
      costPrice: { type: Number, required: true }, // Purchase price
      sellingPrice: { type: Number, required: true }, // Selling price
      profitMargin: { type: Number }, // Calculated: (sellingPrice - costPrice) / costPrice * 100
      taxRate: { type: Number, default: 0 }, // Tax percentage
      expiryDate: Date,
      supplier: String, // Will be replaced by supplierId reference
      supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
      lowStockThreshold: { type: Number, default: 10 },
      prescriptionRequired: { type: Boolean, default: false },
      status: { type: String, enum: ['active', 'discontinued', 'out-of-stock'], default: 'active' },
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    // Sale Schema - Track all medicine sales
    const saleSchema = new mongoose.Schema({
      medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
      medicineName: String, // Denormalized for quick access
      quantity: { type: Number, required: true },
      unitPrice: { type: Number, required: true }, // Selling price at time of sale
      costPrice: { type: Number, required: true }, // Cost price at time of sale
      totalAmount: { type: Number, required: true }, // quantity * unitPrice
      discount: { type: Number, default: 0 },
      taxAmount: { type: Number, default: 0 },
      profit: { type: Number, required: true }, // (unitPrice - costPrice) * quantity - discount
      paymentMethod: { type: String, enum: ['cash', 'card', 'upi', 'insurance', 'other'], default: 'cash' },
      customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
      customerName: String,
      soldBy: String, // Staff member name or ID
      saleDate: { type: Date, default: Date.now },
      invoiceNumber: String,
      notes: String,
      createdAt: { type: Date, default: Date.now }
    });

    // Supplier Schema - Manage medicine suppliers
    const supplierSchema = new mongoose.Schema({
      name: { type: String, required: true },
      contactPerson: String,
      email: String,
      phone: { type: String, required: true },
      address: String,
      city: String,
      state: String,
      country: String,
      taxId: String, // GST/VAT number
      paymentTerms: String, // e.g., "Net 30 days"
      bankDetails: {
        accountName: String,
        accountNumber: String,
        bankName: String,
        ifscCode: String
      },
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    // Stock Movement Schema - Track all inventory changes
    const stockMovementSchema = new mongoose.Schema({
      medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
      medicineName: String,
      type: {
        type: String,
        enum: ['purchase', 'sale', 'adjustment', 'return', 'expired', 'damaged'],
        required: true
      },
      quantity: { type: Number, required: true }, // Positive for additions, negative for reductions
      previousStock: { type: Number, required: true },
      newStock: { type: Number, required: true },
      reason: String,
      referenceId: mongoose.Schema.Types.ObjectId, // Reference to Sale, PurchaseOrder, etc.
      referenceType: String, // 'Sale', 'PurchaseOrder', 'Adjustment'
      performedBy: String, // Staff member
      date: { type: Date, default: Date.now },
      notes: String,
      createdAt: { type: Date, default: Date.now }
    });

    // Purchase Order Schema - Track medicine purchases from suppliers
    const purchaseOrderSchema = new mongoose.Schema({
      poNumber: { type: String, unique: true, required: true }, // Auto-generated
      supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
      supplierName: String,
      items: [{
        medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
        medicineName: String,
        quantity: { type: Number, required: true },
        unitCost: { type: Number, required: true },
        totalCost: { type: Number, required: true },
        batchNumber: String,
        expiryDate: Date
      }],
      totalAmount: { type: Number, required: true },
      taxAmount: { type: Number, default: 0 },
      grandTotal: { type: Number, required: true },
      status: {
        type: String,
        enum: ['pending', 'approved', 'received', 'partially_received', 'cancelled'],
        default: 'pending'
      },
      orderDate: { type: Date, default: Date.now },
      expectedDeliveryDate: Date,
      receivedDate: Date,
      invoiceNumber: String,
      paymentStatus: { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' },
      paidAmount: { type: Number, default: 0 },
      notes: String,
      createdBy: String,
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    // Enhanced Invoice Schema for Accounting
    const invoiceSchema = new mongoose.Schema({
      invoiceNumber: { type: String, unique: true, required: true }, // Auto-generated
      patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
      customerName: String,
      type: { type: String, enum: ['patient', 'pharmacy', 'other'], default: 'patient' },
      items: [{
        description: String,
        amount: Number,
        quantity: { type: Number, default: 1 },
        totalAmount: Number
      }],
      subtotal: { type: Number, required: true },
      taxAmount: { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
      totalAmount: { type: Number, required: true },
      paidAmount: { type: Number, default: 0 },
      balance: { type: Number, required: true },
      status: { type: String, enum: ['paid', 'partially_paid', 'unpaid', 'overdue'], default: 'unpaid' },
      dueDate: Date,
      paymentMethod: String,
      paymentTerms: String,
      paymentHistory: [{
        amount: Number,
        paymentMethod: String,
        paymentDate: Date,
        transactionId: String,
        receivedBy: String
      }],
      notes: String,
      createdBy: String,
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    // Payment Schema - Track all payments received
    const paymentSchema = new mongoose.Schema({
      paymentNumber: { type: String, unique: true, required: true },
      invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
      invoiceNumber: String,
      amount: { type: Number, required: true },
      paymentMethod: { type: String, enum: ['cash', 'card', 'bank_transfer', 'upi', 'cheque', 'other'], required: true },
      paymentDate: { type: Date, default: Date.now },
      transactionId: String,
      referenceNumber: String,
      notes: String,
      receivedBy: String,
      status: { type: String, enum: ['completed', 'pending', 'failed', 'refunded'], default: 'completed' },
      createdAt: { type: Date, default: Date.now }
    });

    // Revenue Schema - Track all revenue sources
    const revenueSchema = new mongoose.Schema({
      source: {
        type: String,
        enum: ['patient-consultation', 'pharmacy-sales', 'lab-tests', 'procedures', 'other'],
        required: true
      },
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now },
      category: String,
      description: String,
      referenceType: String, // 'Invoice', 'Sale', etc.
      referenceId: mongoose.Schema.Types.ObjectId,
      paymentMethod: String,
      createdBy: String,
      createdAt: { type: Date, default: Date.now }
    });

    // Enhanced Expense Schema
    const expenseSchema = new mongoose.Schema({
      expenseNumber: { type: String, unique: true, required: true },
      description: { type: String, required: true },
      amount: { type: Number, required: true },
      category: {
        type: String,
        enum: ['rent', 'utilities', 'supplies', 'salary', 'maintenance', 'inventory', 'marketing', 'insurance', 'taxes', 'other'],
        default: 'other'
      },
      date: { type: Date, default: Date.now },
      paymentMethod: { type: String, enum: ['cash', 'card', 'bank_transfer', 'cheque', 'other'] },
      recipient: String,
      receiptUrl: String,
      receiptNumber: String,
      approvedBy: String,
      tags: [String],
      isRecurring: { type: Boolean, default: false },
      recurringFrequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
      status: { type: String, enum: ['pending', 'approved', 'paid', 'rejected'], default: 'approved' },
      createdBy: String,
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    // Account Ledger Schema - General ledger for all transactions
    const accountLedgerSchema = new mongoose.Schema({
      date: { type: Date, default: Date.now },
      type: { type: String, enum: ['debit', 'credit'], required: true },
      category: { type: String, required: true },
      amount: { type: Number, required: true },
      balance: { type: Number, required: true }, // Running balance
      description: String,
      referenceType: String, // 'Invoice', 'Expense', 'Payment', 'Sale'
      referenceId: mongoose.Schema.Types.ObjectId,
      referenceNumber: String,
      createdBy: String,
      createdAt: { type: Date, default: Date.now }
    });

    // Tax Record Schema - Track tax calculations and payments
    const taxRecordSchema = new mongoose.Schema({
      period: { type: String, required: true }, // e.g., "2026-02" for Feb 2026
      periodType: { type: String, enum: ['monthly', 'quarterly', 'yearly'], default: 'monthly' },
      totalRevenue: { type: Number, required: true },
      taxableAmount: { type: Number, required: true },
      taxRate: { type: Number, required: true },
      taxAmount: { type: Number, required: true },
      status: { type: String, enum: ['pending', 'filed', 'paid'], default: 'pending' },
      filedDate: Date,
      paidDate: Date,
      paymentReference: String,
      notes: String,
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    // Create models in the tenant database
    const Patient = tenantConnection.model('Patient', patientSchema);
    const Appointment = tenantConnection.model('Appointment', appointmentSchema);
    const Staff = tenantConnection.model('Staff', staffSchema);
    const Settings = tenantConnection.model('Settings', settingsSchema);

    // Pharmacy Models
    const Inventory = tenantConnection.model('Inventory', inventorySchema);
    const Sale = tenantConnection.model('Sale', saleSchema);
    const Supplier = tenantConnection.model('Supplier', supplierSchema);
    const StockMovement = tenantConnection.model('StockMovement', stockMovementSchema);
    const PurchaseOrder = tenantConnection.model('PurchaseOrder', purchaseOrderSchema);

    // Accounting Models
    const Invoice = tenantConnection.model('Invoice', invoiceSchema);
    const Payment = tenantConnection.model('Payment', paymentSchema);
    const Revenue = tenantConnection.model('Revenue', revenueSchema);
    const Expense = tenantConnection.model('Expense', expenseSchema);
    const AccountLedger = tenantConnection.model('AccountLedger', accountLedgerSchema);
    const TaxRecord = tenantConnection.model('TaxRecord', taxRecordSchema);

    // Wait for connection to be established
    await new Promise((resolve, reject) => {
      tenantConnection.once('open', resolve);
      tenantConnection.once('error', reject);
    });

    // Explicitly create collections by inserting and removing a dummy document
    // This ensures the database and collections are physically created in MongoDB
    console.log(`✓ Creating collections for tenant: ${tenantDbName}`);

    // Core collections
    await Patient.createCollection();
    await Appointment.createCollection();
    await Staff.createCollection();
    await Settings.createCollection();

    // Pharmacy collections
    await Inventory.createCollection();
    await Sale.createCollection();
    await Supplier.createCollection();
    await StockMovement.createCollection();
    await PurchaseOrder.createCollection();

    // Accounting collections
    await Invoice.createCollection();
    await Payment.createCollection();
    await Revenue.createCollection();
    await Expense.createCollection();
    await AccountLedger.createCollection();
    await TaxRecord.createCollection();

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
