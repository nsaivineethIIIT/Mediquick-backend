const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Medicine = require('../models/Medicine');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const asyncHandler = require('../middlewares/asyncHandler');
const { deleteCache, deleteCachePattern } = require('../utils/redisClient');

exports.getCheckout = asyncHandler(async (req, res) => {
    try {
        console.log('GET Checkout - Session ID:', req.patientId);
        
        if (!req.patientId) return res.redirect('/patient/form?error=login_required');

        const patient = await Patient.findById(req.patientId).select('addresses');
        console.log('Patient addresses:', patient?.addresses);
        
        const orderCount = await Order.countDocuments({ patientId: req.patientId });
        const isFirstTime = orderCount === 0;

        let isSingle = false, medicineId = null, quantity = null;
        if (req.query.type === 'single' && req.query.medicineId && req.query.quantity) {
            medicineId = req.query.medicineId;
            quantity = parseInt(req.query.quantity);
            if (mongoose.Types.ObjectId.isValid(medicineId) && quantity > 0) isSingle = true;
        }

        console.log('Checkout page rendered - isFirstTime:', isFirstTime, 'isSingle:', isSingle, 'addressCount:', patient?.addresses?.length || 0);

        res.render('checkout', {
            addresses: patient.addresses || [],
            isFirstTime,
            isSingle,
            medicineId,
            quantity,
            error: req.query.error
        });
    } catch (err) {
        console.error('GET Checkout Error:', err);
        res.status(500).render('error', { message: 'Server error' });
    }
});

exports.getCheckoutData = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const patient = await Patient.findById(req.patientId).select('addresses').lean();
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        res.json({ addresses: patient.addresses || [] });
    } catch (err) {
        console.error('getCheckoutData Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

exports.getSessionOrderDetails = asyncHandler(async (req, res) => {
    console.log('=== GET SESSION ORDER DETAILS ===');
    console.log('Patient ID:', req.patientId);
    console.log('Session exists:', !!req.session);
    console.log('Order details in session:', !!req.session?.orderDetails);
    
    if (!req.patientId) {
        return res.status(401).json({ error: 'Not authenticated', code: 'AUTH_REQUIRED' });
    }
    
    if (!req.session || !req.session.orderDetails) {
        return res.status(404).json({ 
            error: 'No pending order found in session.',
            code: 'NO_SESSION_ORDER'
        });
    }
    
    res.json({
        success: true,
        orderDetails: req.session.orderDetails
    });
});

exports.postCheckout = asyncHandler(async (req, res) => {
    try {
        console.log('POST Checkout - Body:', req.body);
        console.log('POST Checkout - Session ID:', req.patientId);

        if (!req.patientId) {
            console.log('No session ID - redirecting to login');
            return res.redirect('/patient/form?error=login_required');
        }

        const patient = await Patient.findById(req.patientId);
        let deliveryAddress;

        // Address selection or new
        if (req.body.selectedAddressId) {
            console.log('Using existing address:', req.body.selectedAddressId);
            const addr = patient.addresses.id(req.body.selectedAddressId);
            if (!addr) throw new Error('Invalid address');
            deliveryAddress = addr.toObject();
        } else {
            console.log('Creating new address');
            const { label, street, city, state, zip, country } = req.body;
            
            // Validate all fields
            if (!street || !city || !state || !zip || !country) {
                throw new Error('All address fields are required');
            }
            
            deliveryAddress = { 
                label: label || 'Home', 
                street: street.trim(), 
                city: city.trim(), 
                state: state.trim(), 
                zip: zip.trim(), 
                country: country.trim() 
            };
            
            patient.addresses.push({ 
                ...deliveryAddress, 
                isDefault: patient.addresses.length === 0 
            });
            await patient.save();
            console.log('New address saved');
        }

        // Get items
        let items = [];
        if (req.body.type === 'single') {
            console.log('Single order - Medicine:', req.body.medicineId, 'Quantity:', req.body.quantity);
            items.push({ 
                medicineId: req.body.medicineId, 
                quantity: parseInt(req.body.quantity) 
            }); 
        } else {
            console.log('Cart order');
            const cart = await Cart.findOne({ patientId: req.patientId }).populate('items.medicineId');
            if (!cart || cart.items.length === 0) throw new Error('Cart is empty');
            
            // Filter out items that might have been deleted from the Medicine collection
            const validCartItems = cart.items.filter(item => item.medicineId);
            console.log('Cart items:', validCartItems);
            
            // Check for expired medicines in cart
            const expiredMedicines = [];
            cart.items.forEach(item => {
                if (item.medicineId && new Date(item.medicineId.expiryDate) < new Date()) {
                    expiredMedicines.push(item.medicineId.name);
                }
            });

            if (expiredMedicines.length > 0) {
                throw new Error(`The following medicines are expired: ${expiredMedicines.join(', ')}. Please remove them from your cart.`);
            }

            items = validCartItems.map(i => ({ 
                medicineId: i.medicineId._id, 
                quantity: i.quantity,
                medicineName: i.medicineId.name 
            }));
        }

        console.log('Processing items:', items);

        const medicineIds = items.map(i => i.medicineId);
        const medicines = await Medicine.find({ _id: { $in: medicineIds } });

        console.log('Found medicines:', medicines.map(m => ({ name: m.name, quantity: m.quantity, expiry: m.expiryDate })));

        // Validate stock and expiry before processing orders
        const validationErrors = [];
        const validItems = [];

        for (const item of items) {
            // Normalize comparison by converting both ids to strings. item.medicineId may be an ObjectId
            // (when coming from populated cart) or a string (when single order). Use String() for safety.
            const itemMedIdStr = String(item.medicineId);
            const med = medicines.find(m => String(m._id) === itemMedIdStr);

            if (!med) {
                console.error('Medicine lookup failed for item:', { itemMedId: item.medicineId, itemMedIdStr, item });
                validationErrors.push(`Medicine "${item.medicineName || item.medicineId}" not found`);
                continue;
            }

            if (med.quantity < item.quantity) {
                validationErrors.push(`Only ${med.quantity} of "${med.name}" available`);
                continue;
            }

            if (new Date(med.expiryDate) < new Date()) {
                validationErrors.push(`"${med.name}" is expired (expiry date: ${new Date(med.expiryDate).toLocaleDateString()})`);
                continue;
            }

            // Only add valid items
            validItems.push({
                medicineId: med._id,
                medicineName: med.name,
                quantity: item.quantity,
                unitPrice: med.cost,
                total: med.cost * item.quantity,
                medicine: { image: med.image } // Include medicine image for display
            });
        }

        // If there are validation errors, throw them
        if (validationErrors.length > 0) {
            console.log('Validation errors:', validationErrors);
            throw new Error(validationErrors.join('. '));
        }

        // If no valid items left after validation
        if (validItems.length === 0) {
            throw new Error('No valid items available for order. Please check your cart.');
        }

        // Calculate total cost
        let totalCost = 0;
        validItems.forEach(item => {
            totalCost += item.total;
        });

        // Add delivery charges
        const deliveryCharge = 10; // ₹10 delivery charge
        const finalTotal = totalCost + deliveryCharge;

        console.log('Order calculated - Subtotal:', totalCost, 'Delivery:', deliveryCharge, 'Total:', finalTotal);

        // Store order details in session for order confirmation page
        req.session.orderDetails = {
            items: validItems,
            deliveryAddress: deliveryAddress,
            subtotal: totalCost,
            deliveryCharge: deliveryCharge,
            finalTotal: finalTotal,
            orderType: req.body.type
        };

        console.log('Session order details stored, redirecting to order-details');

        // Send a JSON response to the client, which will handle the redirect.
        res.json({
            success: true,
            redirectUrl: '/patient/order-details'
        });

    } catch (err) {
        console.error('POST Checkout Error:', err.message);
        console.error('Error stack:', err.stack);
        
        const url = req.body.type === 'single'
            ? `/patient/checkout?type=single&medicineId=${req.body.medicineId}&quantity=${req.body.quantity}`
            : '/patient/checkout';
        // Use proper separator depending on whether URL already has query params
        const sep = url.includes('?') ? '&' : '?';
        
        // Return JSON error for React frontend
        res.status(400).json({
            success: false,
            error: err.message,
            redirectUrl: `${url}${sep}error=${encodeURIComponent(err.message)}`
        });
    }
});

// Process payment and create actual orders
exports.processPayment = asyncHandler(async (req, res) => {
    try {
        console.log('=== PROCESS PAYMENT START ===');
        console.log('Patient ID:', req.patientId);
        console.log('Payment Method:', req.body.paymentMethod);
        
        if (!req.patientId) throw new Error('Login required');
        if (!req.session.orderDetails) throw new Error('No order details found');

        const { paymentMethod } = req.body;
        const orderDetails = req.session.orderDetails;
        
        console.log('Order Details Items:', orderDetails.items.length);
        console.log('Order Type:', orderDetails.orderType);

        // Process orders
        const orderPromises = orderDetails.items.map(async (item) => {
            const medicine = await Medicine.findById(item.medicineId);
            
            if (!medicine) {
                throw new Error(`Medicine not found: ${item.medicineId}`);
            }
            
            console.log(`Medicine: ${medicine.name}, Supplier ID: ${medicine.supplierId}`);
            
            // Calculate delivery charge per item proportionally
            const itemDeliveryCharge = (item.total / orderDetails.subtotal) * orderDetails.deliveryCharge;
            const itemFinalAmount = item.total + itemDeliveryCharge;
            
            // Create order with explicit status setting
            const order = new Order({
                medicineId: item.medicineId,
                patientId: req.patientId,
                supplierId: medicine.supplierId,
                quantity: item.quantity,
                totalCost: item.total,
                deliveryAddress: orderDetails.deliveryAddress,
                paymentMethod: paymentMethod,
                deliveryCharge: parseFloat(itemDeliveryCharge.toFixed(2)),
                finalAmount: parseFloat(itemFinalAmount.toFixed(2)),
                status: 'confirmed' // All successful payments result in confirmed orders
            });
            
            // Explicitly set status again to ensure it's not overridden
            order.status = 'confirmed';
            
            console.log(`Creating order - Medicine: ${item.medicineId}, Patient: ${req.patientId}, Supplier: ${medicine.supplierId}, Status: ${order.status}, Payment: ${paymentMethod}`);

            // Update medicine stock
            await Medicine.updateOne(
                { _id: item.medicineId }, 
                { $inc: { quantity: -item.quantity } }
            );

            const savedOrder = await order.save();
            console.log(`✓ Order saved - ID: ${savedOrder._id}, Status: ${savedOrder.status}, Supplier: ${savedOrder.supplierId}`);
            return savedOrder;
        });

        const orders = await Promise.all(orderPromises);
        console.log(`Total orders created: ${orders.length}`);

        // Clear cart if not single order
        if (orderDetails.orderType !== 'single') {
            await Cart.updateOne(
                { patientId: req.patientId }, 
                { $set: { items: [] } }
            );
            console.log('Cart cleared');
        }

        // Clear session order details
        req.session.orderDetails = null;
        
        console.log('=== PROCESS PAYMENT SUCCESS ===');

        res.json({ 
            success: true, 
            message: 'Order placed successfully!',
            orders: orders.map(order => order._id)
        });

    } catch (err) {
        console.error('=== PROCESS PAYMENT ERROR ===');
        console.error('Payment processing error:', err.message);
        console.error('Stack:', err.stack);
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Get order details page
exports.getOrderDetails = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.redirect('/patient/form?error=login_required');
        }

        if (!req.session.orderDetails) {
            return res.redirect('/patient/order-medicines');
        }

        res.render('order_details', {
            orderDetails: req.session.orderDetails,
            title: 'Order Details'
        });
    } catch (err) {
        console.error('Order details error:', err.message);
        res.redirect('/patient/order-medicines');
    }
});

// Get payment page
exports.getPaymentPage = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.redirect('/patient/form?error=login_required');
        }

        if (!req.session.orderDetails) {
            return res.redirect('/patient/order-medicines');
        }

        res.render('payment', {
            orderDetails: req.session.orderDetails,
            title: 'Payment'
        });
    } catch (err) {
        console.error('Payment page error:', err.message);
        res.redirect('/patient/order-medicines');
    }
});

// Get order success page
exports.getOrderSuccess = asyncHandler(async (req, res) => {
    try {
        if (!req.patientId) {
            return res.redirect('/patient/form?error=login_required');
        }

        res.render('order_success', {
            paymentMethod: req.query.paymentMethod || 'cod',
            title: 'Order Successful'
        });
    } catch (err) {
        console.error('Order success error:', err.message);
        res.redirect('/patient/dashboard');
    }
});