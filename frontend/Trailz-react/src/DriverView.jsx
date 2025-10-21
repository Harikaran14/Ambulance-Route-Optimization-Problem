import { useState, useEffect, useRef } from 'react';
import { socket } from './socket';
import LeafletMap from './LeafletMap'; // --- NEW: Import the map component

export default function DriverView({ dispatchId }) {
    // --- MODIFIED STATE ---
    const [routeData, setRouteData] = useState(null); // Will store { driver_location, instructions, eta_s, ... }
    const [currentLeg, setCurrentLeg] = useState('to_patient');
    const [isCompleted, setIsCompleted] = useState(false);
    const watchIdRef = useRef(null);

    useEffect(() => {
        socket.emit('join_room', { dispatch_id: dispatchId });

        // --- MODIFIED: Handle new data object ---
        function onRouteUpdate(data) {
            setRouteData(data); // Store the entire route data object
        }

        function onDispatchCompleted(data) {
            alert(data.message);
            setIsCompleted(true);
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        }

        socket.on('route_update', onRouteUpdate);
        socket.on('dispatch_completed_notification', onDispatchCompleted);
        
        if (navigator.geolocation) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    socket.emit('location_update', {
                        dispatch_id: dispatchId,
                        lat: position.coords.latitude, lon: position.coords.longitude,
                    });
                },
                (err) => console.error("GPS watch error:", err),
                { enableHighAccuracy: true }
            );
        }

        return () => {
            socket.off('route_update', onRouteUpdate);
            socket.off('dispatch_completed_notification', onDispatchCompleted);
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [dispatchId]);
    
    const handlePickup = () => {
        setCurrentLeg('to_hospital');
        socket.emit('pickup_patient', { dispatch_id: dispatchId });
    };

    const handleMissionComplete = () => {
        if (window.confirm("Are you sure you have completed the drop-off at the hospital?")) {
            socket.emit('mission_complete', { dispatch_id: dispatchId });
        }
    };

    if (isCompleted) {
        // ... (This section is UNCHANGED) ...
        return (
            <div className="driver-container">
                <header className="driver-header"><h1>Dispatch {dispatchId}</h1></header>
                <main className="driver-main"><div className="completion-message">
                    <h2>Mission Complete</h2>
                    <p>This dispatch has been logged. You may now close this window.</p>
                </div></main>
            </div>
        )
    }

    // --- Get ETA and Instructions from routeData state ---
    const eta = routeData ? routeData.eta_s : null;
    const instructions = routeData ? routeData.instructions : [];

    return (
        <div className="driver-container">
            <header className="driver-header">
                <h1>Live Dispatch: {dispatchId}</h1>
                <div className="eta-display">
                    {/* --- MODIFIED: Read from state --- */}
                    <h2>ETA: {eta ? `${Math.round(eta / 60)} min` : 'N/A'}</h2>
                </div>
            </header>
            <main className="driver-main">
                {/* --- MODIFIED: Map Display Area --- */}
                <div id="driver-map-container" className="map-container">
                    {routeData ? (
                        <LeafletMap 
                            driverLocation={routeData.driver_location}
                            destinationLocation={routeData.destination_location}
                            destinationName={routeData.destination_name}
                            routePoints={routeData.route_points}
                        />
                    ) : (
                        <p>Waiting for initial route...</p>
                    )}
                </div>
                
                <div className="driver-actions">
                    {/* --- (This section is UNCHANGED) --- */}
                    {currentLeg === 'to_patient' && (<button onClick={handlePickup} className="action-button">Mark Patient Picked Up</button>)}
                    {currentLeg === 'to_hospital' && (<button onClick={handleMissionComplete} className="action-button complete-mission-btn">Mark Mission Complete</button>)}
                </div>
                
                <div className="instructions-container">
                    <h3>Live Directions</h3>
                    {/* --- MODIFIED: Read from state --- */}
                    <ul>{instructions.map((step, i) => <li key={i}>{step}</li>)}</ul>
                </div>
            </main>
        </div>
    );
}