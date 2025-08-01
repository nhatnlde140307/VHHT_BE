import re

def extract_campaign_name(text: str):
    """
    Trích xuất tên chiến dịch từ các dạng câu phổ biến:
    - "Chiến dịch Mùa hè xanh"
    - "Tôi muốn tham gia Mùa hè xanh"
    - "Đăng ký cho tôi vào chiến dịch Mùa hè xanh đẹp"
    """
    # Bỏ dấu xuống dòng nếu có
    text = text.replace("\n", " ")

    # Dạng 1: chứa từ "chiến dịch"
    match1 = re.search(r"chiến dịch\s+(.+?)(?=\s+(có|gồm|với|được|là|\?|$))", text, re.IGNORECASE)
    if match1:
        return match1.group(1).strip().title()

    # Dạng 2: chứa từ "tham gia", "đăng ký", "vào" → lấy từ sau
    match2 = re.search(r"(?:tham gia|đăng ký|vào)\s+(chiến dịch\s+)?(.+)", text, re.IGNORECASE)
    if match2:
        return match2.group(2).strip().title()

    return None
