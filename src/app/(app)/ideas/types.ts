import type { GeneratedIdea } from "@/lib/ai";

export type ChatIdea = GeneratedIdea & { saved_id?: string };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  ideas: ChatIdea[];
};
