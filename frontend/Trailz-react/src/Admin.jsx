import { useState } from "react";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";

export default function Admin() {
    const [isAdmin, setIsAdmin] = useState(sessionStorage.getItem("isAdminAuthenticated") === "true");
    const handleLogin = () => { sessionStorage.setItem("isAdminAuthenticated", "true"); setIsAdmin(true); };
    const handleLogout = () => { sessionStorage.removeItem("isAdminAuthenticated"); setIsAdmin(false); }
    if (!isAdmin) { return <AdminLogin onLogin={handleLogin} />; }
    return <AdminDashboard onLogout={handleLogout} />;
}