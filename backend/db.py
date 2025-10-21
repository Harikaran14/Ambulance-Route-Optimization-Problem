from pymongo import MongoClient

# Connect to your local MongoDB instance
client = MongoClient("mongodb://localhost:27017/")
db = client.ambulance_dispatch

# Define collections
users = db.users
hospitals = db.hospitals
ambulances = db.ambulances
dispatches = db.dispatches

def seed_data():
    """Populates the database with sample data and resets stuck ambulances."""
    if hospitals.count_documents({}) == 0:
        print("Seeding hospitals...")
        hospitals.insert_many([
            {"name": "Apollo Hospital, Greams Road", "lat": 13.0599, "lon": 80.2523, "specialties": ["Cardiac", "General"], "availability": 5},
            {"name": "Fortis Malar Hospital, Adyar", "lat": 13.0076, "lon": 80.2584, "specialties": ["Trauma", "Cardiac"], "availability": 3},
            {"name": "MIOT International, Manapakkam", "lat": 13.0163, "lon": 80.1834, "specialties": ["Trauma", "General"], "availability": 8},
        ])

    if ambulances.count_documents({}) == 0:
        print("Seeding ambulances...")
        ambulances.insert_many([
            {"unit": "AMB-01", "location": "T. Nagar", "lat": 13.0398, "lon": 80.2345, "status": "available"},
            {"unit": "AMB-02", "location": "Velachery", "lat": 12.9815, "lon": 80.2211, "status": "available"},
            {"unit": "AMB-03", "location": "Anna Nagar", "lat": 13.0845, "lon": 80.2101, "status": "available"},
        ])
    
    # --- PERMANENT FIX ---
    # On every startup, find any ambulances that were left 'enroute' 
    # from a previous session and reset them to 'available'.
    result = ambulances.update_many(
        {"status": "enroute"}, 
        {"$set": {"status": "available"}}
    )
    if result.modified_count > 0:
        print(f"Reset {result.modified_count} stuck ambulances to 'available'.")
        
    print("Database seeded and ambulances reset.")