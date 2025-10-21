import { useState, useEffect } from "react";
import { API_URL } from "./api";

const Loader = () => <div className="loader">Loading Dashboard...</div>;

export default function AdminDashboard({ onLogout }) {
    const [stats, setStats] = useState(null);
    const [fleet, setFleet] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [dispatches, setDispatches] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [statsRes, fleetRes, hospRes, dispRes] = await Promise.all([
                fetch(`${API_BASE}/admin/stats`),
                fetch(`${API_BASE}/admin/fleet-status`),
                fetch(`${API_BASE}/admin/hospital-status`),
                fetch(`${API_BASE}/admin/all-dispatches`)
            ]);
            if (!statsRes.ok || !fleetRes.ok || !hospRes.ok || !dispRes.ok) {
                throw new Error("One or more network responses were not ok.");
            }
            setStats(await statsRes.json());
            setFleet(await fleetRes.json());
            setHospitals(await hospRes.json());
            setDispatches(await dispRes.json());
        } catch (error) {
            console.error("Failed to fetch admin data:", error);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
    }, []);

    // Function to handle the reset button click
    const handleResetBeds = async () => {
        if (!window.confirm("Are you sure you want to reset all hospital bed counts to their default values?")) {
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/admin/hospitals/reset`, { method: "POST" });
            if (res.ok) {
                alert("Hospital availability has been reset.");
                // Re-fetch data to show the updated counts
                fetchData();
            } else {
                throw new Error("Failed to reset hospital availability.");
            }
        } catch (error) {
            alert(error.message);
        }
    };

    if (isLoading) { return <Loader />; }

    return (
        <div className="admin-container">
            <header className="admin-header">
                <h1>Operations Dashboard</h1>
                <button onClick={onLogout} className="logout-button">Logout</button>
            </header>
            
            {stats && <StatsCards stats={stats} />}
            
            <div className="status-tables">
                <FleetStatusTable fleet={fleet} />
                <HospitalStatusTable hospitals={hospitals} onReset={handleResetBeds} />
            </div>

            <DispatchLog dispatches={dispatches} />
        </div>
    );
}

// --- WIDGET COMPONENTS ---
const StatsCards = ({ stats }) => (
    <div className="stats-cards">
        <div className="stat-card"><h4>Total Dispatches</h4><p>{stats.totalDispatches}</p></div>
        <div className="stat-card"><h4>Ambulances Available</h4><p className="available">{stats.availableAmbulances}</p></div>
        <div className="stat-card"><h4>Ambulances En-Route</h4><p className="enroute">{stats.enrouteAmbulances}</p></div>
        <div className="stat-card"><h4>Avg. Response Time</h4><p>{stats.avgResponseTimeMins} min</p></div>
    </div>
);

const FleetStatusTable = ({ fleet }) => (
    <div className="status-widget">
        <h3>Fleet Status</h3>
        <table>
            <thead><tr><th>Unit</th><th>Location</th><th>Status</th></tr></thead>
            <tbody>
                {fleet.map(amb => (
                    <tr key={amb.unit}>
                        <td>{amb.unit}</td><td>{amb.location}</td>
                        <td><span className={`status-pill ${amb.status}`}>{amb.status}</span></td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const HospitalStatusTable = ({ hospitals, onReset }) => (
    <div className="status-widget">
        <div className="widget-header">
            <h3>Hospital Status</h3>
            <button onClick={onReset} className="util-button">Reset Availability</button>
        </div>
        <table>
            <thead><tr><th>Hospital</th><th>Specialties</th><th>Beds Available</th></tr></thead>
            <tbody>
                {hospitals.map(h => (
                    <tr key={h.name}>
                        <td>{h.name}</td><td>{h.specialties.join(', ')}</td>
                        <td className={h.availability <= 1 ? 'low-availability' : ''}>{h.availability}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const DispatchLog = ({ dispatches }) => (
    <div className="dispatch-log-widget">
        <h3>Complete Dispatch Log</h3>
        <div className="table-container">
            <table>
                <thead><tr><th>Date</th><th>Ambulance</th><th>Patient Location</th><th>Destination Hospital</th><th>Dispatcher</th></tr></thead>
                <tbody>
                    {dispatches.map((d, i) => (
                        <tr key={i}>
                            <td>{new Date(d.date).toLocaleString()}</td><td>{d.ambulance}</td>
                            <td>{d.patient_location}</td><td>{d.hospital}</td><td>{d.email}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);
