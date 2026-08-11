// ============================================================
// FIREBASE FIRESTORE — Coyot App
// ============================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    GeoPoint,
    addDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// ===== FIREBASE CONFIG =====
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "coyot-app.firebaseapp.com",
    projectId: "coyot-app",
    storageBucket: "coyot-app.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

// ===== INIT =====
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ===== AUTH FUNCTIONS =====
async function signUp(email, password, userData) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update profile
        if (userData.name) {
            await updateProfile(user, { displayName: userData.name });
        }

        // Save user data to Firestore
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            name: userData.name || 'User',
            type: userData.type || 'customer',
            profile: userData.profile || {},
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        // If customer, create customer profile
        if (userData.type === 'customer') {
            await setDoc(doc(db, 'customers', user.uid), {
                userId: user.uid,
                vehicles: [{
                    id: 'vehicle_1',
                    year: userData.profile?.vehicleYear || 2020,
                    make: userData.profile?.vehicleMake || 'Toyota',
                    model: userData.profile?.vehicleModel || 'Camry',
                    engineSize: parseFloat(userData.profile?.engineSize) || 2.5,
                    oilType: userData.profile?.oilType || 'synthetic_blend'
                }],
                defaultVehicle: 0,
                createdAt: serverTimestamp()
            });
        }

        // If shop, create shop profile
        if (userData.type === 'shop') {
            await setDoc(doc(db, 'shops', user.uid), {
                userId: user.uid,
                name: userData.profile?.shopName || 'Auto Repair Shop',
                address: userData.profile?.address || '',
                location: new GeoPoint(37.7749, -122.4194),
                numBays: parseInt(userData.profile?.numBays) || 3,
                laborRate: parseFloat(userData.profile?.laborRate) || 80,
                hours: userData.profile?.hours || '8:00 AM - 6:00 PM',
                status: 'available',
                rating: 0,
                reviews: 0,
                totalReviews: 0,
                createdAt: serverTimestamp()
            });
        }

        return { user, success: true };

    } catch (error) {
        console.error('Sign up error:', error);
        throw error;
    }
}

async function logIn(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { user: userCredential.user, success: true };
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

async function logOut() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

// ===== CUSTOMER FUNCTIONS =====
async function getCustomerProfile(uid) {
    try {
        const docRef = doc(db, 'customers', uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            return null;
        }
    } catch (error) {
        console.error('Get customer error:', error);
        throw error;
    }
}

async function updateCustomerProfile(uid, data) {
    try {
        const docRef = doc(db, 'customers', uid);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Update customer error:', error);
        throw error;
    }
}

async function addVehicle(uid, vehicle) {
    try {
        const docRef = doc(db, 'customers', uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const current = docSnap.data();
            const vehicles = current.vehicles || [];
            vehicles.push({
                id: 'vehicle_' + Date.now(),
                ...vehicle
            });

            await updateDoc(docRef, {
                vehicles: vehicles,
                updatedAt: serverTimestamp()
            });
        }

        return { success: true };
    } catch (error) {
        console.error('Add vehicle error:', error);
        throw error;
    }
}

// ===== SHOP FUNCTIONS =====
async function getShopProfile(uid) {
    try {
        const docRef = doc(db, 'shops', uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            return null;
        }
    } catch (error) {
        console.error('Get shop error:', error);
        throw error;
    }
}

async function updateShopStatus(uid, status) {
    try {
        const docRef = doc(db, 'shops', uid);
        await updateDoc(docRef, {
            status: status,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Update shop status error:', error);
        throw error;
    }
}

async function getNearbyShops(lat, lng, radius = 5) {
    try {
        // In production, use geohash for efficient queries
        // For now, get all shops and filter
        const shopsRef = collection(db, 'shops');
        const snapshot = await getDocs(shopsRef);

        const shops = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const shopLoc = data.location;
            if (shopLoc) {
                const distance = haversineDistance(
                    lat, lng,
                    shopLoc.latitude, shopLoc.longitude
                );
                if (distance <= radius) {
                    shops.push({
                        id: doc.id,
                        ...data,
                        distance: Math.round(distance * 10) / 10
                    });
                }
            }
        });

        return shops.sort((a, b) => a.distance - b.distance);

    } catch (error) {
        console.error('Get nearby shops error:', error);
        throw error;
    }
}

// ===== BOOKING FUNCTIONS =====
async function createBooking(bookingData) {
    try {
        const bookingRef = collection(db, 'bookings');
        const docRef = await addDoc(bookingRef, {
            ...bookingData,
            status: 'confirmed',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        return { id: docRef.id, ...bookingData };

    } catch (error) {
        console.error('Create booking error:', error);
        throw error;
    }
}

async function getCustomerBookings(uid) {
    try {
        const bookingsRef = collection(db, 'bookings');
        const q = query(
            bookingsRef,
            where('customerId', '==', uid),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const snapshot = await getDocs(q);
        const bookings = [];
        snapshot.forEach(doc => {
            bookings.push({ id: doc.id, ...doc.data() });
        });

        return bookings;

    } catch (error) {
        console.error('Get bookings error:', error);
        throw error;
    }
}

async function updateBookingStatus(bookingId, status) {
    try {
        const docRef = doc(db, 'bookings', bookingId);
       
