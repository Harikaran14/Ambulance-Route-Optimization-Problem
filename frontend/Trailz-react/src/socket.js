import { io } from 'socket.io-client';
import { SOCKET_URL } from './api'; // <-- IMPORT FROM NEW FILE

// Use the centralized URL
export const socket = io(SOCKET_URL, {
    autoConnect: false
});