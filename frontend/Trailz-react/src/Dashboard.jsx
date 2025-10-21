import { useState, useEffect } from "react";
import AmbulanceDispatch from "./AmbulanceDispatch";
import History from "./History";
import { socket } from './socket';

export default function Dashboard({ user, onLogout }) {
  const [view, setView] = useState("dispatch");
  const [liveETAs, setLiveETAs] = useState({});

  useEffect(() => {
    function onRouteUpdate(data) { setLiveETAs(p => ({ ...p, [data.dispatch_id]: data.eta_s })); }
    function onDispatchCompleted(data) {
        alert(data.message);
        setLiveETAs(p => { const n = { ...p }; delete n[data.dispatch_id]; return n; });
    }
    socket.on('route_update', onRouteUpdate);
    socket.on('dispatch_completed_notification', onDispatchCompleted);
    return () => {
        socket.off('route_update', onRouteUpdate);
        socket.off('dispatch_completed_notification', onDispatchCompleted);
    };
  }, []);

  return (
    <div className="container">
      <header className="dashboard-header">
        <h2>Ambulance Dispatch System</h2>
        <div className="user-info"><span>Welcome, {user.name}</span><button onClick={onLogout} className="logout-button">Logout</button></div>
      </header>
      <nav className="button-group">
        <button onClick={() => setView("dispatch")} className={view === 'dispatch' ? 'active' : ''}>Dispatch Center</button>
        <button onClick={() => setView("history")} className={view === 'history' ? 'active' : ''}>Dispatch History</button>
      </nav>
      {Object.keys(liveETAs).length > 0 && (
          <div className="live-eta-bar"><h4>Live Dispatches:</h4>
              {Object.entries(liveETAs).map(([id, eta]) => ( <div key={id} className="live-eta-item"><strong>{id}:</strong> {eta ? `${Math.round(eta / 60)} min ETA` : '...'}</div> ))}
          </div>
      )}
      <main>
        {view === "dispatch" && <AmbulanceDispatch email={user.email} />}
        {view === "history" && <History email={user.email} />}
      </main>
    </div>
  );
}