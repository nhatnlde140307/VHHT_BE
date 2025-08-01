import os
import logging
import re
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pymongo import MongoClient
from openai import OpenAI
from action_intents import handle_action_intents, normalize_user_input
import traceback
import re
from bson import ObjectId
from bson.errors import InvalidId
from actions import register_campaign_from_input
from utils import extract_campaign_name

# Cấu hình logging
logging.basicConfig(
    level=logging.DEBUG,
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
phase_day_collection = db["phasedays"]
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

def get_campaign_by_name(name: str):
    return campaign_collection.find_one({
        "name": {"$regex": f"^{re.escape(name)}$", "$options": "i"},
        "acceptStatus": "approved"
    })

def build_campaign_context(campaign):
    campaign_id = campaign["_id"]
    
    # ==== Volunteers ====
    volunteers = campaign.get("volunteers", [])
    status_summary = {}
    for vol in volunteers:
        status = vol.get("status", "unknown")
        status_summary[status] = status_summary.get(status, 0) + 1
    volunteer_info = ", ".join([f"{k}: {v}" for k, v in status_summary.items()])
    total_volunteers = len(volunteers)

    # ==== Phases & PhaseDays ====
    phases = list(phase_collection.find({"campaignId": campaign_id}))
    phase_info_lines = []
    phase_day_ids = []
    for i, p in enumerate(phases):
        phase_info_lines.append(f"{i+1}. {p['name']} ({format_date(p['startDate'])} - {format_date(p['endDate'])})")
        phase_days = list(phase_day_collection.find({ "phaseId": p["_id"] }))
        phase_day_ids.extend([d["_id"] for d in phase_days])
    phase_info = "\n".join(phase_info_lines) or "Không có giai đoạn nào cả."

    # ==== Tasks ====
    tasks = list(task_collection.find({ "phaseDayId": {"$in": phase_day_ids} }))
    task_titles = [t.get("title", "(Không tên)") for t in tasks]
    task_info = ", ".join(task_titles[:10])
    if len(task_titles) > 10:
        task_info += f", ... (tổng cộng {len(task_titles)} nhiệm vụ)"

    # ==== Departments ====
    departments = list(department_collection.find({"campaignId": campaign_id}))
    department_info = ", ".join([d.get("name", "Không tên") for d in departments]) or "Không có phòng ban nào."

    # ==== Return context string ====
    return f"""
📌 Tên chiến dịch: {campaign.get('name')}
📅 Thời gian: {format_date(campaign.get('startDate'))} đến {format_date(campaign.get('endDate'))}
📍 Địa điểm: {campaign.get('location', {}).get('address', 'Không rõ')}
📝 Mô tả: {campaign.get('description', 'Không có mô tả')}
🧑‍🤝‍🧑 Tình nguyện viên: {total_volunteers} người ({volunteer_info})
📜 Chứng chỉ: {'Đã phát' if campaign.get('certificatesIssued') else 'Chưa phát'}

🗓️ Giai đoạn:
{phase_info}

✅ Nhiệm vụ tiêu biểu:
{task_info}

🏢 Phòng ban:
{department_info}
"""

def to_objectid_safe(id):
    if isinstance(id, ObjectId):
        return id
    try:
        return ObjectId(str(id))
    except InvalidId:
        return None

def get_task_details(task):
    title = task.get('title', '(Không tên nhiệm vụ)')
    task_date = "Không rõ ngày"
    phase_name = "Không rõ giai đoạn"
    campaign_name = "Không rõ chiến dịch"

    try:
        # 🌱 Log task info
        logger.debug(f"🔍 Task: {title} | phaseDayId = {task.get('phaseDayId')}")

        # Ép phaseDayId về ObjectId nếu cần
        phase_day_id = to_objectid_safe(task.get("phaseDayId"))
        if not phase_day_id:
            logger.debug(f"⚠️ phaseDayId không hợp lệ: {task.get('phaseDayId')}")
            return title, task_date, phase_name, campaign_name

        phase_day = phase_day_collection.find_one({ "_id": phase_day_id })
        if not phase_day:
            logger.debug(f"⚠️ Không tìm thấy phaseDay với _id = {phase_day_id}")
            return title, task_date, phase_name, campaign_name

        logger.debug(f"✅ phaseDay: {phase_day.get('date')} | phaseId = {phase_day.get('phaseId')}")

        if "date" in phase_day:
            task_date = format_date(phase_day["date"])

        # Ép phaseId về ObjectId nếu cần
        phase_id = to_objectid_safe(phase_day.get("phaseId"))
        if not phase_id:
            logger.debug(f"⚠️ phaseId không hợp lệ: {phase_day.get('phaseId')}")
            return title, task_date, phase_name, campaign_name

        phase = phase_collection.find_one({ "_id": phase_id })
        if not phase:
            logger.debug(f"⚠️ Không tìm thấy phase với _id = {phase_id}")
            return title, task_date, phase_name, campaign_name

        phase_name = phase.get("name", phase_name)
        logger.debug(f"✅ Phase: {phase_name} | campaignId = {phase.get('campaignId')}")

        # Ép campaignId về ObjectId nếu cần
        campaign_id = to_objectid_safe(phase.get("campaignId"))
        if not campaign_id:
            logger.debug(f"⚠️ campaignId không hợp lệ: {phase.get('campaignId')}")
            return title, task_date, phase_name, campaign_name

        campaign = campaign_collection.find_one({ "_id": campaign_id })
        if not campaign:
            logger.debug(f"⚠️ Không tìm thấy campaign với _id = {campaign_id}")
            return title, task_date, phase_name, campaign_name

        campaign_name = campaign.get("name", campaign_name)
        logger.debug(f"✅ Campaign: {campaign_name}")

    except Exception as e:
        logger.warning(f"❌ Lỗi khi lấy thông tin task '{title}': {e}")

    return title, task_date, phase_name, campaign_name

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
        logger.error(f"Lỗi gọi OpenAI: {e}\n{traceback.format_exc()}")
        return "Có lỗi khi gọi GPT"
    
def answer_user_question(user_input: str, user_id: str = None, token: str = None):
    global last_campaign

    user_input_lower = normalize_user_input(user_input)

    # === Regex Intent: nhiệm vụ của tôi / hôm nay / tuần này ===
    match_nhiemvu = re.search(r"nhiệm vụ (của tôi|hôm nay|tuần này)", user_input_lower)
    if match_nhiemvu:
        if not user_id:
            return "Bạn chưa đăng nhập nên em không biết bạn là ai á 😅 Đăng nhập để xem nhiệm vụ nha!"

        try:
            object_user_id = ObjectId(user_id)
        except Exception as e:
            logger.warning(f"❌ user_id không hợp lệ: {user_id} – {e}")
            return "Thông tin đăng nhập không hợp lệ rồi đó anh/chị 😢"

        match_filter = {"assignedUsers.userId": object_user_id}
        tasks = list(task_collection.find(match_filter))
        if not tasks:
            return "Em không thấy nhiệm vụ nào được giao cho anh/chị cả 😢"

        now = datetime.now()
        today_str = now.strftime("%Y-%m-%d")

        if "hôm nay" in user_input_lower:
            tasks = [
                task for task in tasks
                if (pd := phase_day_collection.find_one({"_id": task.get("phaseDayId")}))
                and pd.get("date", "").startswith(today_str)
            ]
            if not tasks:
                return "Hôm nay bạn không có nhiệm vụ nào cả đó nha 🎉"

        elif "tuần này" in user_input_lower:
            start_week = now - timedelta(days=now.weekday())  # Thứ 2
            end_week = start_week + timedelta(days=6)         # Chủ nhật
            tasks = [
                task for task in tasks
                if (pd := phase_day_collection.find_one({"_id": task.get("phaseDayId")}))
                and "date" in pd
                and start_week.date() <= datetime.strptime(pd["date"], "%Y-%m-%d").date() <= end_week.date()
            ]
            if not tasks:
                return "Tuần này bạn không có nhiệm vụ nào cả đó 🧘‍♂️ Chill nhaa"

        reply = f"🎯 Bạn có {len(tasks)} nhiệm vụ"
        if "hôm nay" in user_input_lower:
            reply += " trong hôm nay"
        elif "tuần này" in user_input_lower:
            reply += " trong tuần này"
        reply += ":\n"

        for task in tasks[:5]:
            title, task_date, phase_name, campaign_name = get_task_details(task)
            reply += f"- **{title}** (📅 {task_date} – 🧭 {phase_name} – 📌 {campaign_name})\n"

        if len(tasks) > 5:
            reply += f"... và {len(tasks) - 5} nhiệm vụ khác nữa đó nha!"

        return reply

    # === Đăng ký chiến dịch 📝 ===
    match_dangky = re.search(r"(đăng[ ]?k[íy]|tham gia).+chiến dịch", user_input_lower)
    if match_dangky:
        if not token:
            return "Bạn cần đăng nhập để đăng ký chiến dịch nha 😅"
        return register_campaign_from_input(user_input, token)

    # === Intent hành động khác ===
    action_response = handle_action_intents(user_input_lower)
    if action_response:
        return action_response

    # === Các chiến dịch đang diễn ra ===
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
        last_campaign = campaigns[0]
        reply += "Anh/chị muốn tìm hiểu thêm về chiến dịch nào thì cứ hỏi tiếp nha! 💬"
        return reply

    # === Tìm theo tên chiến dịch ===
    name = extract_campaign_name(user_input)
    if name:
        campaign = get_campaign_by_name(name)
        if not campaign:
            return f"Hình như chiến dịch tên ‘{name}’ chưa được duyệt hoặc không tồn tại. Anh/chị kiểm tra lại giúp em nha!"
        last_campaign = campaign
        context = build_campaign_context(campaign)
        return call_openai_rag(context, user_input)

    # === fallback: nếu đã có last_campaign thì trả lời theo context ===
    if last_campaign:
        context = build_campaign_context(last_campaign)
        return call_openai_rag(context, user_input)

    return "Em không biết anh/chị đang nói đến chiến dịch nào á 😅 Nói rõ tên giúp em nha!"
