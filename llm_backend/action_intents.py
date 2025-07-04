def normalize_user_input(user_input: str) -> str:
    return user_input.lower().strip()

def handle_action_intents(user_input_lower: str) -> str | None:
    if any(kw in user_input_lower for kw in ["đăng ký", "đăng kí", "cách đăng", "điền form"]):
        return (
            "Anh/chị muốn đăng ký tham gia hả? "
            "Chỉ cần vào trang chi tiết chiến dịch và nhấn nút 'Đăng ký tham gia' đợi phê duyệt nhé! "
            "Nếu chưa có tài khoản thì mình cần đăng nhập trước nha "
        )
    
    if "nhận chứng chỉ" in user_input_lower or "cấp chứng chỉ" in user_input_lower:
        return (
            "Thông thường chứng chỉ sẽ được cấp khi bạn hoàn thành đủ nhiệm vụ được giao và chiến dịch kết thúc. "
            "Nếu bạn thắc mắc về tình trạng của mình, cứ liên hệ ban tổ chức nha 💬"
        )

    if "nhiệm vụ" in user_input_lower or "làm gì" in user_input_lower:
        return (
            "Nhiệm vụ cụ thể sẽ được giao sau khi bạn đăng ký và được phê duyệt nha. ✨\n"
            "Bạn có thể xem các giai đoạn và ngày cụ thể để biết thêm thông tin nữa nè! 💡"
        )

    # Có thể mở rộng thêm nhiều hành động khác ở đây

    return None
