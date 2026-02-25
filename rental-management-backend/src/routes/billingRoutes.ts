import express from 'express';
import { getAllBillings, createBilling, getBillingById, payBilling, deleteBilling, returnAndBill, downloadBillPDF } from '../controllers/billingController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Billings
 *   description: Billing management APIs
 */

/**
 * @swagger
 * /billings:
 *   get:
 *     summary: Get all billings
 *     tags: [Billings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of billings
 */
router.get('/', authenticate, getAllBillings);

/**
 * @swagger
 * /billings:
 *   post:
 *     summary: Create a new billing record
 *     tags: [Billings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rentalId:
 *                 type: string
 *               amount:
 *                 type: number
 *               dueDate:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [pending, paid, overdue]
 *     responses:
 *       201:
 *         description: Billing created
 */
router.post('/', authenticate, createBilling);

/**
 * @swagger
 * /billings/{id}:
 *   get:
 *     summary: Get a billing record by ID
 *     tags: [Billings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Billing details
 */
router.get('/:id', authenticate, getBillingById);

/**
 * @swagger
 * /billings/{id}/pay:
 *   put:
 *     summary: Pay a billing record
 *     tags: [Billings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Billing updated to paid
 */
router.put('/:id/pay', authenticate, payBilling);

/**
 * @swagger
 * /billings/return:
 *   post:
 *     summary: Return items and dynamically generate a bill based on duration
 *     tags: [Billings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rentalId:
 *                 type: string
 *               returnedQuantity:
 *                 type: integer
 *                 description: Explicit quantity being returned now
 *     responses:
 *       201:
 *         description: Items returned and Bill generated
 */
router.post('/return', authenticate, returnAndBill);

/**
 * @swagger
 * /billings/{id}/download:
 *   get:
 *     summary: Download a billing record as PDF
 *     tags: [Billings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: PDF file of the bill
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/:id/download', authenticate, downloadBillPDF);

/**
 * @swagger
 * /billings/{id}:
 *   delete:
 *     summary: Delete a billing record
 *     tags: [Billings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Billing record deleted successfully
 */
router.delete('/:id', authenticate, authorize('admin'), deleteBilling);

export default router;
