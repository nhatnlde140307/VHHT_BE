from datetime import datetime
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from openai import OpenAI

# 🔹 Load biến môi trường từ .env
load_dotenv()

# 🔑 Lấy API key
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

# 🔹 Kết nối MongoDB
mongo_uri = os.getenv("MONGO_URI")
mongo_client = MongoClient(mongo_uri)
collection = mongo_client["VHHT"]["campaigns"]

# 🔹 Hàm định dạng ngày
def format_date(d):
    try:
        return datetime.strptime(str(d), "%Y-%m-%dT%H:%M:%S.%fZ").strftime("%d/%m/%Y")
    except:
        return str(d)

# 🔹 Hàm chính để xử lý câu hỏi
def answer_user_question(user_input: str):
    if "đang chạy" in user_input.lower() or "diễn ra" in user_input.lower():
        try:
            docs = list(collection.find({"status": "in-progress"}))
        except Exception as e:
            print("❌ MongoDB error:", e)
            return "Không thể kết nối dữ liệu."

        if not docs:
            return "Hiện tại chưa có chiến dịch nào đang diễn ra."

        summary = "\n".join(
            f"- {d['name']} ({format_date(d['startDate'])} đến {format_date(d['endDate'])})"
            for d in docs
        )

        prompt = f"""Người dùng hỏi: {user_input}
Dưới đây là các chiến dịch đang diễn ra:
{summary}
→ Hãy trả lời lại một cách thân thiện, dễ hiểu."""
    else:
        prompt = f"Người dùng hỏi: {user_input}\n→ Hãy trả lời như một trợ lý AI."

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content
    except Exception as e:
        print("❌ Chat error:", e)
        return "Lỗi khi gọi mô hình AI."