const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Get customer profile
router.get('/me', auth, (req, res) => {
    // In production, fetch from Firebase
    res.json({
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        type: 'customer',
        profile: req.user.profile || {}
    });
});

// Update customer profile
router.put('/me', auth, (req, res) => {
    const { vehicleYear, vehicleMake, vehicleModel, engineSize, oilType } = req.body;

    // In production, update Firebase
    res.json({
        message: 'Profile updated',
        profile: { vehicleYear, vehicleMake, vehicleModel, engineSize, oilType }
    });
});

// Get customer's booking history
router.get('/bookings', auth, (req, res) => {
    // In production, fetch from Firestore
    res.json({
        bookings: [
            {
                id: 'booking_1',
                shopId: 'shop_1',
                shopName: "Mike's Auto Repair",
                date: '2026-08-10T14:30:00Z',
                status: 'completed',
                price: 89,
                oilType: 'synthetic_blend'
            }
        ]
    });
});

module.exports = router;
