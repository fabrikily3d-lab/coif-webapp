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

async function testWorkflow() {
    try {
        console.log('--- STARTING WORKFLOW TEST (NATIVE HTTP) ---');

        // 1. Create Appointment
        console.log('\nTesting Appointment Creation...');
        const appointmentRes = await request('POST', '/bookings', {
            client_name: "Test Appointment Native",
            client_phone: "0559998887",
            barber_id: 1,
            service_id: 1,
            type: "appointment",
            scheduled_time: new Date(Date.now() + 86400000).toISOString()
        });
        console.log('✅ Appointment Created:', appointmentRes);

        // 2. Create Queue Booking
        console.log('\nTesting Queue Joining...');
        const queueRes = await request('POST', '/bookings', {
            client_name: "Test Queue Native",
            client_phone: "0554445556",
            barber_id: 1,
            service_id: 2,
            type: "queue"
        });
        console.log('✅ Queue Booking Created:', queueRes);

        // 3. Verify in List
        console.log('\nVerifying Bookings in List...');
        const bookings = await request('GET', '/bookings');

        const appointment = bookings.find(b => b.id === appointmentRes.id);
        const queueItem = bookings.find(b => b.id === queueRes.id);

        if (appointment && appointment.type === 'appointment') {
            console.log('✅ Appointment found in list with correct type.');
        } else {
            console.error('❌ Appointment NOT found or incorrect type.');
        }

        if (queueItem && queueItem.type === 'queue') {
            console.log('✅ Queue item found in list with correct type.');
        } else {
            console.error('❌ Queue item NOT found or incorrect type.');
        }

        // 4. Test Barber Login
        console.log('\nTesting Barber Login...');
        try {
            const loginRes = await request('POST', '/auth/login', {
                username: 'miloud',
                password: '1234'
            });
            if (loginRes.success) {
                console.log('✅ Barber Login Successful.');
            } else {
                console.error('❌ Barber Login Failed (Success false).');
            }
        } catch (err) {
            console.error('❌ Barber Login Error:', err);
        }

        console.log('\n--- WORKFLOW TEST COMPLETE ---');

    } catch (err) {
        console.error('❌ CRITICAL TEST ERROR:', err);
    }
}

testWorkflow();
