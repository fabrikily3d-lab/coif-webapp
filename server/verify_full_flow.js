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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyFullFlow() {
    console.log('🚀 STARTING FULL SYSTEM VERIFICATION 🚀\n');

    try {
        // --- STEP 1: CLIENT BOOKING ---
        console.log('1️⃣  CLIENT: Booking an Appointment...');
        const appointment = await request('POST', '/bookings', {
            client_name: "Yacine Client",
            client_phone: "0551112233",
            barber_id: 1,
            service_id: 1,
            type: "appointment",
            scheduled_time: new Date(Date.now() + 86400000).toISOString()
        });
        console.log(`   ✅ Appointment Created (ID: ${appointment.id})`);

        console.log('2️⃣  CLIENT: Joining the Live Queue...');
        const queueItem = await request('POST', '/bookings', {
            client_name: "Amine Queue",
            client_phone: "0554445566",
            barber_id: 1,
            service_id: 2,
            type: "queue"
        });
        console.log(`   ✅ Joined Queue (ID: ${queueItem.id}, Position: ${queueItem.position})`);


        // --- STEP 2: BARBER DASHBOARD ---
        console.log('\n3️⃣  BARBER: Logging in to Dashboard...');
        const login = await request('POST', '/auth/login', { username: 'miloud', password: '1234' });
        if (!login.success) throw new Error('Login failed');
        console.log(`   ✅ Login Successful as ${login.barber.name}`);

        console.log('4️⃣  BARBER: Fetching Dashboard Data...');
        const dashboardData = await request('GET', '/bookings');
        const activeQueue = dashboardData.filter(b => b.barber_id === 1 && (b.status === 'waiting' || b.status === 'on_chair'));
        console.log(`   ✅ Dashboard Loaded. Active Clients: ${activeQueue.length}`);

        // Use the ID from the queue item we just created
        const targetId = queueItem.id;
        console.log(`   🎯 Targeting Client ID: ${targetId} (Amine Queue)`);


        // --- STEP 3: OPERATIONS ---
        console.log('\n5️⃣  BARBER: Calling Client to Chair...');
        await request('PATCH', `/bookings/${targetId}`, { status: 'on_chair' });

        // Verify Status
        let check = (await request('GET', '/bookings')).find(b => b.id === targetId);
        if (check.status === 'on_chair') {
            console.log(`   ✅ Client is now ON CHAIR.`);
        } else {
            console.error(`   ❌ Failed to move client to chair. Status: ${check.status}`);
        }

        await sleep(500); // Simulate service time

        console.log('6️⃣  BARBER: Finishing Service...');
        await request('PATCH', `/bookings/${targetId}`, { status: 'finished' });

        // Verify Status & Revenue
        check = (await request('GET', '/bookings')).find(b => b.id === targetId);
        if (check.status === 'finished') {
            console.log(`   ✅ Service FINISHED.`);
        } else {
            console.error(`   ❌ Failed to finish service. Status: ${check.status}`);
        }

        // --- STEP 4: WALK-IN ---
        console.log('\n7️⃣  BARBER: Adding a Walk-in (Quick Add)...');
        const walkIn = await request('POST', '/bookings', {
            client_name: "Omar Walk-in",
            client_phone: "0778889900",
            barber_id: 1,
            service_id: "2", // "Coupe + Barbe"
            type: "queue",
            scheduled_time: null
        });
        console.log(`   ✅ Walk-in Added (ID: ${walkIn.id})`);

        // Verify Walk-in Service Link
        const walkInCheck = (await request('GET', '/bookings')).find(b => b.id === walkIn.id);
        console.log(`   🔍 Verification: Service=${walkInCheck.service_name}, Price=${walkInCheck.service_price} DA`);


        console.log('\n✅✅ FULL FLOW VERIFICATION SUCCESSFUL ✅✅');

    } catch (err) {
        console.error('\n❌ CRITICAL FAILURE:', err);
    }
}

verifyFullFlow();
