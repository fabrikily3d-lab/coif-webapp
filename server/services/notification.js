const webpush = require('web-push');
const db = require('../config/db');

// VAPID Keys (In production, these should be in .env)
const publicVapidKey = 'BOXNhnfoL63FT3IJ4oAa0SLi-HmLMmFyezrOwMKA95kBGuCV3efkb4SmjI3FEAyd8jpQfqpxaG2XyfwxtN0eJzY';
const privateVapidKey = 'PhQxWrJOG4umuktSqhsOnQn008NbckqCpXUkOoSVygc';

webpush.setVapidDetails(
    'mailto:contact@lookatme.com',
    publicVapidKey,
    privateVapidKey
);

/**
 * Send a push notification to specific subscriptions
 * @param {Array} subscriptions - Array of subscription rows from DB
 * @param {Object} payload - Notification payload (title, body, url)
 */
const sendPush = (subscriptions, payload) => {
    subscriptions.forEach(sub => {
        const pushSubscription = {
            endpoint: sub.endpoint,
            keys: JSON.parse(sub.keys)
        };

        webpush.sendNotification(pushSubscription, JSON.stringify(payload))
            .catch(err => {
                console.error('Push Error:', err);
                if (err.statusCode === 410 || err.statusCode === 404) {
                    // Subscription expired or invalid, remove from DB
                    db.prepare('DELETE FROM Subscriptions WHERE id = ?').run(sub.id);
                }
            });
    });
};

/**
 * Notify clients about queue updates
 * @param {number} barberId 
 */
const notifyQueueUpdate = (barberId) => {
    try {
        // Get all active waiting bookings for this barber, ordered by position
        const queue = db.prepare("SELECT * FROM Bookings WHERE barber_id = ? AND status = 'waiting' AND type = 'queue' ORDER BY position ASC").all(barberId);

        queue.forEach((booking, index) => {
            const position = index + 1;

            // Only notify if we have a client_id (linked to a subscription)
            if (!booking.client_id) return;

            // Find subscription for this client
            const subs = db.prepare('SELECT * FROM Subscriptions WHERE client_id = ?').all(booking.client_id);
            if (subs.length === 0) return;

            let payload = null;

            if (position === 1) {
                payload = {
                    title: "C'est presque à vous !",
                    body: "Vous êtes le prochain. Merci de vous présenter au salon.",
                    icon: "/pwa-192x192.png",
                    url: "/"
                };
            } else if (position === 2) {
                payload = {
                    title: "Bientôt votre tour",
                    body: "Plus que 2 personnes avant vous. Préparez-vous !",
                    icon: "/pwa-192x192.png",
                    url: "/"
                };
            }

            if (payload) {
                sendPush(subs, payload);
            }
        });

    } catch (err) {
        console.error('Error in notifyQueueUpdate:', err);
    }
};

/**
 * Notify a specific client (e.g. when called to chair)
 */
const notifyClient = (clientId, title, body) => {
    try {
        const subs = db.prepare('SELECT * FROM Subscriptions WHERE client_id = ?').all(clientId);
        if (subs.length > 0) {
            sendPush(subs, { title, body, icon: "/pwa-192x192.png", url: "/" });
        }
    } catch (err) {
        console.error('Error in notifyClient:', err);
    }
};

/**
 * Run by Cron: Check for appointments starting in ~30 mins
 */
const checkAppointments = () => {
    try {
        // Find appointments scheduled between 29 and 31 minutes from now
        const now = new Date();
        const startWindow = new Date(now.getTime() + 29 * 60000).toISOString();
        const endWindow = new Date(now.getTime() + 31 * 60000).toISOString();

        // SQLite comparison on text strings works for ISO dates
        // We look for scheduled_time (ex: 2023-10-27T14:30:00) strictly
        // To be simpler, we can just fetch all pending appointments for today and filter in JS

        const today = now.toISOString().split('T')[0];
        const appointments = db.prepare(`
            SELECT b.*, s.name as service_name 
            FROM Bookings b 
            JOIN Services s ON b.service_id = s.id
            WHERE b.type = 'appointment' 
            AND b.status = 'waiting' 
            AND b.scheduled_time LIKE ?
        `).all(`${today}%`);

        appointments.forEach(appt => {
            if (!appt.scheduled_time) return;

            const apptTime = new Date(appt.scheduled_time);
            const diffMs = apptTime - now;
            const diffMins = Math.round(diffMs / 60000);

            if (diffMins === 30) {
                console.log(`🔔 Triggering Reminder for Booking ${appt.id} (Client ${appt.client_id})`);
                // Send Reminder
                notifyClient(appt.client_id, "Rappel RDV 📅", `Votre rendez-vous pour ${appt.service_name} est dans 30 minutes !`);
            }
        });

    } catch (err) {
        console.error('Cron Error:', err);
    }
};

module.exports = {
    publicVapidKey,
    sendPush,
    notifyQueueUpdate,
    notifyClient,
    checkAppointments
};
