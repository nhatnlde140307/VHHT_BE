import os
from langchain.chat_models import ChatOpenAI
from langchain.schema import HumanMessage

# Gắn đúng key và endpoint
os.environ["OPENAI_API_KEY"] = "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"  # thay key OpenRouter thật vào
os.environ["OPENAI_API_BASE"] = "https://openrouter.ai/api/v1"

chat = ChatOpenAI(
    model_name="openai/gpt-3.5-turbo",  # hoặc model nào bạn enable
    temperature=0.3
)

response = chat([HumanMessage(content="Xin chào bạn là ai vậy?")])
print(response.content)