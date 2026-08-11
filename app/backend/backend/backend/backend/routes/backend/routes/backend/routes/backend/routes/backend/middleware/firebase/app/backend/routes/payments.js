const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const auth = require('../middleware/auth');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ===== CREATE PAYMENT INTENT =====
router.post('/create-intent', auth, async (req, res) => {
    try {
        const { amount, currency = 'usd', shopId, bookingId, customerEmail } = req.body;

        // Validate
        if (!amount || amount < 10) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: currency,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                customerId: req.user.id,
                shopId: shopId,
                bookingId: bookingId || 'pending',
                customerEmail: customerEmail || req.user.email
            },
            receipt_email: customerEmail || req.user.email,
            statement_descriptor: 'Coyot Oil Change',
            statement_descriptor_suffix: 'OIL',
        });

        // Store booking reference in database (Firebase)
        // await saveBooking({ ... });

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            bookingId: bookingId || 'pending'
        });

    } catch (error) {
        console.error('Stripe create intent error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== CONFIRM PAYMENT (Webhook) =====
// This endpoint is called by Stripe webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('✅ Payment succeeded:', paymentIntent.id);

            // Update booking status in Firebase
            // await updateBookingStatus(paymentIntent.metadata.bookingId, 'paid');

            // Notify shop
            // await sendShopNotification(paymentIntent.metadata.shopId);

            break;

        case 'payment_intent.payment_failed':
            console.log('❌ Payment failed:', event.data.object.id);
            // Handle failed payment
            break;

        case 'charge.refunded':
            console.log('🔄 Refund processed:', event.data.object.id);
            // Update booking status
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
});

// ===== GET PAYMENT STATUS =====
router.get('/status/:bookingId', auth, async (req, res) => {
    try {
        const { bookingId } = req.params;

        // In production, fetch from database
        res.json({
            bookingId,
            status: 'paid',
            amount: 89,
            currency: 'usd'
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== REFUND PAYMENT =====
router.post('/refund/:bookingId', auth, async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { reason } = req.body;

        // In production:
        // 1. Find payment intent ID from booking
        // 2. Create refund

        const refund = await stripe.refunds.create({
            payment_intent: 'pi_xxx', // Get from database
            reason: reason || 'requested_by_customer',
        });

        // Update booking status in Firebase
        // await updateBookingStatus(bookingId, 'refunded');

        res.json({
            message: 'Refund processed',
            refundId: refund.id,
            status: refund.status
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
