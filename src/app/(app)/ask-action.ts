"use server";

import { askQuestion, type AskResult } from "@/lib/ask";

export async function askAction(q: string): Promise<AskResult> {
  return askQuestion(q);
}
