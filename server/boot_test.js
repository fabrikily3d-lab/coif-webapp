try {
    console.log('Testing DB load...');
    const db = require('./config/db');
    console.log('DB loaded successfully.');

    console.log('Testing API routes load...');
    const apiRoutes = require('./routes/api');
    console.log('API routes loaded successfully.');

    process.exit(0);
} catch (err) {
    console.error('Test Failed:', err);
    process.exit(1);
}
