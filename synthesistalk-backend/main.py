# backend/main.py

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import files, upload, extract
from dotenv import load_dotenv
import os
import requests
from duckduckgo_search import DDGS  # required for run_search

# Load environment variables
load_dotenv()

API_KEY = os.getenv("NGU_API_KEY")
BASE_URL = os.getenv("NGU_BASE_URL")
MODEL = os.getenv("NGU_MODEL")

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

app = FastAPI()

# Enable CORS for both frontend communication and LLM integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],  # "*" should be replaced in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploaded files statically
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Register routers
app.include_router(files.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(extract.router, prefix="/api")

@app.get("/")
def root():
    return {"status": "SynthesisTalk Backend Running"}

@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    prompt = data.get("prompt")
    mode = data.get("mode", "normal")

    if not prompt:
        return {"error": "Prompt is required"}

    # Default system message
    system_prompt = "You are a helpful assistant."

    # Chain-of-Thought Mode
    if mode == "cot":
        system_prompt = "You are a thoughtful assistant. Explain your answer step by step."
        prompt = f"Let's think step by step: {prompt}"

    # ReAct Mode
    elif mode == "react":
        system_prompt = (
            "You are an agent that reasons and uses tools.\n"
            "Use this format:\n"
            "Thought: ...\n"
            "Action: ...\n"
            "Observation: ...\n"
            "Final Answer: ..."
        )

    # Build initial payload
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
    }

    try:
        response = requests.post(f"{BASE_URL}/chat/completions", json=payload, headers=headers)
        response.raise_for_status()
        reply = response.json()["choices"][0]["message"]["content"]

        # ReAct follow-up logic
        if mode == "react" and "Action:" in reply:
            lines = reply.splitlines()
            action_line = next((line for line in lines if line.startswith("Action:")), None)

            if action_line and "Search[" in action_line:
                search_term = action_line.split("Search[")[-1].rstrip("] ")
                observation = run_search(search_term)

                # Continue reasoning after observation
                react_prompt = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                    {"role": "assistant", "content": reply},
                    {"role": "user", "content": f"Observation: {observation}\nFinal Answer:"}
                ]

                followup = {
                    "model": MODEL,
                    "messages": react_prompt
                }

                final = requests.post(f"{BASE_URL}/chat/completions", json=followup, headers=headers)
                final.raise_for_status()
                final_reply = final.json()["choices"][0]["message"]["content"]

                return {"response": f"{reply}\n\n{final_reply}"}

        return {"response": reply}

    except Exception as e:
        return {"error": str(e)}

def run_search(query: str) -> str:
    with DDGS() as ddgs:
        results = ddgs.text(query)
        for r in results:
            return r["body"]
    return "No results found."
