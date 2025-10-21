import { useState, useEffect } from "react";
import { API_URL } from "./api"; // Make sure your api.js file is in the same src folder
import { socket } from "./socket";
import LeafletMap from "./LeafletMap";

export default function AmbulanceDispatch({ email }) {
  const [patientLocation, setPatientLocation] = useState("Padappai, Chennai");
  const [patientCoords, setPatientCoords] = useState(null);
  const [specialty, setSpecialty] = useState("Trauma");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [activeDispatchId, setActiveDispatchId] = useState(null);
  const [routeData, setRouteData] = useState(null);

  useEffect(() => {
    if (!activeDispatchId) return;
    function onRouteUpdate(data) {
      if (data.dispatch_id === activeDispatchId) {
        setRouteData(data);
      }
    }
    function onDispatchCompleted(data) {
      if (data.dispatch_id === activeDispatchId) {
        setConfirmation(`Mission ${data.dispatch_id} completed. Ready for new dispatch.`);
        setActiveDispatchId(null);
        setRouteData(null);
        setPatientLocation("Padappai, Chennai");
        setSpecialty("Trauma");
        setPatientCoords(null);
        setError(null);
      }
    }
    socket.on('route_update', onRouteUpdate);
    socket.on('dispatch_completed_notification', onDispatchCompleted);
    return () => {
      socket.off('route_update', onRouteUpdate);
      socket.off('dispatch_completed_notification', onDispatchCompleted);
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
            setActiveDispatchId(data.dispatch_id);
            socket.emit('join_room', { dispatch_id: data.dispatch_id });
        } else {
            setError(data.error || "Failed to compute route");
        }
    } catch (err) {
        setError("Network error. Is the backend server running?");
    } finally {
        setIsLoading(false);
    }
  }

  const isFormDisabled = isLoading || activeDispatchId;

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
            {/* --- FIX: Removed invalid character after 'LeafletMap' --- */}
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
