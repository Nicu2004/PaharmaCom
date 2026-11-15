from typing import List, Literal, Optional

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import aiConnect

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    # the Vite dev server; requests tunnelled through the /ai proxy are same-origin anyway
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"https://.*\.trycloudflare\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Turn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AnalysisRequest(BaseModel):
    symptoms: str
    image_base64: Optional[List[str]] = None
    # earlier turns, so a follow-up answer is understood in context
    history: Optional[List[Turn]] = None


@app.get("/app")
async def get_app():
    return {"message": "Hello from FastAPI!"}


@app.get("/health")
async def health():
    return {"status": "ok", "model": aiConnect.MODEL, "ollama": aiConnect.OLLAMA_HOST}


@app.post("/analyze_symptoms")
def analyze_symptoms_endpoint(body: AnalysisRequest):
    images = body.image_base64 or []
    history = [turn.model_dump() for turn in (body.history or [])]

    # Never print the base64 strings themselves: they are megabytes long and they are
    # photos of someone's body. Count them instead.
    print(f"[triage] symptoms={len(body.symptoms)} chars, images={len(images)}, history={len(history)} turns")

    result = aiConnect.analyze_symptoms(body.symptoms, images, history)

    if result.get("escalated_by_rules"):
        print(f"[triage] rules escalated to {result['triage_level']}: {result.get('rule_flags')}")

    # "analysis" stays a plain string for the chat bubble; the structured data goes in "triage"
    return {"analysis": result.get("message", ""), "triage": result}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
