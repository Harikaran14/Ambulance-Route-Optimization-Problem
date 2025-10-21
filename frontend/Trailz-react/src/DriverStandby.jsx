import { useState, useEffect } from "react";
import { socket } from './socket';

export default function DriverStandby() {
    const [unitId, setUnitId] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [newDispatch, setNewDispatch] = useState(null);

    useEffect(() => {
        if (isLoggedIn) {
            // --- MODIFICATION: Set up listener FIRST ---
            // This ensures we are listening *before* we join the room,
            // preventing a race condition where the server sends the
            // pending dispatch before the listener is active.
            socket.on('new_dispatch', (data) => {
                console.log("New dispatch received!", data);
                setNewDispatch(data);
            });
            
            // --- MODIFICATION: Join room SECOND ---
            // Now, join the specific room for this ambulance unit.
            // This emit will trigger the server-side check for a pending job.
            socket.emit('join_driver_standby_room', { unit_id: unitId });
        }
        
        return () => {
            // Cleanup listener on component unmount or re-render
            socket.off('new_dispatch');
        }
    }, [isLoggedIn, unitId]); // Dependencies remain correct

    const handleLogin = (e) => {
        e.preventDefault();
        if (unitId.trim()) {
            setIsLoggedIn(true);
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="auth-container">
                <form onSubmit={handleLogin}>
                    <h2>Driver Standby Login</h2>
                    <p>Enter your unit ID to wait for new dispatches.</p>
                    <input
                        placeholder="e.g., AMB-01"
                        value={unitId}
                        onChange={e => setUnitId(e.target.value.toUpperCase())}
                        required
                    />
                    <div className="button-group">
                        <button type="submit">Go On Standby</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="driver-container">
            <header className="driver-header">
                <h1>Unit: {unitId}</h1>
                <div className="eta-display">
                    <h2>Status: On Standby</h2>
                </div>
            </header>
            <main className="driver-main">
                {newDispatch ? (
                    <div className="new-dispatch-card">
                        <h3>New Dispatch!</h3>
                        <p><strong>To:</strong> {newDispatch.patient_location}</p>
                        <p><strong>ETA:</strong> {(newDispatch.eta_s / 60).toFixed(1)} minutes</p>
                        <a href={`/driver/${newDispatch.dispatch_id}`} className="action-button">
                            Accept & Start Navigation
                        </a>
                    </div>
                ) : (
                    <div className="standby-message">
                        <p>Waiting for a new dispatch...</p>
                    </div>
                )}
            </main>
        </div>
    );
}