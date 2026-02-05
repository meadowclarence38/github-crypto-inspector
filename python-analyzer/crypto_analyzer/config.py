"""Benchmarks and constants for crypto repo analysis (top crypto repos averages)."""
from typing import Dict, Any

# Approximate benchmarks for "top" crypto repos (e.g. bitcoin, ethereum, solana)
# Used to flag repos that are far below these levels.
BENCHMARKS: Dict[str, Any] = {
    "stars_median": 5000,
    "stars_low": 500,
    "forks_median": 2000,
    "forks_low": 100,
    "watchers_low": 50,
    "commits_per_month_min": 10,
    "contributors_min": 5,
    "active_contributors_min": 3,
}

# Known crypto template patterns (for originality scan)
CRYPTO_TEMPLATE_SIGNATURES = [
    "openzeppelin",
    "OpenZeppelin",
    "ERC-20",
    "ERC20",
    "erc20",
    "ERC-721",
    "ERC721",
    "erc721",
    "@openzeppelin/contracts",
    "zeppelin-solidity",
    "SafeMath",
    "ReentrancyGuard",
    "Ownable",
    "Pausable",
    "IERC20",
    "IERC721",
    "UniswapV2",
    "pancakeswap",
    "sushiswap",
    "token template",
    "BEP-20",
    "BEP20",
]

# Inactivity threshold (months)
INACTIVITY_MONTHS_RED_FLAG = 6

# Min contributors to avoid "too few" red flag
MIN_ACTIVE_CONTRIBUTORS = 3

# Originality threshold: below this % unique = potential scam fork
LOW_ORIGINALITY_THRESHOLD = 0.10  # 10% unique = 90%+ similarity to parent/template

# High template similarity red flag
TEMPLATE_SIMILARITY_RED_FLAG = 0.90  # >90% template-like

# File-level diff: max files to compare (for rate limits)
FILE_DIFF_MAX_FILES = 80
# Skip content fetch for files larger than this (bytes)
FILE_DIFF_MAX_FILE_SIZE = 50000

# AI/ML code signatures (2026 trend: modular chains, AI in repos)
AI_ML_SIGNATURES = [
    "transformers", "torch", "tensorflow", "keras", "pytorch",
    "openai", "langchain", "huggingface", "sentence_transformers",
    "tiktoken", "openai-api", "anthropic", "langchain-core",
    "tensorflow.", "torch.nn", "from transformers", "import torch",
    "StableBaselines", "reinforcement", "mlflow", "wandb ",
]
