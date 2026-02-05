/**
 * Proof-of-Work algorithm signatures for crypto project detection.
 * Used to scan repository code for known PoW implementations.
 */

export interface PowAlgorithm {
  id: string;
  name: string;
  description: string;
  usedBy: string[];
  /** Code/search patterns that indicate this algorithm (regex or plain strings) */
  signatures: Array<{
    pattern: string;
    type: "regex" | "literal";
    weight: number;
  }>;
}

export const POW_ALGORITHMS: PowAlgorithm[] = [
  {
    id: "sha256",
    name: "SHA-256",
    description: "Bitcoin-style double SHA-256 hashing. ASIC-dominated.",
    usedBy: ["Bitcoin", "Bitcoin Cash", "many clones"],
    signatures: [
      { pattern: "SHA256|sha256|SHA-256", type: "regex", weight: 2 },
      { pattern: "double.*sha|sha.*double", type: "regex", weight: 3 },
      { pattern: "scrypt", type: "literal", weight: 0 },
    ],
  },
  {
    id: "scrypt",
    name: "Scrypt",
    description: "Memory-hard function. Used by Litecoin and derivatives.",
    usedBy: ["Litecoin", "Dogecoin", "many altcoins"],
    signatures: [
      { pattern: "scrypt", type: "literal", weight: 3 },
      { pattern: "SCRYPT", type: "literal", weight: 3 },
    ],
  },
  {
    id: "ethash",
    name: "Ethash",
    description: "DAG-based, memory-hard. Formerly Ethereum PoW.",
    usedBy: ["Ethereum Classic", "Ethereum (pre-merge)", "other chains"],
    signatures: [
      { pattern: "ethash", type: "literal", weight: 3 },
      { pattern: "Ethash", type: "literal", weight: 3 },
      { pattern: "dag.*epoch|epoch.*dag", type: "regex", weight: 2 },
      { pattern: "hashimoto|Hashimoto", type: "literal", weight: 2 },
    ],
  },
  {
    id: "randomx",
    name: "RandomX",
    description: "CPU-friendly, ASIC-resistant. Used by Monero.",
    usedBy: ["Monero", "Wownero"],
    signatures: [
      { pattern: "randomx|RandomX", type: "literal", weight: 3 },
      { pattern: "RANDOMX", type: "literal", weight: 3 },
    ],
  },
  {
    id: "equihash",
    name: "Equihash",
    description: "Memory-hard, used by Zcash and others.",
    usedBy: ["Zcash", "Bitcoin Gold", "ZenCash"],
    signatures: [
      { pattern: "equihash", type: "literal", weight: 3 },
      { pattern: "Equihash", type: "literal", weight: 3 },
    ],
  },
  {
    id: "kawpow",
    name: "KawPow / Ravencoin",
    description: "Ethash variant with ProgPoW elements.",
    usedBy: ["Ravencoin", "Ethereum Classic (optional)"],
    signatures: [
      { pattern: "kawpow|KawPow", type: "literal", weight: 3 },
      { pattern: "ravencoin.*pow|progpow", type: "regex", weight: 2 },
    ],
  },
  {
    id: "blake2b",
    name: "Blake2b",
    description: "Fast hashing, used in several PoW chains.",
    usedBy: ["Siacoin", "Decred (blake256)", "Handshake"],
    signatures: [
      { pattern: "blake2b|Blake2b|BLAKE2b", type: "regex", weight: 2 },
      { pattern: "blake256", type: "literal", weight: 2 },
    ],
  },
  {
    id: "lyra2",
    name: "Lyra2 / Lyra2RE",
    description: "Memory-hard, used by Vertcoin and others.",
    usedBy: ["Vertcoin", "MonaCoin"],
    signatures: [
      { pattern: "lyra2|Lyra2", type: "literal", weight: 3 },
      { pattern: "lyra2re", type: "literal", weight: 3 },
    ],
  },
  {
    id: "ghostrider",
    name: "Ghostrider",
    description: "CPU-oriented, used by Raptoreum.",
    usedBy: ["Raptoreum"],
    signatures: [
      { pattern: "ghostrider|Ghostrider", type: "literal", weight: 3 },
    ],
  },
  {
    id: "verthash",
    name: "Verthash",
    description: "ASIC-resistant, used by Vertcoin (newer).",
    usedBy: ["Vertcoin"],
    signatures: [
      { pattern: "verthash|Verthash", type: "literal", weight: 3 },
    ],
  },
];

export function detectPowAlgorithms(text: string): Array<{ algorithm: PowAlgorithm; score: number }> {
  const results: Array<{ algorithm: PowAlgorithm; score: number }> = [];
  const seen = new Set<string>();

  for (const algo of POW_ALGORITHMS) {
    let score = 0;
    for (const sig of algo.signatures) {
      if (sig.type === "literal") {
        if (text.includes(sig.pattern)) score += sig.weight;
      } else {
        try {
          const re = new RegExp(sig.pattern, "gi");
          const matches = text.match(re);
          if (matches) score += sig.weight * Math.min(matches.length, 3);
        } catch {
          if (text.includes(sig.pattern)) score += sig.weight;
        }
      }
    }
    if (score > 0 && !seen.has(algo.id)) {
      seen.add(algo.id);
      results.push({ algorithm: algo, score });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
