from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import UploadFile, File
from routers import files, upload, extract
from dotenv import load_dotenv
from collections import defaultdict
from pydantic import BaseModel
from duckduckgo_search import DDGS
import os
import requests
import re

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

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],  # Replace "*" with frontend origin in production
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

# In-memory session history
session_histories = defaultdict(list)

# Request schema for chat
class ChatRequest(BaseModel):
    session_id: str
    prompt: str
    mode: str = "normal"  # normal, cot, react

# Mode-specific system prompts
def get_system_prompt(mode: str) -> str:
    if mode == 'normal':
        return "You are a helpful assistant. Provide concise, direct answers without revealing your reasoning."
    elif mode == 'cot':
        return "You are a thoughtful assistant. Let's think step by step and show your reasoning."
    elif mode == 'react':
        return (
            "You are an AI agent that thinks step by step and acts when needed.\n"
            "Use this format:\n"
            "Thought: [reasoning]\n"
            "Action: [tool][query]\n"
            "When you receive an observation, continue with:\n"
            "Observation: [result]\n"
            "Thought: [interpret the observation]\n"
            "Answer: [final answer]"
        )
    return "You are a helpful assistant."

# DuckDuckGo search tool
def run_search(query: str) -> str:
    with DDGS() as ddgs:
        results = ddgs.text(query, max_results=5)
        for r in results:
            return r["body"]
    return "No results found."

# Core LLM call wrapper
def call_llm(messages: list) -> str:
    payload = {
        "model": MODEL,
        "messages": messages,
        "temperature": 0.7,
        "top_p": 0.9
    }
    resp = requests.post(f"{BASE_URL}/chat/completions", json=payload, headers=headers)
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]

# Final POST chat endpoint
@app.post("/api/chat")
async def chat(req: ChatRequest):
    sid = req.session_id
    mode = req.mode.lower()
    prompt = req.prompt.strip()

    history = session_histories[sid]
    system_msg = {"role": "system", "content": get_system_prompt(mode)}
    messages = [system_msg] + history + [{"role": "user", "content": prompt}]

    if mode == 'react':
        initial_response = call_llm(messages)
        action_match = re.search(r"Action:\s*(\w+)\[(.*?)\]", initial_response)

        if action_match and action_match.group(1).lower() == 'search':
            query = action_match.group(2).strip()
            observation = run_search(query)

            messages += [
                {"role": "assistant", "content": initial_response},
                {"role": "system", "content": f"Observation: {observation}"}
            ]
            followup_response = call_llm(messages)

            reply = f"{initial_response}\n\nObservation: {observation}\n\n{followup_response}"
        else:
            reply = initial_response

    elif mode == 'cot':
        raw = call_llm(messages)
        if any(raw.lower().startswith(prefix) for prefix in ["let's think step by step", "let's break this down"]):
            reply = raw
        else:
            reply = f"Let's think step by step:\n{raw}"

    else:
        reply = call_llm(messages)

    history.append({"role": "user", "content": prompt})
    history.append({"role": "assistant", "content": reply})

    return {"response": reply}
