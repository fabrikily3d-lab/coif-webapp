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

async function testAdvancedQuickAdd() {
    try {
        console.log('--- STARTING ADVANCED QUICK ADD TEST ---');

        // 1. Fetch Services
        console.log('\n1. Fetching Services...');
        const services = await request('GET', '/services');
        console.log(`✅ Fetched ${services.length} services.`);
        services.forEach(s => console.log(`   - [${s.id}] ${s.name} (${s.price} DA)`));

        if (services.length === 0) {
            throw new Error('No services found to test.');
        }

        // 2. Create a Walk-in for EACH service
        console.log('\n2. Creating Walk-ins for each service...');
        const createdIds = [];

        for (const service of services) {
            const clientName = `Test WalkIn: ${service.name}`;
            console.log(`   > Adding client "${clientName}" for Service ID ${service.id}...`);

            const res = await request('POST', '/bookings', {
                client_name: clientName,
                client_phone: `055000000${service.id}`, // Unique phone
                barber_id: 1,
                service_id: service.id.toString(), // Simulate HTML value string
                type: 'queue',
                scheduled_time: null
            });
            createdIds.push({ id: res.id, expectedService: service.name, expectedPrice: service.price });
            console.log(`     ✅ Created Booking ID: ${res.id}`);
        }

        // 3. Verify in Database
        console.log('\n3. Verifying Data Integrity...');
        const allBookings = await request('GET', '/bookings');

        for (const item of createdIds) {
            const booking = allBookings.find(b => b.id === item.id);
            if (booking) {
                const isServiceMatch = booking.service_name === item.expectedService;
                const isPriceMatch = booking.service_price === item.expectedPrice;

                if (isServiceMatch && isPriceMatch) {
                    console.log(`   ✅ Booking ${item.id}: Service "${booking.service_name}" & Price ${booking.service_price} DA match.`);
                } else {
                    console.error(`   ❌ Booking ${item.id} MISMATCH!`);
                    console.error(`      Expected: ${item.expectedService} / ${item.expectedPrice}`);
                    console.error(`      Actual:   ${booking.service_name} / ${booking.service_price}`);
                }
            } else {
                console.error(`   ❌ Booking ${item.id} not found.`);
            }
        }

        console.log('\n--- TEST COMPLETE ---');

    } catch (err) {
        console.error('❌ CRITICAL TEST ERROR:', err);
    }
}

testAdvancedQuickAdd();
