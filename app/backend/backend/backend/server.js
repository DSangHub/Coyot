require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// ===== INIT =====
const app = express();
const PORT = process.env.PORT || 5000;

// ===== MIDDLEWARE =====
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// ===== ROUTES =====

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Coyot API',
        version: '1.0.0'
    });
});

// ===== AUTH ROUTES =====
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// ===== CUSTOMER ROUTES =====
const customerRoutes = require('./routes/customers');
app.use('/api/customers', customerRoutes);

// ===== SHOP ROUTES =====
const shopRoutes = require('./routes/shops');
app.use('/api/shops', shopRoutes);

// ===== BOOKING ROUTES =====
const bookingRoutes = require('./routes/bookings');
app.use('/api/bookings', bookingRoutes);

// ===== PRICE ESTIMATE =====
app.post('/api/estimate', (req, res) => {
    const { engineSize, oilType, shopLaborRate } = req.body;

    const oilPrices = {
        conventional: { base: 35, perL: 0 },
        synthetic_blend: { base: 50, perL: 2 },
        full_synthetic: { base: 65, perL: 3 }
    };

    let oilQty = 5;
    if (engineSize >= 5.0) oilQty = 7;
    else if (engineSize >= 3.5) oilQty = 6;
    else if (engineSize >= 2.5) oilQty = 5;
    else oilQty = 4.5;

    const oilPrice = oilPrices[oilType] || oilPrices.synthetic_blend;
    const oilCost = oilPrice.base + (oilPrice.perL * (oilQty - 4));
    const filterCost = 12;
    const disposalFee = 5;
    const laborCost = (shopLaborRate / 60) * 30;

    const total = Math.round(oilCost + filterCost + disposalFee + laborCost);

    res.json({
        total,
        breakdown: {
            oilCost: Math.round(oilCost),
            filterCost,
            disposalFee,
            laborCost: Math.round(laborCost),
            oilQty,
            oilType,
            engineSize
        },
        shopLaborRate
    });
});

// ===== GEO SEARCH =====
app.post('/api/shops/search', (req, res) => {
    const { lat, lng, radius = 5 } = req.body;

    // This would query Firestore with geohash
    // For demo, return mock shops
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
        },
        {
            id: 'shop_2',
            name: "Sarah's Garage",
            address: "456 Oak Ave",
            lat: 37.7829,
            lng: -122.4104,
            rating: 4.9,
            reviews: 156,
            status: 'available',
            baseLaborRate: 75,
            numBays: 2,
            occupiedBays: 0,
            hours: '7:30 AM - 5:30 PM',
            distance: 1.2
        }
    ];

    res.json({ shops: mockShops, total: mockShops.length });
});

// ===== 404 =====
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong' });
});

// ===== START =====
app.listen(PORT, () => {
    console.log(`🐺 Coyot API running on port ${PORT}`);
    console.log(`📱 Oil Change On Your Time`);
});
