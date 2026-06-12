import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import SAGEConv, BatchNorm as PyGBatchNorm


class DrugInteractionGNN(nn.Module):

    def __init__(
        self,
        drug_feature_dim: int,
        num_proteins: int,
        num_side_effects: int,
        protein_embed_dim: int = 256,
        hidden_dim: int = 256,
        embed_dim: int = 128,
        dropout: float = 0.3,
    ):
        super().__init__()
        self.num_proteins    = num_proteins
        self.embed_dim       = embed_dim
        self.num_side_effects = num_side_effects

        self.protein_embedding = nn.Embedding(num_proteins, protein_embed_dim)
        self.drug_proj         = nn.Linear(drug_feature_dim, hidden_dim)
        self.protein_proj      = nn.Linear(protein_embed_dim, hidden_dim)

        self.conv1 = SAGEConv(hidden_dim, hidden_dim)
        self.bn1   = PyGBatchNorm(hidden_dim)
        self.conv2 = SAGEConv(hidden_dim, embed_dim)
        self.bn2   = PyGBatchNorm(embed_dim)

        self.dropout = nn.Dropout(dropout)

        self.diag_matrices = nn.Parameter(torch.empty(num_side_effects, embed_dim))
        nn.init.xavier_uniform_(self.diag_matrices)

        self.harm_head = nn.Sequential(
            nn.Linear(num_side_effects, 128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, 1),
        )

    def encode(self, drug_features: torch.Tensor, edge_index: torch.Tensor, num_drugs: int) -> torch.Tensor:
        x_drug = F.relu(self.drug_proj(drug_features))
        prot_idx = torch.arange(self.num_proteins, device=drug_features.device)
        x_prot = F.relu(self.protein_proj(self.protein_embedding(prot_idx)))
        x = torch.cat([x_drug, x_prot], dim=0)
        x = self.dropout(F.relu(self.bn1(self.conv1(x, edge_index))))
        x = self.dropout(F.relu(self.bn2(self.conv2(x, edge_index))))
        return x

    def decode_side_effects(self, z: torch.Tensor, drug_pairs: torch.Tensor) -> torch.Tensor:
        z_i = z[drug_pairs[:, 0]]
        z_j = z[drug_pairs[:, 1]]
        return (z_i.unsqueeze(1) * self.diag_matrices.unsqueeze(0) * z_j.unsqueeze(1)).sum(dim=-1)

    def decode_harmfulness(self, se_probs: torch.Tensor, freq_weights: torch.Tensor | None = None) -> torch.Tensor:
        if freq_weights is not None:
            se_probs = se_probs * freq_weights.unsqueeze(0)
        return self.harm_head(se_probs)

    def forward(self, drug_features, edge_index, drug_pairs, num_drugs, freq_weights=None):
        z = self.encode(drug_features, edge_index, num_drugs)
        se_logits = self.decode_side_effects(z, drug_pairs)
        se_probs  = torch.sigmoid(se_logits)
        return se_logits, self.decode_harmfulness(se_probs, freq_weights)
