import { useState } from "react";
import { API_BASE } from "./api";

export default function AdminLogin({ onLogin }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");

  async function handleAdminLogin(e) {
    e.preventDefault();
    setError("");
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode }),
    });
    if (res.ok) { onLogin(); } 
    else { const data = await res.json(); setError(data.error || "Login failed"); }
  }

  return (
    <div className="auth-container">
      <form onSubmit={handleAdminLogin}>
        <h2>Admin Login</h2>
        {error && <p className="error-message">{error}</p>}
        <input placeholder="Enter Passcode" type="password" value={passcode} onChange={e => setPasscode(e.target.value)} required />
        <div className="button-group"><button type="submit">Access Dashboard</button></div>
      </form>
    </div>
  );
}