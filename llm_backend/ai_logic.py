import logging
from datetime import datetime
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from openai import OpenAI

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

# Lấy API key
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    logger.error("OPENAI_API_KEY không được thiết lập trong .env")
    raise ValueError("OPENAI_API_KEY không được thiết lập")

client = OpenAI(api_key=api_key)

# Kết nối MongoDB
mongo_uri = os.getenv("MONGO_URI")
if not mongo_uri:
    logger.error("MONGO_URI không được thiết lập trong .env")
    raise ValueError("MONGO_URI không được thiết lập")

try:
    mongo_client = MongoClient(mongo_uri)
    db = mongo_client["VHHT"]
    campaign_collection = db["campaigns"]
    donation_campaign_collection = db["donationCampaigns"]
    donor_profile_collection = db["donorProfiles"]
    user_collection = db["users"]
    logger.info("Kết nối MongoDB thành công")
except Exception as e:
    logger.error(f"Lỗi kết nối MongoDB: {str(e)}")
    raise

# Hàm định dạng ngày
def format_date(d):
    try:
        if isinstance(d, str):
            return datetime.strptime(d, "%Y-%m-%dT%H:%M:%S.%fZ").strftime("%d/%m/%Y")
        return d.strftime("%d/%m/%Y")
    except Exception as e:
        logger.warning(f"Lỗi định dạng ngày {d}: {str(e)}")
        return str(d)

# Hàm định dạng vị trí
def format_location(loc):
    if not loc or 'coordinates' not in loc:
        logger.debug("Không có thông tin vị trí")
        return "Không có thông tin vị trí."
    return f"Địa chỉ: {loc.get('address', 'N/A')}, Tọa độ: {loc['coordinates']}"

# Hàm định dạng tình nguyện viên
def format_volunteers(volunteers):
    if not volunteers:
        logger.debug("Không có tình nguyện viên")
        return "Không có tình nguyện viên."
    return f"Tổng số: {len(volunteers)}, Trạng thái: {', '.join([v['status'] for v in volunteers[:3]])}" + \
           (f" và {len(volunteers) - 3} người khác" if len(volunteers) > 3 else "")

# Hàm định dạng donation campaign
def format_donation_campaign(d):
    return f"- Tiêu đề: {d['title']}\n" \
           f"  Mô tả: {d.get('description', 'N/A')}\n" \
           f"  Mục tiêu: {d['goalAmount']}\n" \
           f"  Đã quyên góp: {d['currentAmount']}\n" \
           f"  Trạng thái: {d.get('status', 'N/A')}\n" \
           f"  Tình trạng duyệt: {d.get('approvalStatus', 'N/A')}"

# Hàm định dạng donor profile
def format_donor_profile(d):
    campaigns = d.get('donatedCampaigns', [])
    return f"- Tổng số tiền đã quyên góp: {d['totalDonated']}\n" \
           f"  Số chiến dịch đã tham gia: {len(campaigns)}\n" \
           f"  Ẩn danh mặc định: {'Có' if d['anonymousDefault'] else 'Không'}"

# Hàm định dạng user
def format_user(u):
    return f"- Họ tên: {u['fullName']}\n" \
           f"  Email: {u['email']}\n" \
           f"  Vai trò: {u['role']}\n" \
           f"  Trạng thái: {u['status']}\n" \
           f"  Số chiến dịch tham gia: {len(u.get('joinedCampaigns', []))}"

# Hàm chính để xử lý câu hỏi

def answer_user_question(user_input: str):
    logger.info(f"Xử lý câu hỏi: {user_input}")
    
    user_input_lower = user_input.lower()
    query = {}
    intent = None
    collection = campaign_collection

    # Phân loại ý định câu hỏi
    if any(keyword in user_input_lower for keyword in ["sắp tới", "upcoming", "sắp diễn ra"]):
        intent = "query_upcoming_campaigns"
        query = {"status": "upcoming"}
    elif any(keyword in user_input_lower for keyword in ["đang chạy", "đang diễn ra", "in-progress"]):
        intent = "query_active_campaigns"
        query = {"status": "in-progress"}
    elif any(keyword in user_input_lower for keyword in ["kết thúc", "completed"]):
        intent = "query_completed_campaigns"
        query = {"status": "completed"}
    elif any(keyword in user_input_lower for keyword in ["ngân sách", "budget"]):
        intent = "query_budget"
        query = {}
    elif any(keyword in user_input_lower for keyword in ["tình nguyện", "volunteer"]):
        intent = "query_volunteers"
        query = {"volunteers": {"$ne": []}}
    elif any(keyword in user_input_lower for keyword in ["địa điểm", "vị trí", "location", "địa chỉ"]):
        intent = "query_location"
        query = {"location": {"$exists": True}}
    elif any(keyword in user_input_lower for keyword in ["mô tả", "description"]):
        intent = "query_description"
        query = {"description": {"$ne": ""}}
    elif any(keyword in user_input_lower for keyword in ["chứng nhận", "certificate"]):
        intent = "query_certificates"
        query = {"certificatesIssued": True}
    elif any(keyword in user_input_lower for keyword in ["quyên góp", "donation", "donate"]):
        intent = "query_donation_campaigns"
        collection = donation_campaign_collection
        query = {"status": "active"}
    elif any(keyword in user_input_lower for keyword in ["nhà tài trợ", "donor", "tài trợ"]):
        intent = "query_donor_profiles"
        collection = donor_profile_collection
        query = {}
    elif any(keyword in user_input_lower for keyword in ["người dùng", "user", "thành viên"]):
        intent = "query_users"
        collection = user_collection
        query = {}
    else:
        intent = "general_query"
        logger.debug("Câu hỏi tổng quát, không sử dụng OpenAI để tự bịa")

    logger.info(f"Ý định: {intent}, Truy vấn MongoDB: {query}, Collection: {collection.name}")

    # Trường hợp câu hỏi tổng quát: Không để OpenAI tự bịa
    if intent == "general_query":
        return "Xin lỗi nha, em chưa hiểu rõ câu hỏi hoặc không có dữ liệu phù hợp. Anh/chị hỏi cụ thể hơn về chiến dịch, quyên góp, nhà tài trợ, hoặc người dùng được không ạ?"

    # Truy vấn MongoDB
    try:
        docs = list(collection.find(query).limit(5))
        logger.info(f"Tìm thấy {len(docs)} document trong MongoDB")
        logger.debug(f"Dữ liệu truy xuất: {docs}")
    except Exception as e:
        logger.error(f"Lỗi truy vấn MongoDB: {str(e)}")
        return "Có lỗi khi kết nối dữ liệu. Vui lòng thử lại sau nha!"

    if not docs:
        logger.warning(f"Không tìm thấy dữ liệu phù hợp cho câu hỏi: {user_input}")
        return f"Không tìm thấy thông tin nào về {user_input} cả. Anh/chị thử hỏi cụ thể hơn nhé!"

    # Tạo summary dựa trên collection
    summary = ""
    if collection == campaign_collection:
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
    elif collection == donation_campaign_collection:
        summary = "\n".join(format_donation_campaign(d) for d in docs)
    elif collection == donor_profile_collection:
        summary = "\n".join(format_donor_profile(d) for d in docs)
    elif collection == user_collection:
        summary = "\n".join(format_user(d) for d in docs)

    logger.debug(f"Summary dữ liệu: {summary}")

    # Tạo schema cho prompt
    schema = ""
    if collection == campaign_collection:
        schema = """Dữ liệu chiến dịch có các trường:
- name: Tên chiến dịch (string)
- description: Mô tả chiến dịch (string)
- startDate: Ngày bắt đầu (Date)
- endDate: Ngày kết thúc (Date)
- location: Vị trí (address: string, coordinates: [number, number])
- volunteers: Danh sách tình nguyện viên (user, status: pending/approved/rejected, evaluation, feedback)
- certificatesIssued: Chứng nhận đã phát hành (boolean)
- status: Trạng thái (upcoming, in-progress, completed)"""
    elif collection == donation_campaign_collection:
        schema = """Dữ liệu chiến dịch quyên góp có các trường:
- title: Tiêu đề chiến dịch (string)
- description: Mô tả chiến dịch (string)
- goalAmount: Số tiền mục tiêu (number)
- currentAmount: Số tiền hiện tại (number)
- approvalStatus: Tình trạng duyệt (pending, approved, rejected)
- status: Trạng thái (draft, active, completed)
- createdBy: Người tạo (ObjectId, ref User)"""
    elif collection == donor_profile_collection:
        schema = """Dữ liệu hồ sơ nhà tài trợ có các trường:
- userId: ID người dùng (ObjectId, ref User)
- totalDonated: Tổng số tiền đã quyên góp (number)
- donatedCampaigns: Danh sách chiến dịch đã quyên góp (campaignId, totalAmount)
- anonymousDefault: Ẩn danh mặc định (boolean)"""
    elif collection == user_collection:
        schema = """Dữ liệu người dùng có các trường:
- fullName: Họ tên (string)
- email: Email (string)
- phone: Số điện thoại (string)
- role: Vai trò (user, admin, organization, manager)
- status: Trạng thái (active, inactive)
- joinedCampaigns: Danh sách chiến dịch tham gia (ObjectId, ref Campaign)
- date_of_birth: Ngày sinh (Date)"""

    prompt = f"""{schema}

Dữ liệu truy xuất:
{summary}

Câu hỏi: {user_input}
→ Trả lời bằng tiếng Việt với giọng điệu tự nhiên, thân thiện, gần gũi như một người bạn đang trò chuyện. Sử dụng các từ như "nha", "nhé", "hơi bị" để tăng tính sinh động, nhưng vẫn giữ được sự chuyên nghiệp. 
→ Chỉ sử dụng thông tin từ dữ liệu trên, KHÔNG được suy đoán hoặc thêm thông tin ngoài. Nếu không có đủ thông tin, hãy nói một cách khéo léo như "Chưa có thông tin này nha, để mình kiểm tra thêm nhé!".
→ Tránh lặp lại từ khóa như "trạng thái" hoặc "upcoming" một cách cứng nhắc, thay vào đó dùng cách diễn đạt tự nhiên như "sắp khởi động", "đang chạy", "đã xong".
"""

    return call_openai_direct(prompt)

def call_openai_direct(prompt: str) -> str:
    logger.debug(f"Prompt cho OpenAI: {prompt}")
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}]
        )
        answer = response.choices[0].message.content
        logger.info(f"Phản hồi từ OpenAI: {answer}")
        return answer
    except Exception as e:
        logger.error(f"Lỗi khi gọi OpenAI: {str(e)}")
        return "Em xin lỗi, có lỗi khi xử lý câu hỏi. Vui lòng thử lại nhé!"