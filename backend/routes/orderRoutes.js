const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

/**
 * @swagger
 * /order/api/create:
 *   post:
 *     tags:
 *       - Orders
 *     summary: Create a new medicine order
 *     description: |
 *       Creates a new order for medicines. Validates medicine availability and stock quantity,
 *       then updates inventory and creates order record. Patient must be authenticated via session.
 *       The order is created with 'pending' status and includes the total cost calculation.
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - medicineId
 *               - quantity
 *             properties:
 *               medicineId:
 *                 type: string
 *                 description: MongoDB ID of the medicine to order
 *                 example: "60d5ec49c1234567890ab124"
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Number of units to order
 *                 example: 5
 *     responses:
 *       200:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 order:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       description: Unique order ID
 *                     status:
 *                       type: string
 *                       enum: ['pending', 'approved', 'shipped', 'delivered', 'cancelled']
 *                       description: Current order status
 *                       example: "pending"
 *                     totalCost:
 *                       type: number
 *                       description: Total cost of the order (quantity × medicine cost)
 *                       example: 250
 *       400:
 *         description: Bad request - invalid input or insufficient stock
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Only 3 items available"
 *                 code:
 *                   type: string
 *                   enum: ['INVALID_MEDICINE_ID', 'INVALID_QUANTITY', 'INSUFFICIENT_STOCK']
 *                 available:
 *                   type: number
 *                   nullable: true
 *                   description: Available stock (only for INSUFFICIENT_STOCK error)
 *       401:
 *         description: Unauthorized - user not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Authentication required"
 *                 code:
 *                   type: string
 *                   example: "AUTH_REQUIRED"
 *       404:
 *         description: Medicine not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Medicine not found"
 *                 code:
 *                   type: string
 *                   example: "NOT_FOUND"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 code:
 *                   type: string
 *                   example: "SERVER_ERROR"
 */
router.post('/api/create', orderController.create);

module.exports = router;