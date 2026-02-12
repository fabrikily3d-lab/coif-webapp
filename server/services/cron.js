const cron = require('node-cron');
const notificationService = require('./notification');

// Schedule tasks to be run on the server.
cron.schedule('* * * * *', function () {
    console.log('⏳ Running Cron: Checking Appointments for Reminders...');
    notificationService.checkAppointments();
});
