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

# 🔹 Hàm định dạng vị trí
def format_location(loc):
    if not loc or 'coordinates' not in loc:
        return "Không có thông tin vị trí."
    return f"Địa chỉ: {loc.get('address', 'N/A')}, Tọa độ: {loc['coordinates']}"

# 🔹 Hàm định dạng tình nguyện viên
def format_volunteers(volunteers):
    if not volunteers:
        return "Không có tình nguyện viên."
    return f"Tổng số: {len(volunteers)}, Trạng thái: {', '.join([v['status'] for v in volunteers[:3]])}" + \
           (f" và {len(volunteers) - 3} người khác" if len(volunteers) > 3 else "")

# 🔹 Hàm chính để xử lý câu hỏi
def answer_user_question(user_input: str):
    # Phân loại ý định câu hỏi
    user_input_lower = user_input.lower()
    query = {}
    intent = None

    if any(keyword in user_input_lower for keyword in ["đang chạy", "diễn ra", "in-progress"]):
        intent = "query_active_campaigns"
        query = {"status": "in-progress"}
    elif any(keyword in user_input_lower for keyword in ["kết thúc", "completed"]):
        intent = "query_completed_campaigns"
        query = {"status": "completed"}
    elif any(keyword in user_input_lower for keyword in ["sắp tới", "upcoming"]):
        intent = "query_upcoming_campaigns"
        query = {"status": "upcoming"}
    elif any(keyword in user_input_lower for keyword in ["ngân sách", "budget"]):
        intent = "query_budget"
        query = {}  # Lấy tất cả để tìm ngân sách
    elif any(keyword in user_input_lower for keyword in ["tình nguyện", "volunteer"]):
        intent = "query_volunteers"
        query = {"volunteers": {"$ne": []}}  # Có tình nguyện viên
    elif any(keyword in user_input_lower for keyword in ["địa điểm", "vị trí", "location", "địa chỉ"]):
        intent = "query_location"
        query = {"location": {"$exists": True}}
    elif any(keyword in user_input_lower for keyword in ["mô tả", "description"]):
        intent = "query_description"
        query = {"description": {"$ne": ""}}
    elif any(keyword in user_input_lower for keyword in ["chứng nhận", "certificate"]):
        intent = "query_certificates"
        query = {"certificatesIssued": True}
    else:
        # Xử lý câu hỏi tổng quát
        prompt = f"Người dùng hỏi: {user_input}\n→ Trả lời như một trợ lý AI, sử dụng kiến thức chung."
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}]
            )
            return response.choices[0].message.content
        except Exception as e:
            print("❌ Chat error:", e)
            return "Lỗi khi gọi mô hình AI."

    # Truy xuất dữ liệu từ MongoDB
    try:
        docs = list(collection.find(query).limit(5))  # Giới hạn 5 kết quả để tránh quá tải
    except Exception as e:
        print("❌ MongoDB error:", e)
        return "Không thể kết nối dữ liệu."

    if not docs:
        return f"Không tìm thấy chiến dịch phù hợp với yêu cầu: {user_input}"

    # Tạo summary dữ liệu
    summary = "\n".join(
        f"- Tên: {d['name']}\n"
        f"  Trạng thái: {d.get('status', 'N/A')}\n"
        f"  Thời gian: {format_date(d['startDate'])} đến {format_date(d['endDate'])}\n"
        f"  Mô tả: {d.get('description', 'N/A')}\n"
        f"  Vị trí: {format_location(d.get('location'))}\n"
        f"  Tình nguyện viên: {format_volunteers(d.get('volunteers', []))}\n"
        f"  Chứng nhận: {'Đã phát' if d.get('certificatesIssued', False) else 'Chưa phát'}"
        for d in docs
    )

    # Prompt với schema và dữ liệu
    prompt = f"""Dữ liệu chiến dịch có các trường:
- name: Tên chiến dịch (string)
- description: Mô tả chiến dịch (string)
- startDate: Ngày bắt đầu (YYYY-MM-DD)
- endDate: Ngày kết thúc (YYYY-MM-DD)
- location: Vị trí (address: string, coordinates: [number, number])
- volunteers: Danh sách tình nguyện viên (mỗi người có user, status: pending/approved/rejected, evaluation, feedback)
- certificatesIssued: Chứng nhận đã phát hành (boolean)
- status: Trạng thái (upcoming, in-progress, completed)

Dữ liệu truy xuất:
{summary}

Câu hỏi: {user_input}
→ Trả lời chính xác, sử dụng thông tin từ dữ liệu nếu có. Nếu không có dữ liệu phù hợp, trả lời "Không tìm thấy thông tin." 
→ Trả lời thân thiện, dễ hiểu, và tập trung vào thông tin được hỏi."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content
    except Exception as e:
        print("❌ Chat error:", e)
        return "Lỗi khi gọi mô hình AI."