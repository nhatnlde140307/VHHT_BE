import os
import logging
import re
from datetime import datetime
from dotenv import load_dotenv
from pymongo import MongoClient
from openai import OpenAI
from action_intents import handle_action_intents, normalize_user_input

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("chatbot.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load biến môi trường
load_dotenv()

# Kết nối MongoDB
mongo_uri = os.getenv("MONGO_URI")
if not mongo_uri:
    raise ValueError("MONGO_URI không được thiết lập")
mongo_client = MongoClient(mongo_uri)
db = mongo_client["VHHT"]
campaign_collection = db["campaigns"]
phase_collection = db["phases"]
phase_day_collection = db["phaseDays"]
task_collection = db["tasks"]
department_collection = db["departments"]
user_collection = db["users"]

# Kết nối OpenAI
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY không được thiết lập")
client = OpenAI(api_key=api_key)

# Biến toàn cục lưu campaign cuối cùng
last_campaign = None

def format_date(d):
    try:
        if isinstance(d, str):
            return datetime.strptime(d, "%Y-%m-%dT%H:%M:%S.%fZ").strftime("%d/%m/%Y")
        return d.strftime("%d/%m/%Y")
    except:
        return str(d)

def extract_campaign_name(text: str):
    """
    Trích xuất tên chiến dịch từ câu, ví dụ:
    "Chiến dịch trồng cây 2025 có bao nhiêu người tham gia"
    → "Trồng cây 2025"
    """
    match = re.search(r"chiến dịch ([\w\s\d]+?)(?:[\?\.,]|$)", text.lower())
    if match:
        name = match.group(1).strip()
        return name.title()
    return None


def get_campaign_by_name(name: str):
    return campaign_collection.find_one({
        "name": {"$regex": f"^{name}$", "$options": "i"},
        "acceptStatus": "approved"
    })

def build_campaign_context(campaign):
    campaign_id = campaign["_id"]
    # Tình nguyện viên
    volunteers = campaign.get("volunteers", [])
    status_summary = {}
    for vol in volunteers:
        status = vol.get("status", "unknown")
        status_summary[status] = status_summary.get(status, 0) + 1
    volunteer_info = ", ".join([f"{k}: {v}" for k, v in status_summary.items()])

    # Giai đoạn (phases)
    phases = list(phase_collection.find({"campaignId": campaign_id}))
    phase_info = "\n".join(
        [f"- {p['name']} ({format_date(p['startDate'])} - {format_date(p['endDate'])})" for p in phases]
    ) or "Không có giai đoạn nào cả."

    # Tasks trong phaseDays
    task_titles = []
    for phase in phases:
        phase_days = list(phase_day_collection.find({"phaseId": phase["_id"]}))
        for day in phase_days:
            tasks = list(task_collection.find({"phaseDayId": day["_id"]}))
            for task in tasks:
                task_titles.append(task.get("title", "(Không tên)"))
    task_info = ", ".join(task_titles) or "Không có nhiệm vụ nào."

    # Phòng ban
    departments = list(department_collection.find({"campaignId": campaign_id}))
    department_info = ", ".join([d["name"] for d in departments]) or "Không có phòng ban nào."

    return f"""
Tên chiến dịch: {campaign.get('name')}
Thời gian: {format_date(campaign.get('startDate'))} đến {format_date(campaign.get('endDate'))}
Địa điểm: {campaign.get('location', {}).get('address', 'Không rõ')}
Mô tả: {campaign.get('description', 'Không có mô tả')}
Tình nguyện viên: {len(volunteers)} người ({volunteer_info})
Chứng chỉ: {'Đã phát' if campaign.get('certificatesIssued') else 'Chưa phát'}

Giai đoạn:
{phase_info}

Nhiệm vụ:
{task_info}

Phòng ban:
{department_info}
"""

def call_openai_rag(context: str, user_input: str):
    prompt = f"""
Dưới đây là thông tin về một chiến dịch thiện nguyện:

{context}

Câu hỏi của người dùng: "{user_input}"

→ Trả lời bằng tiếng Việt tự nhiên, dễ thương, gần gũi như Gen Z. KHÔNG bịa đặt. Nếu thiếu thông tin thì nói kiểu: "Chưa rõ phần này nha, để mình tìm thêm!"

"""
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Lỗi gọi OpenAI: {e}")
        return "Có lỗi khi gọi GPT"

def answer_user_question(user_input: str):
    global last_campaign

    logger.info(f"Câu hỏi: {user_input}")
    user_input_lower = normalize_user_input(user_input)

    # Xử lý intent hành động (từ file action_intents.py)
    action_response = handle_action_intents(user_input_lower)
    if action_response:
        return action_response

    # Truy vấn danh sách campaign đang diễn ra
    if "đang diễn ra" in user_input_lower or "đang chạy" in user_input_lower:
        campaigns = list(campaign_collection.find({
            "status": "in-progress",
            "acceptStatus": "approved"
        }).limit(5))
        if not campaigns:
            return "Hiện tại chưa có chiến dịch nào đang diễn ra."
        reply = "Dưới đây là một vài chiến dịch đang hoạt động nè:\n"
        for c in campaigns:
            reply += f"🌱 {c['name']} (Từ {format_date(c['startDate'])} đến {format_date(c['endDate'])})\n"
        last_campaign = campaigns[0]  # lưu campaign đầu tiên được liệt kê
        reply += "Anh/chị muốn tìm hiểu thêm về chiến dịch nào thì cứ hỏi tiếp nha! 💬"
        return reply

    name = extract_campaign_name(user_input)
    if name:
        campaign = get_campaign_by_name(name)
        if not campaign:
            return f"Không tìm thấy chiến dịch nào tên '{name}' hoặc chưa được duyệt"
        last_campaign = campaign
        context = build_campaign_context(campaign)
        return call_openai_rag(context, user_input)

    # fallback nếu không có tên chiến dịch nhưng đã có last_campaign
    if last_campaign:
        context = build_campaign_context(last_campaign)
        return call_openai_rag(context, user_input)

    return "Em không biết anh/chị đang nói đến chiến dịch nào á 😅 Nói rõ tên giúp em nha!"
