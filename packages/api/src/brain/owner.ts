export function isTelegramOwner(
  userId: number | string | undefined,
  ownerId: string | undefined,
): boolean {
  if (!ownerId) return false;
  if (userId === undefined) return false;
  return String(userId) === ownerId;
}

export function needsConfirmation(input: {
  kind: "expense" | "income";
  amountCents: number;
  confidence: number;
  thresholdCents: number;
  minConfidence: number;
  categoryKnown: boolean;
}): boolean {
  if (input.kind !== "expense") return false;
  if (!input.categoryKnown) return true;
  if (input.amountCents >= input.thresholdCents) return true;
  if (input.confidence < input.minConfidence) return true;
  return false;
}
