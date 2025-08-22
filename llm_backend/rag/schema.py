# rag/schema.py
from pymongo import MongoClient
import os

client = MongoClient(os.getenv("MONGO_URI"))
db = client["VHHT"]
knowledge = db["vhht_knowledge"]
