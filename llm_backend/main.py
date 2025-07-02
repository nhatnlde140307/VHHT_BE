from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from deepface import DeepFace
import numpy as np
from PIL import Image
import io
import os
import base64
import pymongo
from bson import ObjectId
from dotenv import load_dotenv
import logging
from base64 import b64encode
from ai_logic import answer_user_question  # Logic chatbot

# === Logger setup ===
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# === Load biến môi trường ===
load_dotenv()

# === Tạo app FastAPI ===
app = FastAPI()

# === CORS ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cho tất cả frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Kết nối MongoDB ===
mongo_uri = os.getenv("MONGO_URI")
if not mongo_uri:
    logger.error("❌ MONGO_URI không được thiết lập trong .env")
    raise ValueError("MONGO_URI không được thiết lập")

try:
    mongo_client = pymongo.MongoClient(mongo_uri)
    db = mongo_client["VHHT"]
    campaign_collection = db["campaigns"]
    donation_campaign_collection = db["donationCampaigns"]
    donor_profile_collection = db["donorProfiles"]
    user_collection = db["users"]
    logger.info("✅ Kết nối MongoDB thành công")
except Exception as e:
    logger.error(f"❌ Lỗi kết nối MongoDB: {str(e)}")
    raise

# === Pydantic Models ===
class ChatData(BaseModel):
    message: str

class ImageData(BaseModel):
    user_id: str
    image: str  # base64 encoded image

# === Helper: base64 → numpy image array ===
def base64_to_image(base64_str):
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        img_data = base64.b64decode(base64_str)
        img = Image.open(io.BytesIO(img_data)).convert("RGB")
        return np.array(img)
    except Exception as e:
        raise ValueError(f"Lỗi giải mã ảnh base64: {e}")

# === Endpoint: Đăng ký khuôn mặt ===
@app.post("/register")
async def register_face(user_id: str = Form(...), file: UploadFile = File(...)):
    try:
        # Đọc ảnh từ file upload
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_array = np.array(image)

        # 👉 Convert ảnh sang base64 để lưu vào MongoDB
        buffered = io.BytesIO()
        image.save(buffered, format="JPEG")
        image_base64 = "data:image/jpeg;base64," + b64encode(buffered.getvalue()).decode()

        # Tính embedding với DeepFace
        embedding_info = DeepFace.represent(
            img_path=img_array,
            model_name="ArcFace",
            enforce_detection=True
        )
        face_descriptor = embedding_info[0]["embedding"]

        # Cập nhật vào MongoDB
        result = user_collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "faceDescriptor": face_descriptor,
                    "faceImage": image_base64  # 🆕 Lưu ảnh thật
                }
            }
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="❌ Không tìm thấy người dùng!")

        return {"status": "✅ Đăng ký khuôn mặt thành công!"}

    except Exception as e:
        logger.error(f"Lỗi tại /register: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý: {str(e)}")
# === Endpoint: Check-in khuôn mặt ===
@app.post("/checkin")
async def checkin_face(data: ImageData):
    try:
        camera_img = base64_to_image(data.image)

        embedding_info = DeepFace.represent(
            img_path=camera_img,
            model_name="ArcFace",
            enforce_detection=True
        )
        embedding_checkin = embedding_info[0]["embedding"]

        user = user_collection.find_one({"_id": ObjectId(data.user_id)})
        if not user or "faceDescriptor" not in user:
            raise HTTPException(status_code=404, detail="❌ Không tìm thấy khuôn mặt đã đăng ký.")

        embedding_registered = user["faceDescriptor"]

        # Hàm tính khoảng cách cosine
        from numpy.linalg import norm
        def cosine_distance(a, b):
            a = np.array(a)
            b = np.array(b)
            return 1 - np.dot(a, b) / (norm(a) * norm(b))

        distance = cosine_distance(embedding_checkin, embedding_registered)

        if distance < 0.35:
            return {"status": "✅ Check-in thành công!", "distance": distance}
        else:
            return {"status": f"🚫 Không khớp khuôn mặt! (Khoảng cách: {distance:.4f})", "distance": distance}

    except Exception as e:
        logger.error(f"Lỗi tại /checkin: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi nhận diện: {str(e)}")

# === Endpoint: Chatbot ===
@app.post("/chat")
async def chat(data: ChatData):
    try:
        reply = answer_user_question(data.message)
        return {"reply": reply}
    except Exception as e:
        logger.error(f"Lỗi tại /chat: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý câu hỏi: {str(e)}")

# === Khởi chạy ===
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)