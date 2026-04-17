const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');
const asyncHandler = require('../middlewares/asyncHandler');
const { getCache, setCache, deleteCache } = require('../utils/redisClient');
const solrClient = require('../utils/solrClient');
const { indexMedicine, deleteMedicine } = require('../utils/solrIndexer');

function levenshtein(a = '', b = '') {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i += 1) dp[i][0] = i;
    for (let j = 0; j <= n; j += 1) dp[0][j] = j;

    for (let i = 1; i <= m; i += 1) {
        for (let j = 1; j <= n; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            );
        }
    }

    return dp[m][n];
}

function normalizeWord(value = '') {
    return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

exports.getDetail = asyncHandler(async (req, res) => {
    try {
        if (!req.session.patientId) {
            return res.redirect('/patient/form?error=login_required');
        }

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).render('error', {
                message: 'Invalid medicine ID',
                redirect: '/patient/order-medicines'
            });
        }

        const medicine = await Medicine.findById(req.params.id).lean();

        if (!medicine) {
            return res.status(404).render('error', {
                message: 'Medicine not found',
                redirect: '/patient/order-medicines'
            });
        }

        // Debug logging for single medicine expiry date
        console.log(`Single medicine detail - ${medicine.name} (${medicine.medicineID}): expiryDate = ${medicine.expiryDate}, type = ${typeof medicine.expiryDate}`);

        // Format expiry date for display
        const formattedExpiryDate = medicine.expiryDate ?
            new Date(medicine.expiryDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short'
            }) : 'Not specified';

        res.render('medicine_detail', {
            medicine: {
                ...medicine,
                formattedExpiryDate,
                imageUrl: medicine.imageUrl || 'https://th.bing.com/th/id/OIP.1N_r8UyW1bIoHyb_YCmcaAHaHa?w=250&h=250&c=8&rs=1&qlt=90&o=6&dpr=1.3&pid=3.1&rm=2',
                returnPolicy: medicine.returnPolicy || '3 DAYS RETURNABLE',
                consumeType: medicine.consumeType || 'TOPICAL'
            },
            title: medicine.name
        });
    } catch (err) {
        console.error("Error fetching medicine:", err.message);
        res.status(500).render('error', {
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            redirect: '/patient/order-medicines'
        });
    }
});

// Get all medicines for order medicines page (simplified view)
exports.getAllMedicines = asyncHandler(async (req, res) => {
    try {
        if (!req.session.patientId) {
            return res.redirect('/patient/form?error=login_required');
        }

        // Try cache first
        const cacheKey = 'medicine:all:list';
        const cachedMedicines = await getCache(cacheKey);
        if (cachedMedicines) {
            console.log('✅ Medicine list from Redis');
            return res.render('order_medicine', {
                medicines: cachedMedicines,
                title: 'Order Medicines'
            });
        }

        console.log('❌ Medicine list from DB');
        const medicines = await Medicine.find({ quantity: { $gt: 0 } })
            .sort({ name: 1 })
            .select('name medicineID cost manufacturer quantity expiryDate image') // Include expiryDate and image fields
            .lean();

        // Cache result for 10 minutes (600 seconds)
        await setCache(cacheKey, medicines, 600);

        // Debug logging for expiry dates
        console.log('Fetched medicines for order page:');
        medicines.forEach(med => {
            console.log(`${med.name} (${med.medicineID}): expiryDate = ${med.expiryDate}, type = ${typeof med.expiryDate}`);
        });

        res.render('order_medicine', {
            medicines: medicines,
            title: 'Order Medicines'
        });

    } catch (err) {
        console.error("Error fetching medicines:", err.message);
        res.status(500).render('error', {
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined,
            redirect: '/patient/dashboard'
        });
    }
});

// Search medicines API endpoint
exports.getMedicinesSearch = asyncHandler(async (req, res) => {
    try {
        const { query = '', manufacturer, minPrice, maxPrice, inStock } = req.query;

        let medicines = [];
        let source = 'mongodb'; // Track data source

        // Try Solr search first if available
        if (solrClient.isReady() && query) {
            try {
                const filters = {
                    manufacturer: manufacturer || null,
                    minPrice: minPrice ? parseFloat(minPrice) : null,
                    maxPrice: maxPrice ? parseFloat(maxPrice) : null,
                    inStock: inStock === 'true'
                };

                // Remove null filters
                Object.keys(filters).forEach(key => filters[key] === null && delete filters[key]);

                const searchQuery = query || '*:*';
                const results = await solrClient.search(searchQuery, filters, 0, 20);
                
                if (results.docs && results.docs.length > 0) {
                    medicines = results.docs.map(doc => ({
                        _id: doc.id,
                        name: doc.name,
                        medicineID: doc.medicineID,
                        cost: doc.cost,
                        manufacturer: doc.manufacturer,
                        quantity: doc.quantity,
                        expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : null,
                        image: doc.image
                    }));
                    source = 'solr';
                    console.log(`🔍 Solr search returned ${medicines.length} results`);
                }
            } catch (err) {
                console.warn('⚠️  Solr search failed, falling back to MongoDB:', err.message);
            }
        }

        // Fallback to MongoDB if Solr didn't return results
        if (medicines.length === 0) {
            let searchCondition = { quantity: { $gt: 0 } };

            if (query && query.length > 0) {
                searchCondition = {
                    $and: [
                        {
                            $or: [
                                { name: { $regex: query, $options: 'i' } },
                                { medicineID: { $regex: query, $options: 'i' } },
                                { manufacturer: { $regex: query, $options: 'i' } }
                            ]
                        },
                        { quantity: { $gt: 0 } }
                    ]
                };
            }

            // Add price filters
            if (minPrice || maxPrice) {
                const priceFilter = {};
                if (minPrice) priceFilter.$gte = parseFloat(minPrice);
                if (maxPrice) priceFilter.$lte = parseFloat(maxPrice);
                searchCondition.cost = priceFilter;
            }

            // Add manufacturer filter
            if (manufacturer) {
                searchCondition.manufacturer = manufacturer;
            }

            medicines = await Medicine.find(searchCondition)
                .limit(20)
                .select('name medicineID cost manufacturer quantity expiryDate image')
                .lean();
            
            source = 'mongodb';
            console.log(`🔍 MongoDB search returned ${medicines.length} results`);

            // Additional typo-tolerant fallback for hard misspellings (e.g., paratcemol)
            if (medicines.length === 0 && query && query.trim().length >= 5) {
                const normalizedQuery = normalizeWord(query);
                const allInStock = await Medicine.find({ quantity: { $gt: 0 } })
                    .select('name medicineID cost manufacturer quantity expiryDate image')
                    .lean();

                const candidates = allInStock
                    .map((med) => {
                        const score = Math.min(
                            levenshtein(normalizedQuery, normalizeWord(med.name || '')),
                            levenshtein(normalizedQuery, normalizeWord(med.medicineID || '')),
                            levenshtein(normalizedQuery, normalizeWord(med.manufacturer || ''))
                        );
                        return { med, score };
                    })
                    .filter((item) => item.score <= 3)
                    .sort((a, b) => a.score - b.score)
                    .slice(0, 20)
                    .map((item) => item.med);

                if (candidates.length > 0) {
                    medicines = candidates;
                    source = 'fuzzy-fallback';
                    console.log(`🔍 Fuzzy fallback returned ${medicines.length} results`);
                }
            }
        }

        res.json({
            success: true,
            medicines: medicines,
            count: medicines.length,
            source: source
        });

    } catch (err) {
        console.error("Error searching medicines:", err.message);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to search medicines'
        });
    }
});

// Add sample medicine with expiry date for testing
exports.createSampleMedicine = asyncHandler(async (req, res) => {
    try {
        const sampleMedicine = new Medicine({
            name: 'Paracetamol Test',
            medicineID: 'TEST001',
            quantity: 100,
            cost: 50,
            manufacturer: 'Test Pharma',
            expiryDate: new Date('2025-12-31'),
            supplierId: new mongoose.Types.ObjectId() // Dummy supplier ID
        });

        await sampleMedicine.save();
        console.log('Sample medicine created:', sampleMedicine);

        // Invalidate medicine list cache
        await deleteCache('medicine:all:list');
        console.log('Cache invalidated for medicine list after creation');

        res.json({
            success: true,
            message: 'Sample medicine created',
            medicine: sampleMedicine
        });
    } catch (err) {
        console.error('Error creating sample medicine:', err);
        res.status(500).json({
            error: 'Failed to create sample medicine',
            details: err.message
        });
    }
});

// Reindex all medicines to Solr
exports.reindexSolr = asyncHandler(async (req, res) => {
    try {
        // Check authorization - only admins can reindex
        if (req.session.userRole !== 'admin') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Only admins can reindex Solr'
            });
        }

        const { reindexAllMedicines } = require('../utils/solrIndexer');
        const success = await reindexAllMedicines(Medicine);

        if (success) {
            res.json({
                success: true,
                message: 'Solr reindexing completed successfully'
            });
        } else {
            res.status(500).json({
                error: 'Reindexing failed',
                message: 'Failed to reindex medicines to Solr'
            });
        }
    } catch (err) {
        console.error('Error reindexing Solr:', err.message);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to reindex medicines'
        });
    }
});