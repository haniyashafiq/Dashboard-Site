/**
 * Comprehensive Pharmacy Controller
 * Handles all pharmacy operations including inventory, sales, suppliers, stock management, and reports
 */

// ==================== MEDICINE/INVENTORY MANAGEMENT ====================

/**
 * Get all medicines/inventory items
 */
const getAllItems = async (req, res) => {
    try {
        const Inventory = req.tenantModels.Inventory;
        const { status, category, lowStock } = req.query;

        let query = {};
        if (status) query.status = status;
        if (category) query.category = category;
        if (lowStock === 'true') {
            query.$expr = { $lte: ['$quantity', '$lowStockThreshold'] };
        }

        const items = await Inventory.find(query)
            .populate('supplierId', 'name phone')
            .sort({ name: 1 })
            .select('-__v');

        res.status(200).json({
            success: true,
            count: items.length,
            data: items,
        });
    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch inventory',
            error: error.message,
        });
    }
};

/**
 * Get a single medicine by ID
 */
const getItemById = async (req, res) => {
    try {
        const Inventory = req.tenantModels.Inventory;
        const { id } = req.params;

        const item = await Inventory.findById(id).populate('supplierId', 'name phone email');

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found',
            });
        }

        res.status(200).json({
            success: true,
            data: item,
        });
    } catch (error) {
        console.error('Get item error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch item',
            error: error.message,
        });
    }
};

/**
 * Create a new medicine/inventory item
 */
const createItem = async (req, res) => {
    try {
        const Inventory = req.tenantModels.Inventory;
        const itemData = req.body;

        // Validate required fields
        if (!itemData.name || !itemData.costPrice || !itemData.sellingPrice) {
            return res.status(400).json({
                success: false,
                message: 'Name, cost price, and selling price are required',
            });
        }

        // Check for duplicate SKU if provided
        if (itemData.sku) {
            const existingItem = await Inventory.findOne({ sku: itemData.sku });
            if (existingItem) {
                return res.status(400).json({
                    success: false,
                    message: 'Item with this SKU already exists',
                });
            }
        }

        // Calculate profit margin
        if (itemData.costPrice && itemData.sellingPrice) {
            itemData.profitMargin = ((itemData.sellingPrice - itemData.costPrice) / itemData.costPrice * 100).toFixed(2);
        }

        const newItem = new Inventory(itemData);
        await newItem.save();

        res.status(201).json({
            success: true,
            message: 'Medicine added successfully',
            data: newItem,
        });
    } catch (error) {
        console.error('Create item error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create item',
            error: error.message,
        });
    }
};

/**
 * Update a medicine/inventory item
 */
const updateItem = async (req, res) => {
    try {
        const Inventory = req.tenantModels.Inventory;
        const { id } = req.params;
        const updateData = req.body;

        // Recalculate profit margin if prices changed
        if (updateData.costPrice || updateData.sellingPrice) {
            const item = await Inventory.findById(id);
            if (item) {
                const costPrice = updateData.costPrice || item.costPrice;
                const sellingPrice = updateData.sellingPrice || item.sellingPrice;
                updateData.profitMargin = ((sellingPrice - costPrice) / costPrice * 100).toFixed(2);
            }
        }

        updateData.updatedAt = new Date();

        const item = await Inventory.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Item updated successfully',
            data: item,
        });
    } catch (error) {
        console.error('Update item error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update item',
            error: error.message,
        });
    }
};

/**
 * Delete a medicine/inventory item (soft delete)
 */
const deleteItem = async (req, res) => {
    try {
        const Inventory = req.tenantModels.Inventory;
        const { id } = req.params;

        // Soft delete - set isActive to false
        const item = await Inventory.findByIdAndUpdate(
            id,
            { isActive: false, status: 'discontinued' },
            { new: true }
        );

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Item not found',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Item discontinued successfully',
        });
    } catch (error) {
        console.error('Delete item error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete item',
            error: error.message,
        });
    }
};

// ==================== SALES MANAGEMENT ====================

/**
 * Record a medicine sale
 */
const recordSale = async (req, res) => {
    try {
        const { Sale, Inventory, StockMovement } = req.tenantModels;
        const { medicineId, quantity, discount = 0, paymentMethod, customerId, customerName, soldBy, notes } = req.body;

        if (!medicineId || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'Medicine ID and quantity are required',
            });
        }

        // Get medicine details
        const medicine = await Inventory.findById(medicineId);
        if (!medicine) {
            return res.status(404).json({
                success: false,
                message: 'Medicine not found',
            });
        }

        // Check stock availability
        if (medicine.quantity < quantity) {
            return res.status(400).json({
                success: false,
                message: `Insufficient stock. Available: ${medicine.quantity}`,
            });
        }

        // Calculate amounts
        const unitPrice = medicine.sellingPrice;
        const costPrice = medicine.costPrice;
        const subtotal = unitPrice * quantity;
        const taxAmount = (subtotal * (medicine.taxRate || 0)) / 100;
        const totalAmount = subtotal + taxAmount - discount;
        const profit = (unitPrice - costPrice) * quantity - discount;

        // Generate invoice number
        const saleCount = await Sale.countDocuments();
        const invoiceNumber = `INV-${Date.now()}-${saleCount + 1}`;

        // Create sale record
        const newSale = new Sale({
            medicineId,
            medicineName: medicine.name,
            quantity,
            unitPrice,
            costPrice,
            totalAmount,
            discount,
            taxAmount,
            profit,
            paymentMethod,
            customerId,
            customerName,
            soldBy,
            invoiceNumber,
            notes
        });

        await newSale.save();

        // Update medicine stock
        const previousStock = medicine.quantity;
        medicine.quantity -= quantity;
        if (medicine.quantity === 0) {
            medicine.status = 'out-of-stock';
        }
        await medicine.save();

        // Record stock movement
        const stockMovement = new StockMovement({
            medicineId,
            medicineName: medicine.name,
            type: 'sale',
            quantity: -quantity,
            previousStock,
            newStock: medicine.quantity,
            referenceId: newSale._id,
            referenceType: 'Sale',
            performedBy: soldBy,
            notes: `Sale: ${invoiceNumber}`
        });

        await stockMovement.save();

        res.status(201).json({
            success: true,
            message: 'Sale recorded successfully',
            data: {
                sale: newSale,
                updatedStock: medicine.quantity
            }
        });
    } catch (error) {
        console.error('Record sale error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record sale',
            error: error.message,
        });
    }
};

/**
 * Get all sales with filters
 */
const getAllSales = async (req, res) => {
    try {
        const Sale = req.tenantModels.Sale;
        const { startDate, endDate, medicineId, paymentMethod } = req.query;

        let query = {};

        if (startDate || endDate) {
            query.saleDate = {};
            if (startDate) query.saleDate.$gte = new Date(startDate);
            if (endDate) query.saleDate.$lte = new Date(endDate);
        }

        if (medicineId) query.medicineId = medicineId;
        if (paymentMethod) query.paymentMethod = paymentMethod;

        const sales = await Sale.find(query)
            .populate('medicineId', 'name sku')
            .populate('customerId', 'firstName lastName phone')
            .sort({ saleDate: -1 });

        const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);

        res.status(200).json({
            success: true,
            count: sales.length,
            totalSales,
            totalProfit,
            data: sales,
        });
    } catch (error) {
        console.error('Get sales error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sales',
            error: error.message,
        });
    }
};

/**
 * Get sale by ID
 */
const getSaleById = async (req, res) => {
    try {
        const Sale = req.tenantModels.Sale;
        const { id } = req.params;

        const sale = await Sale.findById(id)
            .populate('medicineId', 'name sku category')
            .populate('customerId', 'firstName lastName phone email');

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: 'Sale not found',
            });
        }

        res.status(200).json({
            success: true,
            data: sale,
        });
    } catch (error) {
        console.error('Get sale error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sale',
            error: error.message,
        });
    }
};

/**
 * Get daily sales report
 */
const getDailySales = async (req, res) => {
    try {
        const Sale = req.tenantModels.Sale;
        const { date } = req.params;

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const sales = await Sale.find({
            saleDate: { $gte: startOfDay, $lte: endOfDay }
        }).populate('medicineId', 'name category');

        const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);
        const totalDiscount = sales.reduce((sum, sale) => sum + sale.discount, 0);

        res.status(200).json({
            success: true,
            date,
            count: sales.length,
            totalSales,
            totalProfit,
            totalDiscount,
            data: sales,
        });
    } catch (error) {
        console.error('Get daily sales error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch daily sales',
            error: error.message,
        });
    }
};

/**
 * Get sales by date range
 */
const getSalesByDateRange = async (req, res) => {
    try {
        const Sale = req.tenantModels.Sale;
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required',
            });
        }

        const sales = await Sale.find({
            saleDate: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        }).populate('medicineId', 'name category');

        const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);

        res.status(200).json({
            success: true,
            startDate,
            endDate,
            count: sales.length,
            totalSales,
            totalProfit,
            data: sales,
        });
    } catch (error) {
        console.error('Get sales by date range error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sales',
            error: error.message,
        });
    }
};

// ==================== STOCK MANAGEMENT ====================

/**
 * Add stock (via purchase or manual addition)
 */
const addStock = async (req, res) => {
    try {
        const { Inventory, StockMovement } = req.tenantModels;
        const { medicineId, quantity, reason, performedBy, notes } = req.body;

        if (!medicineId || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'Medicine ID and quantity are required',
            });
        }

        const medicine = await Inventory.findById(medicineId);
        if (!medicine) {
            return res.status(404).json({
                success: false,
                message: 'Medicine not found',
            });
        }

        const previousStock = medicine.quantity;
        medicine.quantity += quantity;
        medicine.status = 'active';
        await medicine.save();

        // Record stock movement
        const stockMovement = new StockMovement({
            medicineId,
            medicineName: medicine.name,
            type: 'purchase',
            quantity,
            previousStock,
            newStock: medicine.quantity,
            reason,
            performedBy,
            notes
        });

        await stockMovement.save();

        res.status(200).json({
            success: true,
            message: 'Stock added successfully',
            data: {
                medicine: medicine.name,
                previousStock,
                addedQuantity: quantity,
                newStock: medicine.quantity
            }
        });
    } catch (error) {
        console.error('Add stock error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add stock',
            error: error.message,
        });
    }
};

/**
 * Adjust stock (manual adjustment, expired, damaged, etc.)
 */
const adjustStock = async (req, res) => {
    try {
        const { Inventory, StockMovement } = req.tenantModels;
        const { medicineId, newQuantity, type, reason, performedBy, notes } = req.body;

        if (!medicineId || newQuantity === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Medicine ID and new quantity are required',
            });
        }

        const medicine = await Inventory.findById(medicineId);
        if (!medicine) {
            return res.status(404).json({
                success: false,
                message: 'Medicine not found',
            });
        }

        const previousStock = medicine.quantity;
        const quantityChange = newQuantity - previousStock;

        medicine.quantity = newQuantity;
        if (newQuantity === 0) {
            medicine.status = 'out-of-stock';
        } else {
            medicine.status = 'active';
        }
        await medicine.save();

        // Record stock movement
        const stockMovement = new StockMovement({
            medicineId,
            medicineName: medicine.name,
            type: type || 'adjustment',
            quantity: quantityChange,
            previousStock,
            newStock: medicine.quantity,
            reason,
            performedBy,
            notes
        });

        await stockMovement.save();

        res.status(200).json({
            success: true,
            message: 'Stock adjusted successfully',
            data: {
                medicine: medicine.name,
                previousStock,
                adjustment: quantityChange,
                newStock: medicine.quantity
            }
        });
    } catch (error) {
        console.error('Adjust stock error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to adjust stock',
            error: error.message,
        });
    }
};

/**
 * Get stock movement history
 */
const getStockMovements = async (req, res) => {
    try {
        const StockMovement = req.tenantModels.StockMovement;
        const { medicineId, type, startDate, endDate } = req.query;

        let query = {};
        if (medicineId) query.medicineId = medicineId;
        if (type) query.type = type;

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const movements = await StockMovement.find(query)
            .populate('medicineId', 'name sku')
            .sort({ date: -1 });

        res.status(200).json({
            success: true,
            count: movements.length,
            data: movements,
        });
    } catch (error) {
        console.error('Get stock movements error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch stock movements',
            error: error.message,
        });
    }
};

/**
 * Get low stock items
 */
const getLowStockItems = async (req, res) => {
    try {
        const Inventory = req.tenantModels.Inventory;

        const lowStockItems = await Inventory.find({
            $expr: { $lte: ['$quantity', '$lowStockThreshold'] },
            isActive: true
        }).sort({ quantity: 1 });

        res.status(200).json({
            success: true,
            count: lowStockItems.length,
            data: lowStockItems,
        });
    } catch (error) {
        console.error('Get low stock items error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch low stock items',
            error: error.message,
        });
    }
};

/**
 * Get expiring items
 */
const getExpiringItems = async (req, res) => {
    try {
        const Inventory = req.tenantModels.Inventory;
        const { days = 30 } = req.query;

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + parseInt(days));

        const expiringItems = await Inventory.find({
            expiryDate: { $lte: futureDate, $gte: new Date() },
            isActive: true
        }).sort({ expiryDate: 1 });

        res.status(200).json({
            success: true,
            count: expiringItems.length,
            expiringWithinDays: days,
            data: expiringItems,
        });
    } catch (error) {
        console.error('Get expiring items error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch expiring items',
            error: error.message,
        });
    }
};

// ==================== SUPPLIER MANAGEMENT ====================

/**
 * Create a new supplier
 */
const createSupplier = async (req, res) => {
    try {
        const Supplier = req.tenantModels.Supplier;
        const supplierData = req.body;

        if (!supplierData.name || !supplierData.phone) {
            return res.status(400).json({
                success: false,
                message: 'Supplier name and phone are required',
            });
        }

        const newSupplier = new Supplier(supplierData);
        await newSupplier.save();

        res.status(201).json({
            success: true,
            message: 'Supplier created successfully',
            data: newSupplier,
        });
    } catch (error) {
        console.error('Create supplier error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create supplier',
            error: error.message,
        });
    }
};

/**
 * Get all suppliers
 */
const getAllSuppliers = async (req, res) => {
    try {
        const Supplier = req.tenantModels.Supplier;
        const { isActive } = req.query;

        let query = {};
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        const suppliers = await Supplier.find(query).sort({ name: 1 });

        res.status(200).json({
            success: true,
            count: suppliers.length,
            data: suppliers,
        });
    } catch (error) {
        console.error('Get suppliers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch suppliers',
            error: error.message,
        });
    }
};

/**
 * Update supplier
 */
const updateSupplier = async (req, res) => {
    try {
        const Supplier = req.tenantModels.Supplier;
        const { id } = req.params;
        const updateData = req.body;

        updateData.updatedAt = new Date();

        const supplier = await Supplier.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: 'Supplier not found',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Supplier updated successfully',
            data: supplier,
        });
    } catch (error) {
        console.error('Update supplier error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update supplier',
            error: error.message,
        });
    }
};

/**
 * Delete supplier (soft delete)
 */
const deleteSupplier = async (req, res) => {
    try {
        const Supplier = req.tenantModels.Supplier;
        const { id } = req.params;

        const supplier = await Supplier.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: 'Supplier not found',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Supplier deactivated successfully',
        });
    } catch (error) {
        console.error('Delete supplier error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete supplier',
            error: error.message,
        });
    }
};

// ==================== PURCHASE ORDERS ====================

/**
 * Create purchase order
 */
const createPurchaseOrder = async (req, res) => {
    try {
        const PurchaseOrder = req.tenantModels.PurchaseOrder;
        const { supplierId, items, taxAmount = 0, expectedDeliveryDate, notes, createdBy } = req.body;

        if (!supplierId || !items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Supplier and items are required',
            });
        }

        // Calculate total
        const totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0);
        const grandTotal = totalAmount + taxAmount;

        // Generate PO number
        const poCount = await PurchaseOrder.countDocuments();
        const poNumber = `PO-${Date.now()}-${poCount + 1}`;

        const newPO = new PurchaseOrder({
            poNumber,
            supplierId,
            items,
            totalAmount,
            taxAmount,
            grandTotal,
            expectedDeliveryDate,
            notes,
            createdBy
        });

        await newPO.save();

        res.status(201).json({
            success: true,
            message: 'Purchase order created successfully',
            data: newPO,
        });
    } catch (error) {
        console.error('Create purchase order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create purchase order',
            error: error.message,
        });
    }
};

/**
 * Receive purchase order and update stock
 */
const receivePurchaseOrder = async (req, res) => {
    try {
        const { PurchaseOrder, Inventory, StockMovement } = req.tenantModels;
        const { id } = req.params;
        const { receivedBy } = req.body;

        const po = await PurchaseOrder.findById(id);
        if (!po) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found',
            });
        }

        // Update stock for each item
        for (const item of po.items) {
            const medicine = await Inventory.findById(item.medicineId);
            if (medicine) {
                const previousStock = medicine.quantity;
                medicine.quantity += item.quantity;
                medicine.status = 'active';

                // Update batch and expiry if provided
                if (item.batchNumber) medicine.batchNumber = item.batchNumber;
                if (item.expiryDate) medicine.expiryDate = item.expiryDate;

                await medicine.save();

                // Record stock movement
                const stockMovement = new StockMovement({
                    medicineId: item.medicineId,
                    medicineName: item.medicineName,
                    type: 'purchase',
                    quantity: item.quantity,
                    previousStock,
                    newStock: medicine.quantity,
                    referenceId: po._id,
                    referenceType: 'PurchaseOrder',
                    performedBy: receivedBy,
                    notes: `PO: ${po.poNumber}`
                });

                await stockMovement.save();
            }
        }

        // Update PO status
        po.status = 'received';
        po.receivedDate = new Date();
        await po.save();

        res.status(200).json({
            success: true,
            message: 'Purchase order received and stock updated',
            data: po,
        });
    } catch (error) {
        console.error('Receive purchase order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to receive purchase order',
            error: error.message,
        });
    }
};

/**
 * Get all purchase orders
 */
const getAllPurchaseOrders = async (req, res) => {
    try {
        const PurchaseOrder = req.tenantModels.PurchaseOrder;
        const { status, supplierId } = req.query;

        let query = {};
        if (status) query.status = status;
        if (supplierId) query.supplierId = supplierId;

        const orders = await PurchaseOrder.find(query)
            .populate('supplierId', 'name phone email')
            .sort({ orderDate: -1 });

        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders,
        });
    } catch (error) {
        console.error('Get purchase orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch purchase orders',
            error: error.message,
        });
    }
};

// ==================== REPORTS & ANALYTICS ====================

/**
 * Get daily report
 */
const getDailyReport = async (req, res) => {
    try {
        const Sale = req.tenantModels.Sale;
        const { date } = req.params;

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const sales = await Sale.find({
            saleDate: { $gte: startOfDay, $lte: endOfDay }
        });

        const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);
        const totalCost = sales.reduce((sum, sale) => sum + (sale.costPrice * sale.quantity), 0);
        const totalDiscount = sales.reduce((sum, sale) => sum + sale.discount, 0);
        const totalTax = sales.reduce((sum, sale) => sum + sale.taxAmount, 0);

        // Group by payment method
        const paymentMethods = {};
        sales.forEach(sale => {
            if (!paymentMethods[sale.paymentMethod]) {
                paymentMethods[sale.paymentMethod] = 0;
            }
            paymentMethods[sale.paymentMethod] += sale.totalAmount;
        });

        res.status(200).json({
            success: true,
            date,
            summary: {
                totalSales,
                totalCost,
                totalProfit,
                totalDiscount,
                totalTax,
                transactionCount: sales.length,
                profitMargin: totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(2) : 0
            },
            paymentMethods,
            sales
        });
    } catch (error) {
        console.error('Get daily report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate daily report',
            error: error.message,
        });
    }
};

/**
 * Get weekly report
 */
const getWeeklyReport = async (req, res) => {
    try {
        const Sale = req.tenantModels.Sale;
        const { startDate } = req.params;

        const start = new Date(startDate);
        const end = new Date(startDate);
        end.setDate(end.getDate() + 7);

        const sales = await Sale.find({
            saleDate: { $gte: start, $lte: end }
        });

        const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);

        res.status(200).json({
            success: true,
            period: { start: startDate, end: end.toISOString().split('T')[0] },
            summary: {
                totalSales,
                totalProfit,
                transactionCount: sales.length,
                averageDailySales: (totalSales / 7).toFixed(2)
            },
            sales
        });
    } catch (error) {
        console.error('Get weekly report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate weekly report',
            error: error.message,
        });
    }
};

/**
 * Get monthly report
 */
const getMonthlyReport = async (req, res) => {
    try {
        const Sale = req.tenantModels.Sale;
        const { year, month } = req.params;

        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);

        const sales = await Sale.find({
            saleDate: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);
        const totalCost = sales.reduce((sum, sale) => sum + (sale.costPrice * sale.quantity), 0);

        res.status(200).json({
            success: true,
            period: { year, month },
            summary: {
                totalSales,
                totalCost,
                totalProfit,
                transactionCount: sales.length,
                profitMargin: totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(2) : 0
            },
            sales
        });
    } catch (error) {
        console.error('Get monthly report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate monthly report',
            error: error.message,
        });
    }
};

/**
 * Get profit analysis
 */
const getProfitAnalysis = async (req, res) => {
    try {
        const Sale = req.tenantModels.Sale;
        const { startDate, endDate } = req.query;

        let query = {};
        if (startDate && endDate) {
            query.saleDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const sales = await Sale.find(query).populate('medicineId', 'name category');

        // Group by medicine
        const profitByMedicine = {};
        sales.forEach(sale => {
            const medicineName = sale.medicineName || 'Unknown';
            if (!profitByMedicine[medicineName]) {
                profitByMedicine[medicineName] = {
                    totalSales: 0,
                    totalProfit: 0,
                    quantity: 0
                };
            }
            profitByMedicine[medicineName].totalSales += sale.totalAmount;
            profitByMedicine[medicineName].totalProfit += sale.profit;
            profitByMedicine[medicineName].quantity += sale.quantity;
        });

        const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);

        res.status(200).json({
            success: true,
            totalProfit,
            profitByMedicine,
            transactionCount: sales.length
        });
    } catch (error) {
        console.error('Get profit analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate profit analysis',
            error: error.message,
        });
    }
};

/**
 * Get top selling medicines
 */
const getTopSellingMedicines = async (req, res) => {
    try {
        const Sale = req.tenantModels.Sale;
        const { limit = 10, startDate, endDate } = req.query;

        let query = {};
        if (startDate && endDate) {
            query.saleDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const sales = await Sale.find(query);

        // Aggregate by medicine
        const medicineStats = {};
        sales.forEach(sale => {
            const medicineName = sale.medicineName || 'Unknown';
            if (!medicineStats[medicineName]) {
                medicineStats[medicineName] = {
                    name: medicineName,
                    totalQuantity: 0,
                    totalRevenue: 0,
                    totalProfit: 0,
                    transactionCount: 0
                };
            }
            medicineStats[medicineName].totalQuantity += sale.quantity;
            medicineStats[medicineName].totalRevenue += sale.totalAmount;
            medicineStats[medicineName].totalProfit += sale.profit;
            medicineStats[medicineName].transactionCount += 1;
        });

        // Convert to array and sort
        const topMedicines = Object.values(medicineStats)
            .sort((a, b) => b.totalQuantity - a.totalQuantity)
            .slice(0, parseInt(limit));

        res.status(200).json({
            success: true,
            count: topMedicines.length,
            data: topMedicines
        });
    } catch (error) {
        console.error('Get top selling medicines error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch top selling medicines',
            error: error.message,
        });
    }
};

/**
 * Get inventory value
 */
const getInventoryValue = async (req, res) => {
    try {
        const Inventory = req.tenantModels.Inventory;

        const items = await Inventory.find({ isActive: true });

        const totalCostValue = items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
        const totalSellingValue = items.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
        const potentialProfit = totalSellingValue - totalCostValue;

        res.status(200).json({
            success: true,
            summary: {
                totalItems: items.length,
                totalCostValue: totalCostValue.toFixed(2),
                totalSellingValue: totalSellingValue.toFixed(2),
                potentialProfit: potentialProfit.toFixed(2),
                profitMargin: totalCostValue > 0 ? ((potentialProfit / totalCostValue) * 100).toFixed(2) : 0
            }
        });
    } catch (error) {
        console.error('Get inventory value error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate inventory value',
            error: error.message,
        });
    }
};

module.exports = {
    // Medicine/Inventory
    getAllItems,
    getItemById,
    createItem,
    updateItem,
    deleteItem,
    // Sales
    recordSale,
    getAllSales,
    getSaleById,
    getDailySales,
    getSalesByDateRange,
    // Stock Management
    addStock,
    adjustStock,
    getStockMovements,
    getLowStockItems,
    getExpiringItems,
    // Suppliers
    createSupplier,
    getAllSuppliers,
    updateSupplier,
    deleteSupplier,
    // Purchase Orders
    createPurchaseOrder,
    receivePurchaseOrder,
    getAllPurchaseOrders,
    // Reports & Analytics
    getDailyReport,
    getWeeklyReport,
    getMonthlyReport,
    getProfitAnalysis,
    getTopSellingMedicines,
    getInventoryValue
};
