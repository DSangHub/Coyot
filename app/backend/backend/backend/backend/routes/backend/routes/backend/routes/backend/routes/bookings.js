const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Joi = require('joi');

// Validation schema
const bookingSchema = Joi.object({
    shopId: Joi.string().required(),
    date: Joi.string().isoDate().required(),
    vehicleYear: Joi.number().required(),
    vehicleMake: Joi.string().required(),
    vehicleModel: Joi.string().required(),
    engineSize: Joi.number().required(),
    oilType: Joi.string().valid('conventional', 'synthetic_blend', 'full_synthetic').required(),
    price: Joi.number().required()
});

// Create booking
router.post('/', auth, async (req, res) => {
    try {
        const { error } = bookingSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { shopId, date, vehicleYear, vehicleMake, vehicleModel, engineSize, oilType, price } = req.body;

        // In production: 
        // 1. Check shop availability
        // 2. Create booking in Firestore
        // 3. Process payment with Stripe
        // 4. Send notifications

        const booking = {
            id: 'booking_' + Date.now(),
            customerId: req.user.id,
            shopId,
            date,
            vehicle: { year: vehicleYear, make: vehicleMake, model: vehicleModel },
            engineSize,
            oilType,
            price,
            status: 'confirmed',
            createdAt: new Date().toISOString(),
            checkInTime: null,
            completedAt: null
        };

        res.status(201).json({
            message: 'Booking confirmed',
            booking
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Booking failed' });
    }
});

// Get booking details
router.get('/:id', auth, (req, res) => {
    // In production, fetch from Firestore
    res.json({
        id: req.params.id,
        customerId: req.user.id,
        shopId: 'shop_1',
        shopName: "Mike's Auto Repair",
        date: '2026-08-10T14:30:00Z',
        status: 'confirmed',
        price: 89,
        vehicle: 'Toyota Camry 2020',
        oilType: 'synthetic_blend'
    });
});

// Cancel booking
router.delete('/:id', auth, (req, res) => {
    // In production: 
    // 1. Check if cancellation is within window
    // 2. Process refund if applicable
    // 3. Update booking status

    const hoursBefore = 2; // Full refund if >2 hours before
    const now = new Date();
    // Check logic would go here

    res.json({
        message: 'Booking cancelled',
        refund: { amount: 89, status: 'processed' }
    });
});

// Customer check-in
router.post('/:id/checkin', auth, (req, res) => {
    // In production:
    // 1. Verify customer is at shop location (geofence)
    // 2. Update booking status

    res.json({
        message: 'Checked in',
        checkInTime: new Date().toISOString()
    });
});

// Shop marks job complete
router.post('/:id/complete', auth, (req, res) => {
    // In production:
    // 1. Verify shop owns the booking
    // 2. Release payment to shop
    // 3. Send rating prompt to customer

    res.json({
        message: 'Job completed',
        completedAt: new Date().toISOString()
    });
});

module.exports = router;
