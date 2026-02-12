module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected to real-time sync:', socket.id);

        // Queue update channel
        socket.on('join_queue_room', (barberId) => {
            socket.join(`queue_${barberId}`);
            console.log(`Socket ${socket.id} joined room queue_${barberId}`);
        });

        socket.on('queue_update', (data) => {
            // data: { barberId, type: 'join' | 'leave' | 'move' }
            io.to(`queue_${data.barberId}`).emit('refresh_queue', data);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected from sync');
        });
    });
};
