# llm_backend/database.py
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

mongo_uri = os.getenv("MONGO_URI")
if not mongo_uri:
    raise ValueError("MONGO_URI không được thiết lập")

mongo_client = MongoClient(mongo_uri)
db = mongo_client["VHHT"]

# Xuất ra các collection
campaign_collection = db["campaigns"]
phase_collection = db["phases"]
phase_day_collection = db["phaseDays"]
task_collection = db["tasks"]
department_collection = db["departments"]
user_collection = db["users"]
