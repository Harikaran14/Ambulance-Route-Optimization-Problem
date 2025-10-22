##Ambulance Route Optimization System
##Overview

This is a full-stack web application designed to optimize the dispatching of ambulances to emergency locations and transport patients to the most suitable nearby hospital. It features a real-time system for dispatchers to manage requests, drivers to receive assignments and navigate, and administrators to monitor the overall operation. The system utilizes the TomTom API for accurate geocoding, route calculation (including traffic), and ETA estimation. 🗺️🚑🏥

The application uses a React frontend and a Python (Flask + SocketIO) backend, with MongoDB Atlas for data storage. It's designed for deployment on platforms like Netlify (frontend) and Render (backend).

Features ✨
Dispatcher Interface
Secure Login/Signup: Dispatchers can create accounts and log in securely.

New Dispatch Form:

Enter patient location (by address or using current GPS location).

Select required medical specialty (e.g., Trauma, Cardiac, General).

Automated Routing:

Finds the nearest available ambulance to the patient.

Finds the nearest hospital with the required specialty and available beds.

Calculates the optimal route from the ambulance to the patient, considering real-time traffic.

Real-time Tracking:

Displays a live Leaflet map showing the assigned ambulance's location and route. 📍

Updates the map and ETA dynamically as the driver moves.

Handles driver completing the mission and resets the interface.

Dispatch History: View a log of past dispatches made by the logged-in dispatcher.

Notifications: Receives notifications if an assigned dispatch is cancelled by an admin.

Driver Interface
Standby Page (/driver-standby):

Drivers log in with their unit ID.

Waits for new assignments via real-time WebSocket notifications. 🔔

Receives notifications even if the dispatch was created before they logged in.

Provides a link to accept the dispatch and start navigation.

Live Navigation View (/driver/:dispatchId):

Displays a live Leaflet map showing their current location and route to the destination (patient first, then hospital).

Provides turn-by-turn text instructions.

Continuously updates location to the server using the browser's Geolocation API.

Shows real-time ETA.

Buttons to mark "Patient Picked Up" (updates route to hospital) and "Mission Complete". ✅

Admin Interface (/admin)
Secure Login: Access via a passcode.

Dashboard Overview: Displays key statistics:

Total Dispatches

Available Ambulances

En-Route Ambulances

Average Response Time

Fleet Status: Shows a table of all ambulances, their current location, and status (available/enroute).

Reset Functionality: Admins can force-reset an ambulance's status back to "available" in case of errors.

Hospital Status: Shows a table of all hospitals, their specialties, and current bed availability.

Reset Functionality: Admins can reset all hospital bed counts back to their default values.

Dispatch Log: Displays a complete history of all dispatches in the system.

Technologies Used 💻
Frontend:

React (using Vite)

react-leaflet, leaflet (Interactive Maps)

socket.io-client (Real-time Communication)

CSS (Styling)

Backend:

Python 3.11+

Flask (Web Framework)

Flask-SocketIO, Eventlet (WebSockets & Async)

Gunicorn (WSGI Server for Production)

PyMongo (MongoDB Driver)

Werkzeug (Password Hashing)

python-dotenv (Environment Variables)

Requests (Calling External APIs)

Database:

MongoDB Atlas (Cloud NoSQL Database)

APIs:

TomTom API (Geocoding, Routing, Traffic)

Deployment:

Render (Backend Web Service)

Netlify (Frontend Static Site)

Git / GitHub (Version Control & CI/CD Trigger)
