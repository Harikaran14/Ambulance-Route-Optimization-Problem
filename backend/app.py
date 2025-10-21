# MUST BE AT THE VERY TOP
import eventlet
eventlet.monkey_patch()

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
from auth import auth_bp, admin_bp 
from db import hospitals, ambulances, dispatches, seed_data # <-- seed_data is imported but NOT called
from dotenv import load_dotenv
import requests
import time

load_dotenv()

app = Flask(__name__)

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173") 
CORS(app, origins=[FRONTEND_URL])
socketio = SocketIO(app, cors_allowed_origins=[FRONTEND_URL], async_mode='eventlet')

# --- THIS BLOCK HAS BEEN REMOVED ---
# The seed_data() call is no longer here.
# ---

app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(admin_bp, url_prefix='/admin')

TOMTOM_API_KEY = os.environ.get("TOMTOM_API_KEY", "YOUR_FALLBACK_KEY")
active_dispatches = {} 

# ... (All your other Python functions: get_coordinates, get_route_data, etc.) ...
# ... (All your @app.route functions: /find-best-route, /history, etc.) ...
# ... (All your @socketio.on functions: join_room, location_update, etc.) ...

def get_coordinates(place_name):
    url = f"https://api.tomtom.com/search/2/geocode/{place_name}.json?key={TOMTOM_API_KEY}&countrySet=IN"
    try:
        r = requests.get(url)
        r.raise_for_status()
        data = r.json()
        if data.get("results"):
            pos = data["results"][0]["position"]
            return pos["lat"], pos["lon"]
    except requests.RequestException as e:
        print(f"Error fetching coordinates: {e}")
    return None

def get_route_data(coord1, coord2):
    url = (
        f"https://api.tomtom.com/routing/1/calculateRoute/"
        f"{coord1[0]},{coord1[1]}:{coord2[0]},{coord2[1]}/json"
        f"?key={TOMTOM_API_KEY}&instructionsType=text&routeType=fastest&traffic=true"
    )
    try:
        r = requests.get(url)
        r.raise_for_status()
        data = r.json()
        if data.get("routes"):
            route = data["routes"][0]
            summary = route["summary"]
            points = [(p["latitude"], p.get("longitude")) for p in route["legs"][0]["points"]]
            instructions = [ins["message"] for ins in route["guidance"]["instructions"]]
            return summary["lengthInMeters"], summary["travelTimeInSeconds"], points, instructions
    except requests.RequestException as e:
        print(f"Error fetching route data: {e}")
    return None, None, [], []

@app.route("/find-best-route", methods=["POST"])
def find_best_route():
    data = request.json
    dispatcher_email = data.get("email") 
    required_specialty = data.get("specialty")
    patient_coords = None
    patient_location_name = "Patient Location"

    if "patient_lat" in data and "patient_lon" in data:
        patient_coords = (data["patient_lat"], data["patient_lon"])
        patient_location_name = f"GPS: {data['patient_lat']:.4f}, {data['patient_lon']:.4f}"
    else:
        patient_location_name = data.get("patient_location")
        patient_coords = get_coordinates(patient_location_name)

    if not patient_coords: return jsonify({"error": "Could not determine patient coordinates"}), 400

    best_ambulance, min_time_to_patient = None, float('inf')
    for amb in ambulances.find({"status": "available"}):
        amb_coords = (amb["lat"], amb["lon"])
        _, time_s, _, _ = get_route_data(amb_coords, patient_coords)
        if time_s is not None and time_s < min_time_to_patient: min_time_to_patient, best_ambulance = time_s, amb
    if not best_ambulance: return jsonify({"error": "No available ambulances found"}), 404
    
    best_hospital, min_time_to_hospital = None, float('inf')
    query = {"specialties": required_specialty, "availability": {"$gt": 0}}
    for hosp in hospitals.find(query):
        hosp_coords = (hosp["lat"], hosp["lon"])
        _, time_s, _, _ = get_route_data(patient_coords, hosp_coords)
        if time_s is not None and time_s < min_time_to_hospital: min_time_to_hospital, best_hospital = time_s, hosp
    if not best_hospital: return jsonify({"error": f"No available hospitals with '{required_specialty}' specialty and open beds"}), 404

    hospitals.update_one({"_id": best_hospital["_id"]}, {"$inc": {"availability": -1}})

    amb_coords = (best_ambulance["lat"], best_ambulance["lon"])
    hosp_coords = (best_hospital["lat"], best_hospital["lon"])
    dist, time_s, points, instructions = get_route_data(amb_coords, patient_coords)

    dispatch_id = best_ambulance["unit"]
    active_dispatches[dispatch_id] = {
        "dispatch_id": dispatch_id, "ambulance_id": dispatch_id,
        "dispatcher_email": dispatcher_email, "patient_location": patient_location_name,
        "hospital_name": best_hospital["name"], "initial_eta_s": time_s,
        "patient_coords": patient_coords, "hospital_coords": hosp_coords,
        "current_leg": "to_patient", "last_location": amb_coords,
        "last_update_time": time.time()
    }
    
    ambulances.update_one({"unit": dispatch_id}, {"$set": {"status": "enroute"}})

    driver_room = f"driver_{dispatch_id}"
    socketio.emit('new_dispatch', {
        'dispatch_id': dispatch_id,
        'patient_location': patient_location_name,
        'eta_s': time_s
    }, room=driver_room)
    print(f"Sent new dispatch notification to room {driver_room}")

    return jsonify({
        "message": f"Success! Dispatch assigned to {dispatch_id}.",
        "dispatch_id": dispatch_id,
        "ambulance_unit": best_ambulance["unit"]
    })

@app.route("/history/<email>")
def history(email):
    user_dispatches = list(dispatches.find({"email": email}, {"_id": 0}))
    return jsonify(user_dispatches)

@socketio.on('join_room')
def handle_join_room(data):
    dispatch_id = data['dispatch_id']
    join_room(dispatch_id)
    print(f"Client {request.sid} joined room for dispatch {dispatch_id}")
    
    dispatch = active_dispatches.get(dispatch_id)
    if dispatch:
        start_location = dispatch['last_location']
        if dispatch['current_leg'] == 'to_patient':
            destination_coords, end_popup = (dispatch['patient_coords'], "Patient")
        else:
            destination_coords, end_popup = (dispatch['hospital_coords'], "Hospital")
            
        dist, time_s, points, instructions = get_route_data(start_location, destination_coords)
        
        emit('route_update', {
            'dispatch_id': dispatch_id,
            'driver_location': start_location,
            'destination_location': destination_coords,
            'destination_name': end_popup,
            'route_points': points,
            'instructions': instructions,
            'eta_s': time_s
        }, room=request.sid)

@socketio.on('join_driver_standby_room')
def handle_driver_standby(data):
    unit_id = data['unit_id']
    driver_room = f"driver_{unit_id}"
    join_room(driver_room)
    print(f"Driver for unit {unit_id} is on standby in room {driver_room}")
    
    dispatch = active_dispatches.get(unit_id)
    if dispatch:
        print(f"Found pending dispatch {unit_id} for driver. Notifying.")
        socketio.emit('new_dispatch', {
            'dispatch_id': dispatch['dispatch_id'],
            'patient_location': dispatch['patient_location'],
            'eta_s': dispatch['initial_eta_s']
        }, room=request.sid)

@socketio.on('location_update')
def handle_location_update(data):
    dispatch_id = data['dispatch_id']
    current_location = (data['lat'], data['lon'])
    dispatch = active_dispatches.get(dispatch_id)
    if not dispatch: return
    
    dispatch['last_location'] = current_location
    ambulances.update_one({"unit": dispatch_id}, {"$set": {"lat": data['lat'], "lon": data['lon']}})
    
    if dispatch['current_leg'] == 'to_patient':
        destination_coords, end_popup = (dispatch['patient_coords'], "Patient")
    else:
        destination_coords, end_popup = (dispatch['hospital_coords'], "Hospital")

    dist, time_s, points, instructions = get_route_data(current_location, destination_coords)
    
    emit('route_update', {
        'dispatch_id': dispatch_id,
        'driver_location': current_location,
        'destination_location': destination_coords,
        'destination_name': end_popup,
        'route_points': points,
        'instructions': instructions,
        'eta_s': time_s
    }, room=dispatch_id)

@socketio.on('pickup_patient')
def handle_pickup(data):
    dispatch_id = data['dispatch_id']
    if dispatch_id in active_dispatches:
        dispatch = active_dispatches[dispatch_id]
        dispatch['current_leg'] = 'to_hospital'
        handle_location_update({
            'dispatch_id': dispatch_id,
            'lat': dispatch['last_location'][0], 'lon': dispatch['last_location'][1]
        })

@socketio.on('mission_complete')
def handle_mission_complete(data):
    dispatch_id = data['dispatch_id']
    dispatch = active_dispatches.get(dispatch_id)
    if not dispatch: return
    dispatches.insert_one({
        "email": dispatch["dispatcher_email"], "patient_location": dispatch["patient_location"],
        "hospital": dispatch["hospital_name"], "ambulance": dispatch["ambulance_id"],
        "time_taken_mins": (dispatch["initial_eta_s"] / 60) if dispatch["initial_eta_s"] else 'N/A',
        "date": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    })
    ambulances.update_one({"unit": dispatch_id}, {"$set": {"status": "available"}})
    emit('dispatch_completed_notification', {
        "dispatch_id": dispatch_id,
        "message": f"Dispatch for {dispatch_id} has been completed by the driver."
    }, room=dispatch_id)
    del active_dispatches[dispatch_id]
    print(f"Dispatch {dispatch_id} completed and saved to history.")


if __name__ == "__main__":
    # The seed_data() call now ONLY runs when you run "python app.py" locally
    print("Starting Flask-SocketIO server with eventlet...")
    seed_data()
    socketio.run(app, port=5001, debug=True)
