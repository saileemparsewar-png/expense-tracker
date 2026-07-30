import { io } from 'socket.io-client';

// Connect to the server (same origin in production, explicit in dev)
const socket = io(window.location.origin, {
  transports: ['websocket', 'polling'],
});

export default socket;
