import { api } from "./client";

export async function predictInteractions(medications) {
  const data = await api.post("/predict", { drugs: medications });
  // Backend returns { cacheHit, hash, drugs, result }; result is the raw ML payload.
  if (!data || typeof data.result !== "object") {
    throw new Error("Malformed response from prediction service.");
  }
  return data.result;
}

export async function fetchDrugCatalog() {
  const data = await api.get("/drugs");
  // Backend returns { source, drugs: string[] }
  return Array.isArray(data) ? data : (data?.drugs ?? []);
}
