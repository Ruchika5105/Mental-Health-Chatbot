import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def call_llm(system_prompt: str, messages: list, temperature: float = 0.7) -> str:
    response = _client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "system", "content": system_prompt}] + messages,
        max_tokens=1000,
        temperature=temperature
    )
    return response.choices[0].message.content

def confirm_crisis(message: str) -> float:
    """Ask LLM to rate crisis risk 0–10. Returns 0.0–1.0."""
    prompt = """Rate the crisis/suicide risk of this message 0 to 10.
0 = completely safe. 10 = immediate danger to life.
Reply with ONE number only. Nothing else."""
    try:
        resp = _client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user",   "content": message}
            ],
            max_tokens=5,
            temperature=0.1
        )
        score = float(resp.choices[0].message.content.strip())
        return min(score / 10.0, 1.0)
    except:
        return 0.0