"use client";

import { useState } from "react";
import {
  FAQ_STARTER_PROMPTS,
  matchRentFaq,
  type FaqEntry,
} from "@/lib/faq/rent-faq";
import { MessageCircle, Send } from "lucide-react";

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  text: string;
  entry?: FaqEntry;
};

function fallbackReply(): string {
  return "I couldn't find an exact answer. Try asking about paying rent, uploading receipts, service charge, or your balance. For account-specific help, contact your plaza management.";
}

export function TenantFaqChat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "bot",
      text: "Hi! I'm the ChopRent help assistant. Ask a question about paying rent, receipts, or your transactions.",
    },
  ]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: trimmed,
    };

    const match = matchRentFaq(trimmed);
    const botMsg: ChatMessage = {
      id: `b-${Date.now()}`,
      role: "bot",
      text: match ? match.entry.answer : fallbackReply(),
      entry: match?.entry,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
  }

  return (
    <div className="flex flex-col rounded-xl border border-border bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <MessageCircle className="h-5 w-5 text-green-600" />
        <div>
          <p className="text-sm font-semibold text-foreground">Rent help</p>
          <p className="text-xs text-muted">Keyword answers — no login data shared</p>
        </div>
      </div>

      <div className="max-h-[min(50vh,420px)] space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-green-600 text-white"
                  : "bg-surface-subtle text-foreground"
              }`}
            >
              {m.entry && m.role === "bot" && (
                <p className="mb-1 text-xs font-semibold text-green-800">
                  {m.entry.question}
                </p>
              )}
              <p className="leading-relaxed">{m.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border px-4 py-2">
        {FAQ_STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="rounded-full border border-border bg-white px-2.5 py-1 text-xs text-muted hover:border-green-200 hover:text-green-800"
            onClick={() => send(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>

      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about rent, receipts, balance…"
          className="input-field flex-1 text-sm"
        />
        <button
          type="submit"
          className="btn-primary inline-flex items-center gap-1 px-3 py-2"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
