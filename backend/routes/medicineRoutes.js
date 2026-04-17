const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');
const asyncHandler = require('../middlewares/asyncHandler');

/**
 * @swagger
 * /medicine/search:
 *   get:
 *     tags:
 *       - Medicines
 *     summary: Search medicines by name, ID, or manufacturer
 *     description: |
 *       Searches available medicines in inventory by name, medicine ID, or manufacturer name.
 *       Only returns medicines with available stock (quantity > 0).
 *       Results are limited to 20 items and include expiry dates.
 *     parameters:
 *       - in: query
 *         name: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Search term to match against medicine name, medicineID, or manufacturer
 *         example: "Paracetamol"
 *     responses:
 *       200:
 *         description: Search results returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 medicines:
 *                   type: array
 *                   description: List of matching medicines with available stock
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: MongoDB ID of the medicine
 *                       name:
 *                         type: string
 *                         description: Medicine name
 *                         example: "Paracetamol"
 *                       medicineID:
 *                         type: string
 *                         description: Unique medicine identifier
 *                         example: "PARA001"
 *                       cost:
 *                         type: number
 *                         description: Price per unit
 *                         example: 50
 *                       manufacturer:
 *                         type: string
 *                         description: Medicine manufacturer
 *                         example: "ABC Pharma"
 *                       quantity:
 *                         type: number
 *                         description: Available stock quantity
 *                         example: 100
 *                       expiryDate:
 *                         type: string
 *                         format: date
 *                         nullable: true
 *                         description: Medicine expiry date
 *                       image:
 *                         type: string
 *                         nullable: true
 *                         description: Medicine image URL
 *                 count:
 *                   type: number
 *                   description: Number of results returned
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 message:
 *                   type: string
 */
// Search route must come before the :id route to avoid being treated as an ID parameter
router.get('/search', medicineController.getMedicinesSearch);

/**
 * @swagger
 * /medicine/create-sample:
 *   post:
 *     tags:
 *       - Medicines
 *     summary: Create a sample medicine (Testing only)
 *     description: |
 *       Test endpoint to create a sample medicine with an expiry date for development and testing purposes.
 *       This should be removed in production.
 *     responses:
 *       201:
 *         description: Sample medicine created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 medicine:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     medicineID:
 *                       type: string
 *                     expiryDate:
 *                       type: string
 *                       format: date-time
 *       500:
 *         description: Internal server error
 */
// Test route to create sample medicine with expiry date
router.post('/create-sample', medicineController.createSampleMedicine);

/**
 * @swagger
 * /medicine/debug/no-expiry:
 *   get:
 *     tags:
 *       - Medicines
 *     summary: Debug endpoint - Get medicines without expiry dates
 *     description: |
 *       Debug endpoint to identify medicines that are missing expiry date information.
 *       This is used for development and data quality checks. Should be removed in production.
 *     responses:
 *       200:
 *         description: List of medicines without expiry dates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: number
 *                   description: Number of medicines without expiry dates
 *                 medicines:
 *                   type: array
 *                   description: Array of medicines with missing expiry dates
 *                   items:
 *                     type: object
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
// Debug route to check medicines without expiry dates
router.get('/debug/no-expiry', asyncHandler(async (req, res) => {
    try {
        const Medicine = require('../models/Medicine');
        const medicinesWithoutExpiry = await Medicine.find({
            $or: [
                { expiryDate: { $exists: false } },
                { expiryDate: null },
                { expiryDate: undefined }
            ]
        }).lean();
        
        console.log('Medicines without expiry date:', medicinesWithoutExpiry.length);
        medicinesWithoutExpiry.forEach(med => {
            console.log(`${med.name} (${med.medicineID}): expiryDate = ${med.expiryDate}`);
        });
        
        res.json({
            count: medicinesWithoutExpiry.length,
            medicines: medicinesWithoutExpiry
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}));

/**
 * @swagger
 * /medicine/{id}:
 *   get:
 *     tags:
 *       - Medicines
 *     summary: Get detailed information for a specific medicine
 *     description: |
 *       Retrieves complete details for a single medicine including name, cost, manufacturer,
 *       quantity, expiry date, return policy, and consumption type.
 *       Requires patient authentication via session.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the medicine
 *         example: "60d5ec49c1234567890ab124"
 *     responses:
 *       200:
 *         description: Medicine details retrieved successfully
 *         content:
 *           text/html:
 *             description: HTML page with medicine details rendered via medicine_detail template
 *       400:
 *         description: Invalid medicine ID format
 *       401:
 *         description: Not logged in - redirects to login page
 *       404:
 *         description: Medicine not found
 *       500:
 *         description: Internal server error
 */
// This route handles requests to /patient/medicines/:id
router.get('/:id', medicineController.getDetail);

// Reindex medicines to Solr (admin only)
router.post('/admin/reindex-solr', medicineController.reindexSolr);

module.exports = router;
