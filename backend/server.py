from typing import Optional, List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

import aiConnect

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalysisRequest(BaseModel):
    symptoms: str
    image_base64: Optional[List[str]] = []


@app.get("/app")
async def get_app():
    return {"message": "Hello from FastAPI!"}

@app.post("/analyze_symptoms")
def analyze_symptoms_endpoint(body: AnalysisRequest):
    print("Symptoms text:", body.symptoms)
    print(f"Number of images received: {len(body.image_base64)}")
    print(f"Number of images analyzed: {str(body.image_base64)}")

    # 2. Pass both the text and the list of images to your AI service
    # Make sure to update aiConnect.analyze_symptoms() to accept the second argument
    analysis = aiConnect.analyze_symptoms(body.symptoms, body.image_base64)

    return {"analysis": analysis}