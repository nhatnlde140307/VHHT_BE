import os
import requests
import logging
from bson import ObjectId
from utils import extract_campaign_name
from database import campaign_collection
from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:4000")

def register_campaign_from_input(user_input: str, token: str = None):
    if not token:
        return "Anh/chị cần đăng nhập trước khi đăng ký chiến dịch nha 🫣!"

    name = extract_campaign_name(user_input)
    if not name:
        return "Em chưa nhận ra tên chiến dịch nào trong câu nói 😵 Anh/chị nói rõ hơn nha!"

    campaign = campaign_collection.find_one({
        "name": {"$regex": f"^{name}$", "$options": "i"},
        "acceptStatus": "approved"
    })
    if not campaign:
        return f"Em không tìm thấy chiến dịch tên **{name}** đã được duyệt á 😢"

    campaign_id = str(campaign["_id"])
    url = f"{BACKEND_URL}/campaigns/{campaign_id}/register"

    try:
        response = requests.post(
            url,
            headers={"Authorization": token}
        )
        if response.status_code == 200:
            return f"🎉 Đăng ký thành công vào chiến dịch **{name}** 💪, đợi được duyệt nhé!"
        elif response.status_code == 400:
            return f"📌 Anh/chị đã đăng ký chiến dịch **{name}** trước đó rồi đó nha!"
        elif response.status_code == 401:
            return f"🚫 Token không hợp lệ rồi anh/chị ơi. Đăng nhập lại giúp em nhen!"
        else:
            return f"⚠️ Lỗi khi đăng ký vào chiến dịch **{name}** – Mã lỗi {response.status_code}"
    except Exception as e:
        logger.error(f"❌ Lỗi khi gọi API đăng ký: {e}")
        return "Hic, có lỗi gì đó khi em cố gắng đăng ký giúp anh/chị 😭"
