import { useState, useEffect } from "react";
import Login from "./Login";
import Signup from "./Signup";
import Dashboard from "./Dashboard";

export default function Dispatcher() {
    const [user, setUser] = useState(null);
    const [showSignup, setShowSignup] = useState(false);

    useEffect(() => {
        const loggedInUser = localStorage.getItem("user");
        if (loggedInUser) {
            try { setUser(JSON.parse(loggedInUser)); } 
            catch (error) { localStorage.removeItem("user"); }
        }
    }, []);

    if (!user) {
        return showSignup ? (
            <Signup onLogin={setUser} onSwitch={() => setShowSignup(false)} />
        ) : (
            <Login onLogin={setUser} onSwitch={() => setShowSignup(true)} />
        );
    }
    return ( <Dashboard user={user} onLogout={() => { localStorage.removeItem("user"); setUser(null); }} /> );
}