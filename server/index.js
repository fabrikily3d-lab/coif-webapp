const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Attach socket.io to request
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.send('Salon Management API is running');
});

// Socket.io connection
require('./services/socket')(io);

// Cron Jobs
require('./services/cron');

const PORT = process.env.PORT || 5000;

process.on('uncaughtException', (err) => {
    console.error('!!! UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('!!! UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
