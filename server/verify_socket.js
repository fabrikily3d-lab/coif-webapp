const io = require('socket.io-client');

const socket = io('http://localhost:5000');
const BARBER_ID = 1;

console.log('--- LISTENING FOR SOCKET EVENTS ---');

socket.on('connect', () => {
    console.log('✅ Connected to Socket.io server');
    socket.emit('join_queue_room', BARBER_ID);
    console.log(`📡 Joined room: queue_${BARBER_ID}`);
});

socket.on('refresh_queue', (data) => {
    console.log('⚡ EVENT RECEIVED: refresh_queue', data);
    if (data.barberId == BARBER_ID) {
        console.log('   ✅ Event is for our barber.');
    }
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected');
});

// Keep alive for 15 seconds then exit
setTimeout(() => {
    console.log('--- TEST FINISHED ---');
    process.exit(0);
}, 15000);
