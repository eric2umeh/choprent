export type FaqEntry = {
  id: string;
  keywords: string[];
  question: string;
  answer: string;
};

export const RENT_FAQ_ENTRIES: FaqEntry[] = [
  {
    id: "pay-how",
    keywords: [
      "pay",
      "payment",
      "transfer",
      "bank",
      "account",
      "nuban",
      "how do i pay",
      "send money",
    ],
    question: "How do I pay my rent?",
    answer:
      "Transfer to the shop account shown on your Home screen, then open Pay and upload your receipt (you can attach multiple files). Management will verify and update your ledger.",
  },
  {
    id: "service-charge",
    keywords: ["service", "service charge", "levy", "maintenance fee", "plaza fee"],
    question: "What is service charge?",
    answer:
      "Service charge covers shared plaza costs (cleaning, security, common areas). It is calculated as a percentage of your rent and appears on your ledger with rent each billing period.",
  },
  {
    id: "receipt",
    keywords: ["receipt", "upload", "proof", "screenshot", "evidence", "document"],
    question: "How do I upload proof of payment?",
    answer:
      "Go to Pay → tap to upload → select one or more JPG, PNG, or PDF files from your bank app. Add the amount and bank reference, then submit. You can also add a short note.",
  },
  {
    id: "balance",
    keywords: ["balance", "owe", "arrears", "debt", "outstanding", "how much"],
    question: "How do I check what I owe?",
    answer:
      "Your balance due is on the Home screen. Open Ledger for a full breakdown by rent, service charge, VAT, and other lines per period.",
  },
  {
    id: "due-date",
    keywords: ["due", "when", "deadline", "late", "date", "expire"],
    question: "When is rent due?",
    answer:
      "Due dates follow your lease billing cadence (annual, quarterly, or monthly). Check your ledger for each period. Contact management if you need a payment plan.",
  },
  {
    id: "verify-time",
    keywords: ["verify", "verified", "pending", "how long", "waiting", "approve"],
    question: "How long does verification take?",
    answer:
      "After you upload a receipt, management usually verifies within 1–2 business days. Pending payments show on your Home screen until approved.",
  },
  {
    id: "statement",
    keywords: ["statement", "letter", "document", "download", "pdf"],
    question: "How do I get a rent statement?",
    answer:
      "Open Documents to download statements and management letters issued by your landlord.",
  },
  {
    id: "contact",
    keywords: ["contact", "manager", "landlord", "phone", "help", "support"],
    question: "Who do I contact for help?",
    answer:
      "Speak with your shop manager or plaza management office. For app issues, use the contact details on your management letters.",
  },
];

export type FaqMatch = {
  entry: FaqEntry;
  score: number;
};

export function matchRentFaq(query: string): FaqMatch | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  const tokens = q.split(/\s+/).filter(Boolean);
  let best: FaqMatch | null = null;

  for (const entry of RENT_FAQ_ENTRIES) {
    let score = 0;
    for (const keyword of entry.keywords) {
      const kw = keyword.toLowerCase();
      if (q.includes(kw)) score += kw.split(/\s+/).length + 2;
      for (const token of tokens) {
        if (kw.includes(token) || token.includes(kw)) score += 1;
      }
    }
    if (entry.question.toLowerCase().includes(q)) score += 3;

    if (!best || score > best.score) {
      best = { entry, score };
    }
  }

  if (!best || best.score < 2) return null;
  return best;
}

export const FAQ_STARTER_PROMPTS = [
  "How do I pay my rent?",
  "What is service charge?",
  "How do I upload a receipt?",
  "What is my balance?",
];
