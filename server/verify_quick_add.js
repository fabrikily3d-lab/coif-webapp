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

async function testQuickAdd() {
    try {
        console.log('--- TESTING QUICK ADD PAYLOAD ---');

        // Simulate selection from dropdown (values are strings in HTML)
        const walkInServiceId = "2"; // Simulate "Coupe + Barbe"

        console.log('Sending Walk-in with Service ID as string:', walkInServiceId);

        const res = await request('POST', '/bookings', {
            client_name: "Test WalkIn Service",
            client_phone: "0558887776",
            barber_id: 1,
            service_id: walkInServiceId, // Passing as string to test type coercion
            type: 'queue',
            scheduled_time: null
        });

        console.log('✅ Walk-in Created:', res);

        // Verify it was saved
        const bookings = await request('GET', '/bookings');
        const saved = bookings.find(b => b.id === res.id);

        if (saved) {
            console.log(`✅ Verified in DB. Service Name: ${saved.service_name}`);
            if (saved.service_name) {
                console.log('✅ Service linkage working correctly.');
            } else {
                console.error('❌ Service linkage FAILED (name missing).');
            }
        } else {
            console.error('❌ Booking not found in DB.');
        }

    } catch (err) {
        console.error('❌ TEST FAILED:', err);
    }
}

testQuickAdd();
