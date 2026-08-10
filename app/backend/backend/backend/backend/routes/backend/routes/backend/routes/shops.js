const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Get shop profile
router.get('/me', auth, (req, res) => {
    if (req.user.type !== 'shop') {
        return res.status(403).json({ error: 'Not a shop account' });
    }

    res.json({
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        type: 'shop',
        profile: req.user.profile || {},
        status: 'available',
        rating: 4.8,
        reviews: 203
    });
});

// Update shop status (Available/Busy)
router.put('/status', auth, (req, res) => {
    if (req.user.type !== 'shop') {
        return res.status(403).json({ error: 'Not a shop account' });
    }

    const { status } = req.body;
    if (!['available', 'busy', 'limited'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    // In production, update Firestore
    res.json({
        message: `Status updated to ${status}`,
        status
    });
});

// Get shop's bookings
router.get('/bookings', auth, (req, res) => {
    if (req.user.type !== 'shop') {
        return res.status(403).json({ error: 'Not a shop account' });
    }

    res.json({
        bookings: [
            {
                id: 'booking_2',
                customerId: 'user_456',
                customerName: 'John D.',
                date: '2026-08-10T14:30:00Z',
                status: 'confirmed',
                price: 89,
                vehicle: 'Toyota Camry 2020',
                oilType: 'synthetic_blend'
            }
        ]
    });
});

// Get nearby shops (public)
router.get('/nearby', (req, res) => {
    const { lat, lng, radius = 5 } = req.query;

    // In production, query Firestore with geohash
    const mockShops = [
        {
            id: 'shop_1',
            name: "Mike's Auto Repair",
            address: "123 Main St",
            lat: 37.7749,
            lng: -122.4194,
            rating: 4.8,
            reviews: 203,
            status: 'available',
            baseLaborRate: 80,
            numBays: 3,
            occupiedBays: 1,
            hours: '8:00 AM - 6:00 PM',
            distance: 0.7
        }
    ];

    res.json({ shops: mockShops });
});

module.exports = router;
