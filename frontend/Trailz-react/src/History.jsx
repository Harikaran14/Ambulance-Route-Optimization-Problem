import { useEffect, useState } from "react";
import { API_URL } from "./api";

export default function History({ email }) {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`${API_BASE}/history/${email}`);
        const data = await res.json();
        setHistory(data);
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHistory();
  }, [email]);

  if (isLoading) {
    return <p>Loading history...</p>;
  }

  return (
    <div className="history-container">
      <h2 className="history-title">Your Dispatch History</h2>
      {history.length === 0 ? (
        <p className="history-empty">No dispatches recorded yet.</p>
      ) : (
        <div className="history-list">
          {history.map((dispatch, i) => (
            <div key={i} className="history-card">
              <div className="history-card-date">
                {new Date(dispatch.date).toLocaleString()}
              </div>
              <div className="history-card-locations">
                <p><strong>Patient Location:</strong> {dispatch.patient_location}</p>
                <p><strong>Destination Hospital:</strong> {dispatch.hospital}</p>
              </div>
              <div className="history-card-details">
                <span><strong>Unit:</strong> {dispatch.ambulance}</span>
                <span>⏱ {dispatch.time_taken_mins} mins</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
