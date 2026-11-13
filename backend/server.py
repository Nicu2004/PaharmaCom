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
    symptoms: str = Field(min_length=1, max_length=4000)

@app.get("/app")
async def get_app():
    return {"message": "Hello from FastAPI!"}


@app.post("/analyze_symptoms")
def analyze_symptoms_endpoint(body: AnalysisRequest):
    analysis = aiConnect.analyze_symptoms(body.symptoms)
    return {"analysis": analysis}


