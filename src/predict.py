import itertools
import json
from pathlib import Path

import numpy as np
import pandas as pd
import torch

from src.model import DrugInteractionGNN

_PROC = Path("data/processed")
_MAP  = Path("data/mappings")
_CATS = Path("data/datasets/bio-decagon-effectcategories/bio-decagon-effectcategories.csv")

_SEVERITY_MAP = {
    "cardiovascular system disease":  "CRITICAL",
    "hematopoietic system disease":   "CRITICAL",
    "hematopoietic system diseases":  "CRITICAL",
    "respiratory system disease":     "HIGH",
    "thoracic disease":               "HIGH",
    "urinary system disease":         "HIGH",
    "gastrointestinal system disease": "MODERATE",
    "nervous system disease":         "MODERATE",
}

_SE_PROB_THRESHOLD = 0.3
_TOP_SE_LIMIT      = 20
_TOP_PAIR_SE_LIMIT = 5


def _load_json(path) -> dict:
    with open(path) as f:
        return json.load(f)


def _build_category_maps(se_to_idx: dict, cats_path: Path) -> tuple[dict, dict]:
    idx_to_category: dict[int, str] = {}
    idx_to_severity: dict[int, str] = {}
    try:
        df      = pd.read_csv(cats_path, low_memory=False)
        id_col  = df.columns[0]
        cat_col = next(
            (c for c in df.columns if "class" in c.lower() or "category" in c.lower()),
            df.columns[-1],
        )
        for _, row in df.iterrows():
            se_id = str(row[id_col]).strip()
            idx   = se_to_idx.get(se_id)
            if idx is not None:
                category = str(row[cat_col]).strip()
                idx_to_category[int(idx)] = category
                idx_to_severity[int(idx)] = _SEVERITY_MAP.get(category.lower(), "LOW")
    except FileNotFoundError:
        pass
    return idx_to_category, idx_to_severity


class DrugInteractionPredictor:

    def __init__(self, model_path: str):
        # Load everything to CPU first; promote to GPU only if all allocations succeed
        self.device = torch.device("cpu")

        self.drug_to_idx = _load_json(_MAP / "drug_to_idx.json")
        self.num_drugs   = len(self.drug_to_idx)

        se_to_idx  = _load_json(_MAP / "se_to_idx.json")
        se_to_name = _load_json(_MAP / "se_to_name.json")
        self.num_se = len(se_to_idx)

        self.idx_to_name = {
            int(idx): str(se_to_name.get(se_id, se_id)).title()
            for se_id, idx in se_to_idx.items()
        }
        self.idx_to_category, self.idx_to_severity = _build_category_maps(se_to_idx, _CATS)

        drug_features     = np.load(_PROC / "drug_features.npy")
        self.drug_feat_t  = torch.tensor(drug_features, dtype=torch.float32)
        self.edge_index_t = torch.load(_PROC / "full_edge_index.pt", weights_only=True)

        num_proteins = len(_load_json(_MAP / "protein_to_idx.json"))

        self.model = DrugInteractionGNN(
            drug_feature_dim = drug_features.shape[1],
            num_proteins     = num_proteins,
            num_side_effects = self.num_se,
        )
        self.model.load_state_dict(torch.load(model_path, map_location="cpu", weights_only=True))
        self.model.eval()

        # Try GPU: run the actual encode as the test — if it succeeds, keep result and device
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            try:
                feat_g = self.drug_feat_t.cuda()
                edge_g = self.edge_index_t.cuda()
                self.model.cuda()
                with torch.no_grad():
                    self._z = self.model.encode(feat_g, edge_g, self.num_drugs)
                self.drug_feat_t  = feat_g
                self.edge_index_t = edge_g
                self.device       = torch.device("cuda")
                return
            except (torch.cuda.OutOfMemoryError, RuntimeError):
                torch.cuda.empty_cache()
                self.model.cpu()

        with torch.no_grad():
            self._z = self.model.encode(self.drug_feat_t, self.edge_index_t, self.num_drugs)

    def get_available_drugs(self) -> list:
        return sorted(self.drug_to_idx.keys())

    def predict(self, drug_names: list) -> dict:
        normalized = [str(d).strip().upper() for d in drug_names]
        missing    = [d for d in normalized if d not in self.drug_to_idx]
        if missing:
            raise ValueError(f"Unknown drug(s): {', '.join(missing)}")

        pairs      = list(itertools.combinations(normalized, 2))
        pair_t     = torch.tensor(
            [[self.drug_to_idx[a], self.drug_to_idx[b]] for a, b in pairs],
            dtype=torch.long,
            device=self.device,
        )

        with torch.no_grad():
            se_logits   = self.model.decode_side_effects(self._z, pair_t)
            se_probs    = torch.sigmoid(se_logits)
            harm_scores = torch.sigmoid(
                self.model.decode_harmfulness(se_probs)
            ).squeeze(1).cpu().numpy()
            se_probs_np = se_probs.cpu().numpy()

        max_harm   = float(harm_scores.max())
        harmful    = max_harm > 0.5
        risk_level = "HIGH" if max_harm > 0.7 else ("MEDIUM" if max_harm > 0.4 else "LOW")

        # Aggregate SEs across all pairs by max probability
        max_se_probs = se_probs_np.max(axis=0)
        top_idxs     = np.where(max_se_probs > _SE_PROB_THRESHOLD)[0]
        top_idxs     = top_idxs[np.argsort(-max_se_probs[top_idxs])][:_TOP_SE_LIMIT]

        side_effects = [
            {
                "name":        self.idx_to_name.get(int(i), f"SE_{i}"),
                "probability": round(float(max_se_probs[i]), 4),
                "category":    self.idx_to_category.get(int(i), "Unknown"),
                "severity":    self.idx_to_severity.get(int(i), "LOW"),
            }
            for i in top_idxs
        ]

        pair_details = []
        for p_idx, (a, b) in enumerate(pairs):
            p_probs  = se_probs_np[p_idx]
            top_p    = np.argsort(-p_probs)[:_TOP_PAIR_SE_LIMIT]
            top_p    = top_p[p_probs[top_p] > _SE_PROB_THRESHOLD]
            pair_details.append({
                "drug_a":           a,
                "drug_b":           b,
                "top_side_effects": [self.idx_to_name.get(int(i), f"SE_{i}") for i in top_p],
                "pair_harm_score":  round(float(harm_scores[p_idx]), 4),
            })

        return {
            "harmful":        harmful,
            "confidence":     round(max_harm, 4),
            "risk_level":     risk_level,
            "drug_count":     len(drug_names),
            "pairs_analyzed": len(pairs),
            "side_effects":   side_effects,
            "pair_details":   pair_details,
        }
