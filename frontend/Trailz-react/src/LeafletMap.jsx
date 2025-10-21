import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

// --- Import images directly from the 'src/assets' folder ---
import ambulanceIconUrl from './assets/icon-ambulance.png';
import patientIconUrl from './assets/icon-patient.png';
import hospitalIconUrl from './assets/icon-hospital.png';
import shadowUrl from './assets/marker-shadow.png';


// --- Define icons with new images and correct sizes/anchors ---
const ambulanceIcon = new L.Icon({
    iconUrl: ambulanceIconUrl,
    shadowUrl: shadowUrl,
    iconSize: [32, 32],    // Set a uniform size (width, height)
    iconAnchor: [16, 32],   // Point of the icon which will correspond to marker's location (bottom-middle)
    popupAnchor: [0, -32], // Point from which the popup should open
    shadowSize: [41, 41]    // Use the default shadow size
});

const patientIcon = new L.Icon({
    iconUrl: patientIconUrl,
    shadowUrl: shadowUrl,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    shadowSize: [41, 41]
});

const hospitalIcon = new L.Icon({
    iconUrl: hospitalIconUrl,
    shadowUrl: shadowUrl,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    shadowSize: [41, 41]
});


// This sub-component will automatically re-center the map
function RecenterMap({ driverLocation, destinationLocation }) {
    const map = useMap();
    useEffect(() => {
        if (driverLocation && destinationLocation) {
            const bounds = L.latLngBounds([driverLocation, destinationLocation]);
            map.fitBounds(bounds, { padding: [50, 50] }); // Add some padding
        }
    }, [driverLocation, destinationLocation, map]);
    return null;
}

export default function LeafletMap({ driverLocation, destinationLocation, destinationName, routePoints }) {
    if (!driverLocation || !destinationLocation) {
        return <p>Waiting for location data...</p>;
    }

    // Logic to select the correct destination icon (this is unchanged)
    const destinationIcon = destinationName === 'Patient' ? patientIcon : hospitalIcon;

    return (
        <MapContainer center={driverLocation} zoom={13} style={{ height: '100%', width: '100%' }}>
            
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* These <Marker> components now use your local icons */}
            <Marker position={driverLocation} icon={ambulanceIcon}>
                <Popup>Ambulance</Popup>
            </Marker>
            
            <Marker position={destinationLocation} icon={destinationIcon}>
                <Popup>{destinationName}</Popup>
            </Marker>
            
            {/* Route Line & RecenterMap are unchanged */}
            {routePoints && <Polyline pathOptions={{ color: 'blue' }} positions={routePoints} />}
            <RecenterMap driverLocation={driverLocation} destinationLocation={destinationLocation} />
        </MapContainer>
    );
}