from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from db import users, ambulances, hospitals, dispatches
import time

# --- Existing Dispatcher Auth ---
auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.json
    email = data.get("email")
    password = data.get("password")
    name = data.get("name")
    if users.find_one({"email": email}):
        return jsonify({"error": "User already exists"}), 400
    hashed_password = generate_password_hash(password)
    users.insert_one({"email": email, "password": hashed_password, "name": name})
    return jsonify({"message": "Signup successful"}), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")
    user = users.find_one({"email": email})
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid credentials"}), 401
    return jsonify({
        "message": "Login successful",
        "user": {"email": user["email"], "name": user["name"]}
    })


# --- Admin Analytics Blueprint ---
admin_bp = Blueprint("admin", __name__)
ADMIN_PASSCODE = "admin123"

@admin_bp.route("/login", methods=["POST"])
def admin_login():
    data = request.json
    passcode = data.get("passcode")
    if passcode == ADMIN_PASSCODE:
        return jsonify({"message": "Admin login successful"}), 200
    else:
        return jsonify({"error": "Invalid passcode"}), 401

@admin_bp.route("/stats")
def get_stats():
    total_dispatches = dispatches.count_documents({})
    available_ambulances = ambulances.count_documents({"status": "available"})
    enroute_ambulances = ambulances.count_documents({"status": "enroute"})
    total_time, count = 0, 0
    for dispatch in dispatches.find({}, {"time_taken_mins": 1}):
        try:
            total_time += float(dispatch.get("time_taken_mins", 0))
            count += 1
        except (ValueError, TypeError): continue
    avg_time = (total_time / count) if count > 0 else 0
    return jsonify({
        "totalDispatches": total_dispatches,
        "availableAmbulances": available_ambulances,
        "enrouteAmbulances": enroute_ambulances,
        "avgResponseTimeMins": round(avg_time, 1)
    })

@admin_bp.route("/fleet-status")
def get_fleet_status():
    fleet = list(ambulances.find({}, {"_id": 0}))
    return jsonify(fleet)

@admin_bp.route("/hospital-status")
def get_hospital_status():
    hosp_status = list(hospitals.find({}, {"_id": 0}))
    return jsonify(hosp_status)

@admin_bp.route("/all-dispatches")
def get_all_dispatches():
    all_logs = list(dispatches.find({}, {"_id": 0}).sort("date", -1))
    return jsonify(all_logs)

# --- NEW: Endpoint for Admin to reset bed counts ---
@admin_bp.route("/hospitals/reset", methods=["POST"])
def reset_hospitals():
    try:
        # These values should match your seed data for a consistent reset
        hospitals.update_one({"name": "Apollo Hospital, Greams Road"}, {"$set": {"availability": 5}})
        hospitals.update_one({"name": "Fortis Malar Hospital, Adyar"}, {"$set": {"availability": 3}})
        hospitals.update_one({"name": "MIOT International, Manapakkam"}, {"$set": {"availability": 8}})
        hospitals.update_one({"name": "Kauvery Hospital"}, {"$set": {"availability": 5}})
        hospitals.update_one({"name": "Vijaya Hospital"}, {"$set": {"availability": 8}})
        hospitals.update_one({"name": "SIMS Hospital"}, {"$set": {"availability": 6}})
        hospitals.update_one({"name": "Billroth Hospitals, Shenoy Nagar"}, {"$set": {"availability": 4}})
        hospitals.update_one({"name": "Dr. Kamakshi Memorial Hospital"}, {"$set": {"availability": 7}})
        hospitals.update_one({"name": "Dr. Rela Institute, Chromepet"}, {"$set": {"availability": 5}})
        hospitals.update_one({"name": "Chettinad Hospital, Kelambakkam"}, {"$set": {"availability": 10}})
        hospitals.update_one({"name": "SRM Medical College Hospital, Potheri"}, {"$set": {"availability": 12}})
        hospitals.update_one({"name": "Government General Hospital, Park Town"}, {"$set": {"availability": 20}})
        hospitals.update_one({"name": "Saveetha Medical College Hospital"}, {"$set": {"availability": 9}})
        return jsonify({"message": "Hospital bed availability reset successfully."}), 200
    except Exception as e:
        print(f"Error resetting hospital availability: {e}")
        return jsonify({"error": "Could not reset hospital data."}), 500
