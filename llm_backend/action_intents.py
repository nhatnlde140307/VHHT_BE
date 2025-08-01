def normalize_user_input(user_input: str) -> str:
    return user_input.lower().strip()

def handle_action_intents(user_input_lower: str) -> str | None:
    if "nhận chứng chỉ" in user_input_lower or "cấp chứng chỉ" in user_input_lower:
        return (
            "Thông thường chứng chỉ sẽ được cấp khi bạn hoàn thành đủ nhiệm vụ được giao và chiến dịch kết thúc. "
            "Nếu bạn thắc mắc về tình trạng của mình, cứ liên hệ ban tổ chức nha 💬"
        )

    return None
