from flask import Flask, request, Response
from ai_logic import answer_user_question
from flask_cors import CORS
import json  # 🆕

app = Flask(__name__)
CORS(app)  # Cho phép gọi từ Postman hoặc frontend

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        print("📥 Input:", data)

        user_input = data.get("message", "")
        reply = answer_user_question(user_input)
        print("🤖 Reply:", reply)

        return Response(
            response=json.dumps({"reply": reply}, ensure_ascii=False),
            status=200,
            mimetype="application/json"
        )
    except Exception as e:
        print("❌ Error:", e)
        return Response(
            response=json.dumps({"error": str(e)}, ensure_ascii=False),
            status=500,
            mimetype="application/json"
        )

if __name__ == "__main__":
    app.run(debug=True)