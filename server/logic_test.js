const db = require('./config/db');

try {
    console.log('Testing Booking POST Logic...');

    const client_name = 'Test Client';
    const client_phone = '0550000000';
    const barber_id = 1;
    const service_id = 1;
    const type = 'queue';
    const scheduled_time = null;

    let position = null;
    if (type === 'queue') {
        process.stdout.write('Calculating position... ');
        const row = db.prepare("SELECT COUNT(*) as count FROM Bookings WHERE status = 'waiting' AND type = 'queue' AND barber_id = ?").get(barber_id);
        position = row.count + 1;
        console.log('Done. Position:', position);
    }

    process.stdout.write('Inserting booking... ');
    const info = db.prepare(
        'INSERT INTO Bookings (client_name, client_phone, barber_id, service_id, type, scheduled_time, position) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(client_name, client_phone, barber_id, service_id, type, scheduled_time, position);

    console.log('Success! Inserted ID:', info.lastInsertRowid);
    process.exit(0);
} catch (err) {
    console.log('FAILED');
    console.error('ERROR MESSAGE:', err.message);
    console.error('ERROR CODE:', err.code);
    process.exit(1);
}
