import { io } from 'socket.io-client';
import { API_BASE } from './api';

// Create a single socket instance for the entire app
export const socket = io(API_BASE);