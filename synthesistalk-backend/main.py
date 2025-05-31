from dotenv import load_dotenv
import os
import re
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from collections import defaultdict
from pydantic import BaseModel
from duckduckgo_search import DDGS
from datetime import datetime
import json  
from typing import List, Dict


# Load environment variables
load_dotenv()
API_KEY  = os.getenv("NGU_API_KEY")
BASE_URL = os.getenv("NGU_BASE_URL")
MODEL    = os.getenv("NGU_MODEL")

# Initialize FastAPI and enable CORS
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory chat history (stores only user & assistant roles)
session_histories = defaultdict(list)

# Request schema for chat
class ChatRequest(BaseModel):
    session_id: str
    prompt:     str
    mode:       str = "normal"  # one of: normal, cot, react

# System prompt generator for each mode
def get_system_prompt(mode: str) -> str:
    if mode == 'normal':
        return "You are a helpful assistant. Provide concise, direct answers without revealing your reasoning."
    elif mode == 'cot':
        return "You are a thoughtful assistant. Let's think step by step and show your reasoning."
    elif mode == 'react':
        return (
            "You are an AI agent that thinks and acts when needed.\n"
            "Use this format:\n"
            "Thought: [reasoning]\n"
            "Action: [tool][query]\n"
            "When you receive an observation, continue with:\n"
            "Observation: [result]\n"
            "Thought: [interpret the observation]\n"
            "Answer: [final answer]"
        )
    return "You are a helpful assistant. Provide concise, direct answers without revealing your reasoning."

# DuckDuckGo search tool
def search_web(query: str) -> str:
    with DDGS() as ddgs:
        results = ddgs.text(query, max_results=5)

    lines = []
    for r in results:
        title = r.get("title", "(no title)")
        body = r.get("body", "").strip()
        href = r.get("href", "")
        lines.append(f"- <a href='{href}' target='_blank'><strong>{title}</strong></a><br>{body}")

    return "<br><br>".join(lines) or "No results found."


# Core LLM call wrapper
def call_llm(messages: list) -> str:
    payload = {"model": MODEL, "messages": messages, "temperature": 0.7, "top_p": 0.9}
    resp = requests.post(
        f"{BASE_URL}/chat/completions",
        json=payload,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type":  "application/json"
        }
    )
    resp.raise_for_status()
    return resp.json()['choices'][0]['message']['content']

def parse_number(value):
    try:
        value = value.lower().replace(",", "").strip()
        if "billion" in value:
            return float(value.split()[0]) * 1_000_000_000
        elif "million" in value:
            return float(value.split()[0]) * 1_000_000
        else:
            return float(value.split()[0])
    except:
        return None

# Web search endpoint (for Web Search button)
class SearchPayload(BaseModel):
    query: str

@app.post("/search")
async def search(payload: SearchPayload):
    result = search_web(payload.query)
    return {"results": result}

# Chat endpoint supporting Normal, CoT, and ReAct
@app.post("/chat")
async def chat(req: ChatRequest):
    sid = req.session_id
    mode = req.mode.lower()
    prompt = req.prompt.strip()

    # Handle direct date queries without LLM
    if re.search(r"\b(?:date|today)\b", prompt.lower()):
        today = datetime.now().strftime("%B %d, %Y")
        reply = f"Today's date is {today}."
        # Persist reply
        session_histories[sid].append({"role": "assistant", "content": reply})
        return {"response": reply}


    # Retrieve persisted history (user & assistant only)
    history = session_histories[sid]

    system_msg = {"role": "system", "content": get_system_prompt(mode)}
    messages = [system_msg] + history + [{"role": "user", "content": prompt}]

    # Determine response based on mode
    if mode == 'react':
        # Step 1: Let the model reason and decide if action is needed
        initial_response = call_llm(messages)
        action_match = re.search(r"Action:\s*(\w+)\[(.*?)\]", initial_response)

        if action_match and action_match.group(1).lower() == 'search':
            tool = action_match.group(1)
            query = action_match.group(2).strip()

            # Step 2: Perform the action (search)
            observation = search_web(query)

            # Step 3: Construct full response including the observation
            observation_msg = f"Observation: {observation}"
            messages += [
                {"role": "assistant", "content": initial_response},
                {"role": "system", "content": observation_msg}
            ]

            # Step 4: Ask the model to continue based on the observation
            followup_response = call_llm(messages)

            # Final formatted output
            reply = (
                f"{initial_response}\n\n"
                f"{observation_msg}\n\n"
                f"{followup_response}"
            )
        else:
            # No action found – fallback to just returning the thought/answer
            reply = call_llm(messages)


    if mode == 'cot':
        # Single pass CoT: show step-by-step reasoning then answer
        raw = call_llm(messages)
        if any(raw.lower().startswith(prefix) for prefix in ["let's think step by step", "let's break this down step by step"]):
            reply = raw
        else:
            reply = f"Let's think step by step:\n{raw}"


    else:
        # Normal mode: direct answer only
        reply = call_llm(messages)

    # Persist user and assistant messages only
    history.append({"role": "user", "content": prompt})
    history.append({"role": "assistant", "content": reply})

    return {"response": reply}

@app.post("/visualize")
async def visualize(req: Dict):
    import re

    text = req.get("text", "").strip()
    if not text:
        return {"data": []}

    # Try to extract lines like "Country: Number unit"
    pattern = r"(\b[\w\s]+):\s*([\d.,]+)\s*(billion|million)?"
    matches = re.findall(pattern, text, flags=re.IGNORECASE)

    insights = []
    for name, num, unit in matches:
        try:
            value = float(num.replace(",", ""))
            if unit:
                unit = unit.lower()
                if unit == "billion":
                    value *= 1_000_000_000
                elif unit == "million":
                    value *= 1_000_000
            insights.append({"label": name.strip(), "value": int(value)})
        except:
            continue

    return {"data": insights[:5]}  # limit to 5 results


