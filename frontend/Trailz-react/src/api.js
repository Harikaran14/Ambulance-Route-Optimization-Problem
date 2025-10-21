// This file centralizes your API and Socket configuration
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const API_URL = API_BASE;
export const SOCKET_URL = API_BASE;