const express = require('express');
const router = express.Router();
const db = require('../config/db');
const notificationService = require('../services/notification');

// --- BARBERS & TEAM ---
router.get('/barbers', (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM Barbers').all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/barbers/:id', (req, res) => {
    const { status, shift_start, shift_end, is_active } = req.body;
    try {
        const fields = [];
        const params = [];
        if (status !== undefined) { fields.push('status = ?'); params.push(status); }
        if (shift_start !== undefined) { fields.push('shift_start = ?'); params.push(shift_start); }
        if (shift_end !== undefined) { fields.push('shift_end = ?'); params.push(shift_end); }
        if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active); }

        if (fields.length > 0) {
            params.push(req.params.id);
            db.prepare(`UPDATE Barbers SET ${fields.join(', ')} WHERE id = ?`).run(...params);

            // Real-time update
            if (req.io) {
                req.io.to(`queue_${req.params.id}`).emit('refresh_queue', { barberId: req.params.id, type: 'status_change' });
            }
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- AUTH ---
router.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
    try {
        const barber = db.prepare('SELECT * FROM Barbers WHERE username = ? AND password = ?').get(username, password);
        if (barber) {
            res.json({ success: true, barber });
        } else {
            res.status(401).json({ error: 'Identifiants incorrects' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- NOTIFICATIONS ---
router.post('/subscribe', (req, res) => {
    const { subscription, clientId } = req.body;
    try {
        db.prepare('INSERT OR REPLACE INTO Subscriptions (client_id, endpoint, keys) VALUES (?, ?, ?)')
            .run(clientId || null, subscription.endpoint, JSON.stringify(subscription.keys));
        res.status(201).json({ success: true });
    } catch (err) {
        console.error('Subscription Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- QUEUE MANAGEMENT ---
router.post('/bookings/reorder', (req, res) => {
    const { id1, position1, id2, position2 } = req.body;
    try {
        const update = db.prepare('UPDATE Bookings SET position = ? WHERE id = ?');
        const transaction = db.transaction(() => {
            update.run(position1, id2); // Swap positions
            update.run(position2, id1);
        });
        transaction();

        // Fetch barber_id to notify room
        // Fetch barber_id to notify room
        const booking = db.prepare('SELECT barber_id FROM Bookings WHERE id = ?').get(id1);
        if (booking) {
            if (req.io) {
                req.io.to(`queue_${booking.barber_id}`).emit('refresh_queue', { barberId: booking.barber_id, type: 'reorder' });
            }
            notificationService.notifyQueueUpdate(booking.barber_id);
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SERVICES ---
router.get('/services', (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM Services').all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CLIENTS ---
router.get('/clients', (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM Clients ORDER BY name ASC').all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/clients/:id/history', (req, res) => {
    try {
        const rows = db.prepare(`
            SELECT b.*, s.name as service_name, s.price as service_price, ba.name as barber_name
            FROM Bookings b
            JOIN Services s ON b.service_id = s.id
            JOIN Barbers ba ON b.barber_id = ba.id
            WHERE b.client_id = ? OR b.client_phone = (SELECT phone FROM Clients WHERE id = ?)
            ORDER BY b.created_at DESC
        `).all(req.params.id, req.params.id);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.patch('/clients/:id', (req, res) => {
    const { preferences, no_show_count, is_blocked } = req.body;
    try {
        const fields = [];
        const params = [];
        if (preferences !== undefined) { fields.push('preferences = ?'); params.push(preferences); }
        if (no_show_count !== undefined) { fields.push('no_show_count = ?'); params.push(no_show_count); }
        if (is_blocked !== undefined) { fields.push('is_blocked = ?'); params.push(is_blocked); }

        if (fields.length > 0) {
            params.push(req.params.id);
            db.prepare(`UPDATE Clients SET ${fields.join(', ')} WHERE id = ?`).run(...params);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- BOOKINGS ---
router.get('/bookings', (req, res) => {
    try {
        const rows = db.prepare(`
            SELECT b.*, s.name as service_name, s.price as service_price, s.duration as service_duration
            FROM Bookings b
            JOIN Services s ON b.service_id = s.id
            ORDER BY b.created_at ASC
        `).all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/bookings', (req, res) => {
    const { client_name, client_phone, barber_id, service_id, type, scheduled_time } = req.body;
    try {
        // 1. Manage Client (Existing or New)
        let client = db.prepare('SELECT * FROM Clients WHERE phone = ?').get(client_phone);
        if (!client) {
            const info = db.prepare('INSERT INTO Clients (name, phone) VALUES (?, ?)').run(client_name, client_phone);
            client = { id: info.lastInsertRowid };
        } else if (client.is_blocked) {
            return res.status(403).json({ error: 'Ce client est bloqué pour non-présentation répétée.' });
        }

        // 2. Queue Position or Conflict Check
        let position = null;
        if (type === 'queue') {
            const row = db.prepare("SELECT COUNT(*) as count FROM Bookings WHERE status = 'waiting' AND type = 'queue' AND barber_id = ?").get(barber_id);
            position = row.count + 1;
        } else if (type === 'appointment') {
            // Check for conflict
            const conflict = db.prepare("SELECT id FROM Bookings WHERE barber_id = ? AND scheduled_time = ? AND status NOT IN ('cancelled', 'finished')").get(barber_id, scheduled_time);
            if (conflict) {
                return res.status(409).json({ error: 'Ce créneau est déjà réservé.' });
            }
        }

        // 3. Insert Booking
        const info = db.prepare(
            'INSERT INTO Bookings (client_name, client_phone, client_id, barber_id, service_id, type, scheduled_time, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(client_name, client_phone, client.id, barber_id, service_id, type, scheduled_time, position);

        res.status(201).json({ id: info.lastInsertRowid, position, clientId: client.id });

        // Real-time update
        // Real-time update
        if (req.io) {
            req.io.to(`queue_${barber_id}`).emit('refresh_queue', { barberId: barber_id, type: 'join' });
        }
        notificationService.notifyQueueUpdate(barber_id);
    } catch (err) {
        console.error('API Error /bookings POST:', err);
        res.status(500).json({ error: err.message });
    }
});

router.patch('/bookings/:id', (req, res) => {
    const { status, position } = req.body;
    try {
        if (position !== undefined) {
            db.prepare('UPDATE Bookings SET status = ?, position = ? WHERE id = ?').run(status, position, req.params.id);
        } else {
            db.prepare('UPDATE Bookings SET status = ? WHERE id = ?').run(status, req.params.id);
        }

        // Real-time update
        // Real-time update
        const booking = db.prepare('SELECT * FROM Bookings WHERE id = ?').get(req.params.id);
        if (booking) {
            if (req.io) {
                req.io.to(`queue_${booking.barber_id}`).emit('refresh_queue', { barberId: booking.barber_id, type: 'status_update' });
            }
            // Trigger Push Notifications
            notificationService.notifyQueueUpdate(booking.barber_id);

            // Specific alert if status is 'on_chair'
            if (status === 'on_chair' && booking.client_id) {
                const barberName = db.prepare('SELECT name FROM Barbers WHERE id = ?').get(booking.barber_id)?.name || 'Votre barbier';
                notificationService.notifyClient(booking.client_id, "C'est votre tour ! ✂️", `${barberName} vous attend sur sa chaise.`);
            }
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ANALYTICS ---
router.get('/analytics/summary', (req, res) => {
    try {
        const totalRevenue = db.prepare(`
            SELECT SUM(s.price) as total 
            FROM Bookings b 
            JOIN Services s ON b.service_id = s.id 
            WHERE b.status = 'finished'
        `).get().total || 0;

        const dailyRevenue = db.prepare(`
            SELECT SUM(s.price) as total 
            FROM Bookings b 
            JOIN Services s ON b.service_id = s.id 
            WHERE b.status = 'finished' AND date(b.created_at) = date('now')
        `).get().total || 0;

        const barberPerformance = db.prepare(`
            SELECT ba.name, COUNT(b.id) as count, SUM(s.price) as revenue
            FROM Barbers ba
            LEFT JOIN Bookings b ON ba.id = b.barber_id AND b.status = 'finished'
            LEFT JOIN Services s ON b.service_id = s.id
            GROUP BY ba.id
        `).all();

        res.json({ totalRevenue, dailyRevenue, barberPerformance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/analytics/peak-hours', (req, res) => {
    try {
        const rows = db.prepare(`
            SELECT strftime('%H', created_at) as hour, COUNT(*) as count
            FROM Bookings
            GROUP BY hour
            ORDER BY hour ASC
        `).all();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
