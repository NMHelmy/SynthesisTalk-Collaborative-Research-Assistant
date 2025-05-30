from dotenv import load_dotenv
import os
import re
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from collections import defaultdict
from pydantic import BaseModel
from duckduckgo_search import DDGS

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
            "You are an AI agent that thinks step by step and acts when needed.\n"
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
    lines = [f"- {r.get('title','(no title)')}: {r.get('body','').strip()}" for r in results]
    return "\n".join(lines) or "No results found."

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

# Chat endpoint supporting Normal, CoT, and ReAct
@app.post("/chat")
async def chat(req: ChatRequest):
    sid = req.session_id
    mode = req.mode.lower()
    prompt = req.prompt.strip()

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


    elif mode == 'cot':
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
