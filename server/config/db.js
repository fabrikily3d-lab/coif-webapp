const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../salon.db'));

try {
    // Initialize tables using standard SQLite syntax
    db.exec(`
        CREATE TABLE IF NOT EXISTS Barbers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            photo_url TEXT,
            specialty TEXT,
            status TEXT DEFAULT 'active',
            shift_start TEXT DEFAULT '09:00',
            shift_end TEXT DEFAULT '20:00',
            is_active INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS Services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            duration INTEGER,
            category TEXT
        );

        CREATE TABLE IF NOT EXISTS Clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            preferences TEXT,
            no_show_count INTEGER DEFAULT 0,
            is_blocked INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS Bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_name TEXT NOT NULL,
            client_phone TEXT NOT NULL,
            client_id INTEGER,
            barber_id INTEGER,
            service_id INTEGER,
            type TEXT,
            status TEXT DEFAULT 'waiting',
            scheduled_time TEXT,
            position INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES Clients(id),
            FOREIGN KEY (barber_id) REFERENCES Barbers(id),
            FOREIGN KEY (service_id) REFERENCES Services(id)
        );

        CREATE TABLE IF NOT EXISTS Subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER,
            endpoint TEXT UNIQUE,
            keys TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
} catch (err) {
    console.error('CRITICAL SCHEMA ERROR:', err.message);
}

// Migration for existing databases
try {
    const tableInfo = db.prepare("PRAGMA table_info(Barbers)").all();
    const hasUsername = tableInfo.some(c => c.name === 'username');

    if (!hasUsername) {
        console.log('Migrating Barbers table...');
        db.exec("ALTER TABLE Barbers ADD COLUMN username TEXT DEFAULT 'miloud'");
        db.exec("ALTER TABLE Barbers ADD COLUMN password TEXT DEFAULT '1234'");
        // Update default rows to have unique usernames if needed, or just leave default
        // Since we default to 'miloud', uniqueness constraint might fail if multiple rows. 
        // But for dev env this is okay as likely only 1 barber exists.
    }

    const bookingsInfo = db.prepare("PRAGMA table_info(Bookings)").all();
    const hasClientId = bookingsInfo.some(c => c.name === 'client_id');
    if (!hasClientId) {
        console.log('Migrating Bookings table...');
        db.exec("ALTER TABLE Bookings ADD COLUMN client_id INTEGER REFERENCES Clients(id)");
    }
} catch (err) {
    console.error('MIGRATION ERROR:', err.message);
}

// Seed initial data if empty
try {
    const barberCount = db.prepare('SELECT COUNT(*) as count FROM Barbers').get().count;
    if (barberCount === 0) {
        db.prepare('INSERT INTO Barbers (name, username, password, specialty, status) VALUES (?, ?, ?, ?, ?)').run('Miloud', 'miloud', '1234', 'Fade Master', 'active');

        const services = [
            ['Coupe normale', 400.00, 20, 'adult'],
            ['Coupe dégradé + barbe', 500.00, 30, 'adult'],
            ['Barbe et tour d\'oreille', 300.00, 15, 'adult'],
            ['Coupe enfants', 300.00, 15, 'child'],
            ['Coupe dégradé + plaques', 700.00, 35, 'adult'],
            ['Les plaques (seules)', 250.00, 10, 'adult'],
            ['Coupe dégradé + lissage', 1000.00, 35, 'adult'],
            ['Lissage (seul)', 700.00, 10, 'adult'],
            ['Coupe dégradé + kératine', 3000.00, 60, 'adult'],
            ['Kératine (seule)', 2600.00, 30, 'adult'],
            ['Nettoyage de peau', 700.00, 30, 'adult']
        ];

        const insertService = db.prepare('INSERT INTO Services (name, price, duration, category) VALUES (?, ?, ?, ?)');
        for (const s of services) {
            insertService.run(...s);
        }
        console.log('Seeded initial data.');
    }
} catch (err) {
    console.error('SEEDING ERROR:', err.message);
}

module.exports = db;
