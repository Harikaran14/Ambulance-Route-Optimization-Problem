import { useState, useEffect } from "react";
import Dispatcher from "./Dispatcher";
import DriverView from './DriverView';
import DriverStandby from "./DriverStandby";
import Admin from "./Admin";
import { socket } from './socket'; // <-- 1. Import the socket

import 'leaflet/dist/leaflet.css'; 
import './style.css'; 

import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function App() {
    const [path, setPath] = useState(window.location.pathname);

    useEffect(() => {
        const onLocationChange = () => { setPath(window.location.pathname); };
        window.addEventListener('popstate', onLocationChange);
        return () => window.removeEventListener('popstate', onLocationChange);
    }, []);

    // --- 2. ADD THIS ENTIRE useEffect BLOCK ---
    // This connects the socket when the app mounts
    // and disconnects it when it unmounts.
    useEffect(() => {
        // Connect to the socket server
        socket.connect();

        // Optional: Log connection events
        socket.on('connect', () => {
            console.log('Socket.IO connected');
        });

        socket.on('disconnect', () => {
            console.log('Socket.IO disconnected');
        });

        // Cleanup on component unmount
        return () => {
            socket.disconnect();
            socket.off('connect');
            socket.off('disconnect');
        };
    }, []); // The empty array ensures this runs only once

    
    // Admin route
    if (path.startsWith('/admin')) { return <Admin />; }

    // Standby page for drivers waiting for a job
    if (path.startsWith('/driver-standby')) { return <DriverStandby />; }
    
    // Live navigation view for a specific dispatch
    if (path.startsWith('/driver/')) {
        const dispatchId = path.split('/')[2];
        if (dispatchId) { return <DriverView dispatchId={dispatchId} />; }
        return <div>Invalid Driver URL. Dispatch ID is missing.</div>;
    }
    
    // Default is the dispatcher dashboard
    return <Dispatcher />;
}
