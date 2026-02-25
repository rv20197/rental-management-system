import express from 'express';
import { getAllRentals, createRental, getRentalById, updateRental, deleteRental, downloadEstimationPDF } from '../controllers/rentalController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Rentals
 *   description: Rental management APIs
 */

/**
 * @swagger
 * /rentals:
 *   get:
 *     summary: Get all rentals
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of rentals
 */
// Basic operations allowed by manager/floor staff levels
router.get('/', authenticate, getAllRentals);

/**
 * @swagger
 * /rentals:
 *   post:
 *     summary: Create a new rental
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemId:
 *                 type: integer
 *               customerId:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *                 description: Quantity of items to be rented
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               inventoryUnitIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Auto-generated array of distinct tracked IDs tied to this physical lease (FIFO dispatched).
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               depositAmount:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [active, completed, cancelled]
 *     responses:
 *       201:
 *         description: Rental created
 */
router.post('/', authenticate, createRental);

/**
 * @swagger
 * /rentals/{id}:
 *   get:
 *     summary: Get a rental by ID
 *     tags: [Rentals]
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
 *         description: Rental details
 */
router.get('/:id', authenticate, getRentalById);

/**
 * @swagger
 * /rentals/{id}:
 *   put:
 *     summary: Update a rental
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, completed, cancelled]
 *               endDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Rental updated
 */
router.put('/:id', authenticate, updateRental);

/**
 * @swagger
 * /rentals/{id}/estimation:
 *   get:
 *     summary: Download estimation PDF for a rental
 *     tags: [Rentals]
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
 *         description: PDF file of the estimation
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/:id/estimation', authenticate, downloadEstimationPDF);

/**
 * @swagger
 * /rentals/{id}:
 *   delete:
 *     summary: Delete a rental
 *     tags: [Rentals]
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
 *         description: Rental deleted successfully
 */
// Absolute record deletion limited to administrative profiles
router.delete('/:id', authenticate, authorize('admin'), deleteRental);

export default router;
