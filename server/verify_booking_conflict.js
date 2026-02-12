const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

function request(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject({ statusCode: res.statusCode, body: parsed });
                    }
                } catch (e) {
                    reject({ statusCode: res.statusCode, body: body, error: e });
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function verifyConflict() {
    console.log('🚀 TESTING DOUBLE BOOKING (CONFLICT) 🚀\n');

    const bookingTime = new Date(Date.now() + 172800000).toISOString().split('T')[0] + 'T10:00:00'; // Two days from now at 10:00
    console.log(`📅 Target Time: ${bookingTime}`);

    try {
        // Booking 1
        console.log('1️⃣  Creating First Booking...');
        const b1 = await request('POST', '/bookings', {
            client_name: "Client One",
            client_phone: "0551111111",
            barber_id: 1,
            service_id: 1,
            type: "appointment",
            scheduled_time: bookingTime
        });
        console.log(`   ✅ Booking 1 Created (ID: ${b1.id})`);

        // Booking 2 (Same Time, Same Barber)
        console.log('2️⃣  Creating Second Booking (Expect Conflict)...');
        const b2 = await request('POST', '/bookings', {
            client_name: "Client Two",
            client_phone: "0552222222",
            barber_id: 1, // Same barber
            service_id: 1,
            type: "appointment",
            scheduled_time: bookingTime // Same time
        });

        console.log(`   ⚠️  Booking 2 Attempted...`);

        if (b2 && b2.id) {
            console.log(`   ❌ FAILED: The system ALLOWED a double booking! (ID: ${b2.id})`);
        } else {
            // This block might not be reached if request rejects on 409, which is handled in catch
            console.log(`   ❓ Unexpected success without ID?`);
        }

    } catch (err) {
        if (err.statusCode === 409 || err.body?.error?.includes('overlap')) {
            console.log('   ✅ PASSED: The system properly blocked the conflict.');
            console.log(`   Error: ${err.body?.error}`);
        } else {
            console.error('   ❌ UNEXPECTED ERROR:', err);
        }
    }
}

verifyConflict();
