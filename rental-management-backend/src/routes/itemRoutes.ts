import express from 'express';
import { getAllItems, createItem, getItemById, updateItem, deleteItem } from '../controllers/itemController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import morganMiddleware from "../middleware/loggingMiddleware";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Items
 *   description: Item/Goods management APIs
 */

/**
 * @swagger
 * /items:
 *   get:
 *     summary: Get all items
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of items
 */
router.get('/', authenticate, getAllItems);

/**
 * @swagger
 * /items:
 *   post:
 *     summary: Create a new inventory item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [available, rented, maintenance]
 *               monthlyRate:
 *                 type: number
 *               quantity:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Item created
 */
// Only admins can alter absolute catalog listings safely
router.post('/', authenticate, authorize('admin'),createItem);

/**
 * @swagger
 * /items/{id}:
 *   get:
 *     summary: Get an item by id
 *     tags: [Items]
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
 *         description: Item details
 *       404:
 *         description: Item not found
 */
router.get('/:id', authenticate, getItemById);

/**
 * @swagger
 * /items/{id}:
 *   put:
 *     summary: Update an item
 *     tags: [Items]
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
 *               monthlyRate:
 *                 type: number
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Item updated
 */
router.put('/:id', authenticate, authorize('admin'), updateItem);

/**
 * @swagger
 * /items/{id}:
 *   delete:
 *     summary: Delete an item
 *     tags: [Items]
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
 *         description: Item deleted successfully
 */
router.delete('/:id', authenticate, authorize('admin'), deleteItem);

export default router;
