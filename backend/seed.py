import os
from db import seed_data
from dotenv import load_dotenv

# Load environment variables (like DATABASE_URL)
load_dotenv()

print("Connecting to database and seeding data...")
seed_data()
print("Seeding complete.")
