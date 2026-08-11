// ============================================================
// STRIPE PAYMENT INTEGRATION — Coyot App
// ============================================================

// Initialize Stripe with publishable key
const stripe = Stripe('pk_test_YOUR_PUBLISHABLE_KEY'); // Replace with your key

let currentBookingIntent = null;

// ===== CREATE PAYMENT INTENT =====
async function createPaymentIntent(bookingData) {
    try {
        const response = await fetch('/api/payments/create-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                amount: bookingData.price,
                currency: 'usd',
                shopId: bookingData.shopId,
                bookingId: bookingData.bookingId,
                customerEmail: state.user?.email || 'guest@example.com'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Payment failed');
        }

        currentBookingIntent = data;
        return data;

    } catch (error) {
        console.error('Payment error:', error);
        showToast('Payment setup failed: ' + error.message, true);
        throw error;
    }
}

// ===== CONFIRM PAYMENT =====
async function confirmPayment(clientSecret, paymentMethodId = null) {
    try {
        const result = await stripe.confirmPayment({
            clientSecret: clientSecret,
            paymentMethod: paymentMethodId ? {
                paymentMethod: paymentMethodId
            } : undefined,
            confirmParams: {
                return_url: `${window.location.origin}/booking-confirmation`
            }
        });

        if (result.error) {
            throw new Error(result.error.message);
        }

        return result;

    } catch (error) {
        console.error('Payment confirmation error:', error);
        showToast('Payment failed: ' + error.message, true);
        throw error;
    }
}

// ===== CREATE PAYMENT ELEMENT =====
async function createPaymentElement(clientSecret, containerId) {
    const elements = stripe.elements({
        clientSecret: clientSecret,
        appearance: {
            theme: 'stripe',
            variables: {
                colorPrimary: '#F97316',
                colorBackground: '#FFFFFF',
                colorText: '#1E293B',
                fontFamily: 'Inter, sans-serif',
                borderRadius: '8px'
            }
        }
    });

    const paymentElement = elements.create('payment', {
        fields: {
            billingAddress: 'auto',
            phoneNumber: 'auto'
        }
    });

    paymentElement.mount(`#${containerId}`);
    return { elements, paymentElement };
}

// ===== PROCESS PAYMENT =====
async function processPayment(bookingData) {
    try {
        showToast('Processing payment...');

        // 1. Create payment intent
        const intent = await createPaymentIntent(bookingData);

        // 2. Show payment form
        showPaymentModal(intent.clientSecret, intent.bookingId);

        return intent;

    } catch (error) {
        console.error('Payment processing error:', error);
        showToast('Payment failed: ' + error.message, true);
        throw error;
    }
}

// ===== PAYMENT MODAL =====
function showPaymentModal(clientSecret, bookingId) {
    const modal = document.createElement('div');
    modal.id = 'paymentModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 20px;
    `;

    modal.innerHTML = `
        <div style="background:#FFFFFF; border-radius:16px; padding:32px; max-width:480px; width:100%; max-height:90vh; overflow-y:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="font-size:22px; font-weight:800; color:#1E3A5F; margin:0;">💳 Pay for Booking</h2>
                <button onclick="closePaymentModal()" style="background:none; border:none; font-size:24px; cursor:pointer; color:#94A3B8;">✕</button>
            </div>
            <div id="payment-element-container"></div>
            <button id="submitPayment" style="width:100%; padding:14px; background:#F97316; color:#FFFFFF; border:none; border-radius:10px; font-weight:700; font-size:16px; cursor:pointer; margin-top:16px; transition:all 0.2s;">
                Pay Now
            </button>
            <p style="text-align:center; color:#94A3B8; font-size:12px; margin-top:8px;">Your payment is secure and encrypted</p>
        </div>
    `;

    document.body.appendChild(modal);

    // Create payment element
    createPaymentElement(clientSecret, 'payment-element-container');

    // Handle submit
    document.getElementById('submitPayment').addEventListener('click', async () => {
        const btn = document.getElementById('submitPayment');
        btn.disabled = true;
        btn.textContent = 'Processing...';

        try {
            const result = await stripe.confirmPayment({
                clientSecret: clientSecret,
                confirmParams: {
                    return_url: `${window.location.origin}/booking-confirmation?bookingId=${bookingId}`
                }
            });

            if (result.error) {
                throw new Error(result.error.message);
            }

        } catch (error) {
            btn.disabled = false;
            btn.textContent = 'Pay Now';
            showToast(error.message, true);
        }
    });
}

// ===== CLOSE PAYMENT MODAL =====
function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.remove();
    }
}

// ===== BOOK WITH PAYMENT =====
async function bookWithPayment(shop, engineSize, oilType) {
    if (!state.isLoggedIn) {
        showToast('Please log in to book', true);
        document.getElementById('modalOverlay').classList.add('active');
        return;
    }

    const priceData = calculatePrice(shop, engineSize, oilType);

    const bookingData = {
        shopId: shop.id,
        shopName: shop.name,
        price: priceData.total,
        engineSize: engineSize,
        oilType: oilType,
        vehicleYear: document.getElementById('vehicleYear')?.value || '2020',
        vehicleMake: document.getElementById('vehicleMake')?.value || 'Toyota',
        vehicleModel: document.getElementById('vehicleModel')?.value || 'Camry',
        bookingId: 'booking_' + Date.now()
    };

    try {
        await processPayment(bookingData);
    } catch (error) {
        // Handle error
    }
}

// ===== EXPOSE FUNCTIONS =====
window.stripe = stripe;
window.processPayment = processPayment;
window.bookWithPayment = bookWithPayment;
window.closePaymentModal = closePaymentModal;
