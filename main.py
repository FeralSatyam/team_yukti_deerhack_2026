from contextlib import asynccontextmanager
from typing import Any

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from src.predict import DrugInteractionPredictor

MODEL_PATH = "models/best_model.pt"

predictor: DrugInteractionPredictor | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global predictor
    predictor = DrugInteractionPredictor(MODEL_PATH)
    yield


app = FastAPI(title="Drug Interaction API", lifespan=lifespan)


class PredictRequest(BaseModel):
    drugs: list[str]


@app.get("/")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict")
def predict(req: PredictRequest) -> dict[str, Any]:
    if len(req.drugs) < 2:
        raise HTTPException(status_code=400, detail="At least 2 drug names are required.")
    try:
        return predictor.predict(req.drugs)
    except (KeyError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/drugs")
def get_drugs() -> list[str]:
    return predictor.get_available_drugs()


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
