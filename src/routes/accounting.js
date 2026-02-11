const express = require('express');
const router = express.Router();
const {
    // Invoices
    getAllInvoices,
    getInvoiceById,
    createInvoice,
    updateInvoice,
    addPaymentToInvoice,
    getOverdueInvoices,
    getInvoicesByDateRange,
    // Payments
    recordPayment,
    getAllPayments,
    getPaymentsByMethod,
    // Revenue
    recordRevenue,
    getRevenueBySource,
    getRevenueByDateRange,
    // Expenses
    getAllExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    getExpensesByCategory,
    getExpensesByDateRange,
    // Financial Reports
    getProfitLossStatement,
    getCashFlowStatement,
    getBalanceSheet,
    getIncomeStatement,
    getDailyFinancialSummary,
    getMonthlyFinancialSummary,
    // Tax
    calculateTax,
    getTaxReport,
    recordTaxPayment,
    // Analytics
    getRevenueVsExpenses,
    getTopExpenseCategories,
    getPaymentMethodDistribution,
    getAccountsReceivable,
    getAccountsPayable
} = require('../controllers/accountingController');
const { authenticate } = require('../middleware/authMiddleware');
const { attachTenantModels } = require('../middleware/tenantMiddleware');

// All routes require authentication and tenant context
router.use(authenticate);
router.use(attachTenantModels);

// ==================== INVOICE ROUTES ====================
router.get('/invoices', getAllInvoices);
router.get('/invoices/overdue', getOverdueInvoices);
router.get('/invoices/range', getInvoicesByDateRange);
router.get('/invoices/:id', getInvoiceById);
router.post('/invoices', createInvoice);
router.put('/invoices/:id', updateInvoice);
router.post('/invoices/:id/payment', addPaymentToInvoice);

// ==================== PAYMENT ROUTES ====================
router.post('/payments', recordPayment);
router.get('/payments', getAllPayments);
router.get('/payments/by-method', getPaymentsByMethod);

// ==================== REVENUE ROUTES ====================
router.post('/revenue', recordRevenue);
router.get('/revenue/by-source', getRevenueBySource);
router.get('/revenue/range', getRevenueByDateRange);

// ==================== EXPENSE ROUTES ====================
router.get('/expenses', getAllExpenses);
router.post('/expenses', createExpense);
router.put('/expenses/:id', updateExpense);
router.delete('/expenses/:id', deleteExpense);
router.get('/expenses/by-category', getExpensesByCategory);
router.get('/expenses/range', getExpensesByDateRange);

// ==================== FINANCIAL REPORT ROUTES ====================
router.get('/reports/profit-loss', getProfitLossStatement);
router.get('/reports/cash-flow', getCashFlowStatement);
router.get('/reports/balance-sheet', getBalanceSheet);
router.get('/reports/income-statement', getIncomeStatement);
router.get('/reports/daily/:date', getDailyFinancialSummary);
router.get('/reports/monthly/:year/:month', getMonthlyFinancialSummary);

// ==================== TAX ROUTES ====================
router.get('/tax/calculate/:period', calculateTax);
router.get('/tax/report/:period', getTaxReport);
router.post('/tax/payment', recordTaxPayment);

// ==================== ANALYTICS ROUTES ====================
router.get('/analytics/revenue-vs-expenses', getRevenueVsExpenses);
router.get('/analytics/top-expenses', getTopExpenseCategories);
router.get('/analytics/payment-methods', getPaymentMethodDistribution);
router.get('/analytics/accounts-receivable', getAccountsReceivable);
router.get('/analytics/accounts-payable', getAccountsPayable);

module.exports = router;
