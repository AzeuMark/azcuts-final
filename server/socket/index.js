const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const logger = require('../utils/logger');
const { ROOMS } = require('./events');

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: env.CLIENT_ORIGIN, credentials: true },
  });

  // Handshake auth: the client sends its access token; we verify it and stash
  // the user on the socket. Rejected connections never join any room.
  io.use((socket, next) => {
    const raw =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '');
    if (!raw) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(raw, env.JWT_ACCESS_SECRET);
      socket.user = { id: payload.sub, role: payload.role };
      return next();
    } catch (err) {
      return next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.user;
    socket.join(ROOMS.user(id)); // personal room
    if (role === 'staff') socket.join(ROOMS.STAFF);
    if (role === 'admin') socket.join(ROOMS.ADMIN);

    logger.info(`Socket connected: user:${id} (${role})`);
    socket.on('disconnect', () => logger.info(`Socket disconnected: user:${id}`));
  });

  logger.info('Socket.io initialized');
  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
