# SynthesisTalk - Paper Mind
#### Nour Helmy - Mai Waheed - Farida Mohamed

--- 

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)  
   - [Frontend](#frontend)  
   - [Backend](#backend)
   - [LLM Backend](#llm-backend)
3. [Features](#features)  
   - [Frontend (React)](#frontend-react)  
   - [Backend (FastAPI)](#backend-fastapi)
   - [LLM Integration](#llm-integration)
5. [Setup Instructions](#setup-instructions)  
   - [Backend (FastAPI)](#backend-fastapi-setup)  
   - [Frontend (React)](#frontend-react-setup)
   - [LLM Server Setup](#llm-server-setup)
6. [API Highlights](#api-highlights)
7. [Auth & Storage](#auth--storage)
8. [Sample Flow](#sample-flow)
9. [To-Do / Improvements](#to-do--improvements)

---

## Overview
SynthesisTalk is an AI-powered document conversation platform that lets users upload files (PDFs, Word docs, or text files), ask questions, get summarized key points, visualize insights, and explore results using reasoning modes like Chain-of-Thought (CoT) and ReAct.

## Tech Stack
### Frontend
- React.js
- Tailwind CSS
- Firebase Authentication & Firestore
- Chart.js / Recharts (for insights)
- React Router

### Backend
- FastAPI
- PyMuPDF, pdf2image, pytesseract (for text extraction)
- DuckDuckGo Search API (for ReAct mode)
- ReportLab / python-docx (for PDF/Word export)
- dotenv for API keys/config

### LLM Backend
- Python 3.10+
- FastAPI 
- OpenAI-compatible LLM API (e.g., NGU LLaMA API or OpenRouter)
- Models like: `qwen2.5-coder:7b`, `gpt-3.5`, or any chat-completion-compatible model

## Features
### Frontend (React)
- Secure user authentication with email verification
- Clean landing page, login, and signup flows
- Chat interface with:
  - File upload (.pdf, .docx, .txt)
  - Multi-mode LLM reasoning (Normal, CoT, ReAct)
  - Document-aware querying
  - Insight visualization (charts)
  - Key point summarization
  - Web search integration
  - Inline note-taking and chat history
  - Export chat to PDF or DOCX
 
### Backend (FastAPI)
- File handling with secure user-specific upload folders
- OCR fallback for image-only PDFs
- RESTful endpoints:
  - /api/chat: Chat completion (Normal, CoT, ReAct)
  - /api/extract: Extract text from uploaded files
  - /api/upload/{user_id}: Upload documents
  - /api/files: Manage uploaded files
  - /api/export: Generate PDF/DOCX reports
  - /api/search: Web search (ReAct)
  - /api/visualize: Extract structured insights for charts
 
### LLM Integration
SynthesisTalk uses a custom LLM backend powered by [NGU LLaMA API](https://ngullama.femtoid.com). This backend supports advanced prompt modes:
- **Normal**: Direct, concise assistant answers.
- **CoT (Chain of Thought)**: Step-by-step logical reasoning.
- **ReAct (Reasoning + Acting)**: Live web search integrated with reflective reasoning.

## Setup Instructions
### Backend (FastAPI)
1. Install dependencies:
```
pip install fastapi uvicorn python-multipart python-docx reportlab pytesseract PyMuPDF pdf2image python-dotenv duckduckgo-search
```
2. Install Tesseract (for OCR):
  - Ubuntu: sudo apt install tesseract-ocr
  - Windows: [Install Tesseract](https://github.com/tesseract-ocr/tesseract/wiki)
3. Run the server:
```
uvicorn main:app --reload
```

### Frontend (React)
1. Install dependencies:
```
npm install
```
2. Setup Firebase:
- Create a Firebase project
- Enable Email/Password authentication
- Update firebase.js with your config

3. Run the app:
```
npm start
```

### LLM Server Setup
You have two options:

Option 1: Use NGU API (Recommended)
- Visit https://ngullama.femtoid.com
- Get your API key
- Set .env variables as follows:
```
NGU_API_KEY=your_key
NGU_BASE_URL=https://ngullama.femtoid.com/v1
NGU_MODEL=qwen2.5-coder:7b
```

Option 2: Self-Host an OpenAI-Compatible Server
You can self-host a FastAPI-compatible chat API that supports /chat/completions

Popular backends:
- OpenRouter
- [llama.cpp](https://github.com/ggerganov/llama.cpp) + llm-api
- [LocalAI](https://github.com/go-skynet/LocalAI)

## API Highlights
- POST /api/chat: Chat with reasoning
- POST /api/extract: Upload + extract text
- GET /api/extract/{filename}: Extract existing uploaded file
- POST /api/upload/{user_id}: Upload files
- GET /api/files/{user_id}: List uploaded files
- DELETE /api/files/{filename}: Delete file
- POST /api/export: Export session as PDF/DOCX
- POST /api/search: Web search via DuckDuckGo
- POST /api/visualize: Extract numerical insights from text

## Auth & Storage
- Firebase handles:
- Signup/login
- Email verification
- Firestore-based chat saving
- Uploaded files are stored per user in /uploads/{user_id}/

## Sample Flow
- Login and upload one or more documents.
- Ask a question or request a summary.
- Visualize key data or run web search.
- Export the conversation as a PDF/Word doc.

## To-Do / Improvements
- Add drag-and-drop file support
- Add chat tagging or categories
- Real-time LLM streaming support
- Optional GPT API backend fallback
- Better error reporting and retry logic

