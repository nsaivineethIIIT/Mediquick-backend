const Cart = require('../models/Cart');
const Medicine = require('../models/Medicine');
const mongoose = require('mongoose');
const { getCache, setCache, deleteCache } = require('../utils/redisClient');
const asyncHandler = require('../middlewares/asyncHandler');

exports.addToCart = asyncHandler(async (req, res) => {
    try {
        console.log('=== ADD TO CART START ===');
        
        if (!req.patientId) {
            return res.status(401).json({ error: 'Please login first' });
        }

        const { medicineId, quantity } = req.body;
        const qty = parseInt(quantity);

        console.log('Patient:', req.patientId, 'Medicine:', medicineId, 'Qty:', qty);

        // Validate input
        if (!mongoose.Types.ObjectId.isValid(medicineId) || isNaN(qty) || qty < 1) {
            return res.status(400).json({ error: 'Invalid medicine or quantity' });
        }

        // Check if medicine exists
        const medicine = await Medicine.findById(medicineId);
        if (!medicine) {
            return res.status(404).json({ error: 'Medicine not found' });
        }

        // Check stock
        if (medicine.quantity < qty) {
            return res.status(400).json({ 
                error: `Only ${medicine.quantity} units available`, 
                available: medicine.quantity 
            });
        }

        // Find or create cart
        let cart = await Cart.findOne({ patientId: req.patientId });
        
        if (!cart) {
            console.log('Creating new cart for patient:', req.patientId);
            cart = new Cart({
                patientId: req.patientId,
                items: []
            });
        }

        // Check if medicine already in cart
        const existingItemIndex = cart.items.findIndex(
            item => item.medicineId.toString() === medicineId
        );

        if (existingItemIndex > -1) {
            // Update existing item
            const newQuantity = cart.items[existingItemIndex].quantity + qty;
            if (newQuantity > medicine.quantity) {
                return res.status(400).json({ 
                    error: `Cannot add more than available stock`, 
                    available: medicine.quantity 
                });
            }
            cart.items[existingItemIndex].quantity = newQuantity;
            console.log('Updated existing item quantity to:', newQuantity);
        } else {
            // Add new item
            cart.items.push({
                medicineId: medicineId,
                quantity: qty
            });
            console.log('Added new item to cart');
        }

        // Save cart
        await cart.save();
        console.log('Cart saved successfully. Total items:', cart.items.length);

        // Invalidate cart cache
        const cacheKey = `cart:${req.patientId}:data`;
        await deleteCache(cacheKey);
        console.log('Cache invalidated for cart after adding item');

        // Return success response
        res.json({
            success: true,
            message: `Added ${qty} ${medicine.name} to cart`,
            cartCount: cart.items.reduce((sum, item) => sum + item.quantity, 0)
        });

    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// In cartController.js - update the getCart function
exports.getCart = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) return res.redirect('/patient/form?error=login_required');

        const cart = await Cart.findOne({ patientId: req.patientId })
            .populate('items.medicineId', 'name cost medicineID manufacturer')
            .lean();
        
        console.log('Cart found:', cart);
        
        let items = [];
        let total = 0;

        if (cart && cart.items) {
            // Filter out items where medicineId is null (deleted medicines)
            items = cart.items.filter(i => i.medicineId !== null && i.medicineId !== undefined);
            total = items.reduce((sum, i) => sum + (i.quantity * i.medicineId.cost), 0).toFixed(2);
            
            console.log('Filtered items:', items.length);
            console.log('Total:', total);
        }

        res.render('cart', { 
            cart: { items }, 
            total,
            title: 'Shopping Cart'
        });
    } catch (err) {
        console.error('Get Cart Error:', err);
        res.status(500).render('error', { message: 'Failed to load cart' });
    }
});

exports.updateItem = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) return res.status(401).json({ error: 'Login required' });
        const { medicineId, quantity } = req.body;
        const qty = parseInt(quantity);

        if (!mongoose.Types.ObjectId.isValid(medicineId) || isNaN(qty) || qty < 1)
            return res.status(400).json({ error: 'Invalid input' });

        const medicine = await Medicine.findById(medicineId).select('quantity');
        if (!medicine) return res.status(404).json({ error: 'Medicine not found' });
        if (qty > medicine.quantity) return res.status(400).json({ error: 'Insufficient stock', available: medicine.quantity });

        const cart = await Cart.findOne({ patientId: req.patientId });
        if (!cart) return res.status(404).json({ error: 'Cart not found' });

        const item = cart.items.find(i => i.medicineId.toString() === medicineId);
        if (!item) return res.status(404).json({ error: 'Item not in cart' });

        item.quantity = qty;
        await cart.save();

        // Invalidate cart cache
        const cacheKey = `cart:${req.patientId}:data`;
        await deleteCache(cacheKey);
        console.log('Cache invalidated for cart after updating item');

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

exports.removeItem = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) return res.status(401).json({ error: 'Login required' });
        const { medicineId } = req.params;

        const cart = await Cart.findOne({ patientId: req.patientId });
        if (!cart) return res.status(404).json({ error: 'Cart not found' });

        cart.items = cart.items.filter(i => i.medicineId.toString() !== medicineId);
        await cart.save();

        // Invalidate cart cache
        const cacheKey = `cart:${req.patientId}:data`;
        await deleteCache(cacheKey);
        console.log('Cache invalidated for cart after removing item');

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get cart as JSON API
exports.getCartAPI = asyncHandler(async (req, res) => {
    try {
        console.log('=== GET CART API ===');
        console.log('Patient ID:', req.patientId);
        
        if (!req.patientId) {
            return res.status(401).json({ 
                success: false, 
                error: 'Not logged in' 
            });
        }

        // Try cache first
        const cacheKey = `cart:${req.patientId}:data`;
        const cachedCart = await getCache(cacheKey);
        if (cachedCart) {
            console.log('✅ Cart from Redis');
            return res.json(cachedCart);
        }

        console.log('❌ Cart from DB');
        const cart = await Cart.findOne({ patientId: req.patientId })
            .populate('items.medicineId', 'name cost medicineID manufacturer')
            .lean();
        
        let items = [];
        let total = 0;

        if (cart && cart.items) {
            // Filter out items where medicineId is null (deleted medicines)
            items = cart.items.filter(i => i.medicineId !== null && i.medicineId !== undefined);
            total = items.reduce((sum, i) => sum + (i.quantity * i.medicineId.cost), 0);
            
            console.log('Cart items:', items.length);
            console.log('Cart total:', total);
        }

        const cartData = {
            success: true,
            cart: { items },
            total: parseFloat(total.toFixed(2))
        };

        // Cache result for 2 minutes (120 seconds)
        await setCache(cacheKey, cartData, 120);

        res.json(cartData);

    } catch (err) {
        console.error('Get Cart API Error:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load cart',
            message: err.message 
        });
    }
});

// Get cart item count
// In cartController.js - update getCartCount
// In cartController.js - update getCartCount with better error handling
exports.getCartCount = asyncHandler(async (req, res) => {
    try {
        console.log('=== GET CART COUNT ===');
        console.log('Session Patient ID:', req.patientId);
        
        if (!req.patientId) {
            console.log('No patient session, returning count 0');
            return res.json({ success: true, count: 0 });
        }

        const cart = await Cart.findOne({ patientId: req.patientId });
        console.log('Cart found for count:', cart);
        
        const count = cart ? cart.items.reduce((total, item) => total + item.quantity, 0) : 0;
        console.log('Cart count calculated:', count);

        res.json({ 
            success: true, 
            count: count 
        });
        
    } catch (err) {
        console.error('Get cart count error:', err);
        res.json({ success: false, count: 0, error: err.message });
    }
});

