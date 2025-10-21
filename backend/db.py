import os
from pymongo import MongoClient
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

# --- Load environment variables ---
load_dotenv()

# --- Database client and collections will be initialized later ---
client = None
db = None
users = None
ambulances = None
hospitals = None
dispatches = None

# --- NEW: Function to initialize the database connection ---
def init_db():
    global client, db, users, ambulances, hospitals, dispatches
    
    if db is None: # Only connect once
        print("Initializing database connection...")
        DATABASE_URL = os.environ.get("DATABASE_URL", "mongodb://localhost:27017/")
        try:
            client = MongoClient(DATABASE_URL)
            # --- Specify the database name ---
            db = client.get_database("ambulance_db")

            # --- Assign collections ---
            users = db.users
            ambulances = db.ambulances
            hospitals = db.hospitals
            dispatches = db.dispatches
            print("Database connection successful.")
        except Exception as e:
            print(f"!!! FATAL ERROR: Could not connect to database: {e}")
            # In a real app, you might want to exit or handle this more gracefully
            # For now, variables will remain None, causing errors later if connection fails.
            
# --- Seed data function remains the same ---
def seed_data():
    if db is None:
        print("Cannot seed data, database is not initialized.")
        return
        
    # Make sure it doesn't drop collections every time
    if users.count_documents({}) == 0:
        print("Seeding users...")
        users.insert_one({
            "email": "test@example.com",
            "password": generate_password_hash("test1234"),
            "name": "Test Dispatcher"
        })
    # Add your manual user here too if needed, or rely on manual adding in Atlas
    
    if ambulances.count_documents({}) == 0:
        print("Seeding ambulances...")
        # Add a few default ones just in case manual adding fails
        ambulances.insert_many([
            {"unit": "AMB-01", "lat": 12.8797, "lon": 80.0812, "status": "available", "specialty": "Cardiac"}, 
            {"unit": "AMB-02", "lat": 13.0827, "lon": 80.2707, "status": "available", "specialty": "Trauma"},  
            {"unit": "AMB-03", "lat": 12.9845, "lon": 80.2462, "status": "available", "specialty": "General"} 
        ])

    if hospitals.count_documents({}) == 0:
        print("Seeding hospitals...")
        hospitals.insert_many([
             {"name": "Apollo Hospital, Greams Road", "lat": 13.0594, "lon": 80.2520, "specialties": ["Cardiac", "General"], "availability": 5},
             {"name": "Fortis Malar Hospital, Adyar", "lat": 12.9915, "lon": 80.2547, "specialties": ["Cardiac", "Trauma"], "availability": 3},
             {"name": "MIOT International, Manapakkam", "lat": 13.0169, "lon": 80.1785, "specialties": ["Trauma", "General"], "availability": 8}
        ])

    print("Seed data check complete.")
