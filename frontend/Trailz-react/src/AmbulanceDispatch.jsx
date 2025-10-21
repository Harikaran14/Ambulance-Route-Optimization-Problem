import { useState, useEffect } from "react";
import { API_URL } from "./api";
import { socket } from "./socket";
import LeafletMap from "./LeafletMap";

// A key for localStorage
const STORAGE_KEY = 'activeDispatch';

export default function AmbulanceDispatch({ email }) {
  const [patientLocation, setPatientLocation] = useState("Padappai, Chennai");
  const [patientCoords, setPatientCoords] = useState(null);
  const [specialty, setSpecialty] = useState("Trauma");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [activeDispatchId, setActiveDispatchId] = useState(null);
  const [routeData, setRouteData] = useState(null);

  // --- ADD LOG 1 ---
  console.log('Component Init - activeDispatchId:', activeDispatchId);

  // --- useEffect to load state from localStorage on mount ---
  useEffect(() => {
    // --- ADD LOG 2 ---
    const savedDispatchJson = localStorage.getItem(STORAGE_KEY);
    console.log('Effect 1 (Mount) - Checking localStorage:', savedDispatchJson);

    if (savedDispatchJson) {
      try {
        const savedDispatch = JSON.parse(savedDispatchJson);
        // --- ADD LOG 3 ---
        console.log('Effect 1 (Mount) - Found saved dispatch:', savedDispatch);
        setActiveDispatchId(savedDispatch.dispatch_id);
        setPatientLocation(savedDispatch.patientLocation);
        setSpecialty(savedDispatch.specialty);

        // IMPORTANT: Re-join the socket room to get live updates
        socket.emit('join_room', { dispatch_id: savedDispatch.dispatch_id });
      } catch (e) {
        console.error("Failed to parse saved dispatch", e);
        localStorage.removeItem(STORAGE_KEY);
      }
    } else {
        // --- ADD LOG 4 ---
        console.log('Effect 1 (Mount) - No saved dispatch found.');
    }
  }, []); // Empty array means this runs only once on mount

  // --- useEffect that depends on activeDispatchId ---
  useEffect(() => {
    // --- ADD LOG 5 ---
    console.log('Effect 2 (activeDispatchId Change) - ID:', activeDispatchId);

    if (!activeDispatchId) {
        console.log('Effect 2 - Bailing out, no active ID. Listeners not attached.');
        // Ensure listeners are removed if ID becomes null
        socket.off('route_update');
        socket.off('dispatch_completed_notification');
        socket.off('dispatch_cancelled_by_admin');
        return; // No need to set up listeners if no dispatch is active
    }
    
    console.log('Effect 2 - Active ID detected, attaching listeners for:', activeDispatchId);

    function onRouteUpdate(data) {
      if (data.dispatch_id === activeDispatchId) {
        console.log('Socket received: route_update for', data.dispatch_id);
        setRouteData(data);
      }
    }

    function onDispatchCompleted(data) {
      if (data.dispatch_id === activeDispatchId) {
        console.log('Socket received: dispatch_completed_notification for', data.dispatch_id);
        setConfirmation(`Mission ${data.dispatch_id} completed. Ready for new dispatch.`);
        setActiveDispatchId(null);
        setRouteData(null);
        setPatientLocation("Padappai, Chennai");
        setSpecialty("Trauma");
        setPatientCoords(null);
        setError(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    function onDispatchCancelled(data) {
      if (data.dispatch_id === activeDispatchId) {
        console.log('Socket received: dispatch_cancelled_by_admin for', data.dispatch_id);
        setError(data.message);
        setConfirmation(null);
        setActiveDispatchId(null);
        setRouteData(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // Attach listeners
    socket.on('route_update', onRouteUpdate);
    socket.on('dispatch_completed_notification', onDispatchCompleted);
    socket.on('dispatch_cancelled_by_admin', onDispatchCancelled);

    // Cleanup function: remove listeners when component unmounts OR activeDispatchId changes
    return () => {
      console.log('Effect 2 Cleanup - Removing listeners for ID:', activeDispatchId);
      socket.off('route_update', onRouteUpdate);
      socket.off('dispatch_completed_notification', onDispatchCompleted);
      socket.off('dispatch_cancelled_by_admin', onDispatchCancelled);
    };
  }, [activeDispatchId]);

  function handleGetLocation() {
    setIsLoading(true);
    setError(null);
    setConfirmation(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setPatientCoords({ lat: latitude, lon: longitude });
          setPatientLocation(`GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          setIsLoading(false);
        }, (err) => { setError(`Could not get location: ${err.message}`); setIsLoading(false); }
      );
    } else { setError("Geolocation is not supported."); setIsLoading(false); }
  }
  
  async function handleDispatch() {
    setIsLoading(true);
    setError(null);
    setConfirmation(null);
    setRouteData(null);
    
    const body = {
        email, specialty,
        ...(patientCoords ? { patient_lat: patientCoords.lat, patient_lon: patientCoords.lon } : { patient_location: patientLocation })
    };

    try {
        const res = await fetch(`${API_URL}/find-best-route`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        const data = await res.json();
        if (res.ok) {
            setConfirmation(`Dispatch sent successfully to unit ${data.ambulance_unit}. Waiting for map...`);
            // This will trigger the second useEffect
            setActiveDispatchId(data.dispatch_id); 
            socket.emit('join_room', { dispatch_id: data.dispatch_id });

            const dispatchToSave = {
              dispatch_id: data.dispatch_id,
              patientLocation,
              specialty,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dispatchToSave));
            // --- ADD LOG 6 ---
            console.log('handleDispatch - Dispatch successful, saving:', dispatchToSave);

        } else {
            setError(data.error || "Failed to compute route");
             // --- ADD LOG 6.1 ---
            console.error('handleDispatch - Dispatch failed:', data.error);
        }
    } catch (err) {
        setError("Network error. Is the backend server running?");
         // --- ADD LOG 6.2 ---
        console.error('handleDispatch - Network error:', err);
    } finally {
        setIsLoading(false);
    }
  }

  const isFormDisabled = isLoading || (activeDispatchId !== null); // More explicit check

  // --- ADD LOG 7 ---
  console.log('Rendering - activeDispatchId:', activeDispatchId, '| isLoading:', isLoading, '| isFormDisabled:', isFormDisabled);

  return (
    <div className="trip-container">
      <h3>New Emergency Dispatch</h3>
      <div className="form-section">
        <div className="form-group">
          <label>Patient Location:</label>
          <input type="text" value={patientLocation} onChange={(e) => { setPatientLocation(e.target.value); setPatientCoords(null); }} disabled={isFormDisabled} />
          <button onClick={handleGetLocation} disabled={isFormDisabled} className="util-button">Use Current Location</button>
        </div>
        <div className="form-group">
          <label>Required Medical Specialty:</label>
          <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} disabled={isFormDisabled}>
            <option value="Trauma">Trauma</option><option value="Cardiac">Cardiac</option><option value="General">General</option>
          </select>
        </div>
        <button onClick={handleDispatch} disabled={isFormDisabled}>
            {isLoading ? "Calculating..." : (activeDispatchId ? "Tracking Active Dispatch..." : "Find Best Route & Dispatch")}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {confirmation && <div className="confirmation-message">{confirmation}</div>}

      {routeData && (
        <div className="dispatch-map-container">
          <h4>Tracking Dispatch: {activeDispatchId}</h4>
          <div id="dispatcher-map" className="map-container">
            <LeafletMap 
              driverLocation={routeData.driver_location}
              destinationLocation={routeData.destination_location}
              destinationName={routeData.destination_name}
              routePoints={routeData.route_points}
            />
          </div>
        </div>
      )}
    </div>
  );
}
