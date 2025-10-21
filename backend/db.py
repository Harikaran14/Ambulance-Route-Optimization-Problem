import os
from pymongo import MongoClient
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

# --- NEW: Load environment variables ---
load_dotenv()

# --- NEW: Get the DB URL from the environment ---
# It falls back to your local DB if DATABASE_URL is not set
DATABASE_URL = os.environ.get("DATABASE_URL", "mongodb://localhost:27017/")
client = MongoClient(DATABASE_URL)

# --- NEW: Specify the database name ---
# This ensures Render uses one DB, not the 'admin' default
db = client.get_database("ambulance_db")

users = db.users
ambulances = db.ambulances
hospitals = db.hospitals
dispatches = db.dispatches

def seed_data():
    # ... (your existing seed_data function) ...
    # Make sure it doesn't drop collections every time
    if users.count_documents({}) == 0:
        print("Seeding users...")
        users.insert_one({
            "email": "test@example.com",
            "password": generate_password_hash("test1234"),
            "name": "Test Dispatcher"
        })
    
    if ambulances.count_documents({}) == 0:
        print("Seeding ambulances...")
        ambulances.insert_many([
            {"unit": "AMB-01", "lat": 12.8797, "lon": 80.0812, "status": "available", "specialty": "Cardiac"}, # Tambaram
            {"unit": "AMB-02", "lat": 13.0827, "lon": 80.2707, "status": "available", "specialty": "Trauma"},  # Chennai Central
            {"unit": "AMB-03", "lat": 12.9845, "lon": 80.2462, "status": "available", "specialty": "General"}  # Adyar
        ])

    if hospitals.count_documents({}) == 0:
        print("Seeding hospitals...")
        hospitals.insert_many([
            {"name": "Apollo Hospital, Greams Road", "lat": 13.0594, "lon": 80.2520, "specialties": ["Cardiac", "General"], "availability": 5},
            {"name": "Fortis Malar Hospital, Adyar", "lat": 12.9915, "lon": 80.2547, "specialties": ["Cardiac", "Trauma"], "availability": 3},
            {"name": "MIOT International, Manapakkam", "lat": 13.0169, "lon": 80.1785, "specialties": ["Trauma", "General"], "availability": 8}
        ])

    print("Seed data check complete.")
