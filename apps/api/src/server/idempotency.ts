export function sameIdempotencyInput(existing: { userId: string; scriptId: string; recipientPhoneHash: string }, userId: string, scriptId: string, recipientPhoneHash: string) {
  return existing.userId === userId && existing.scriptId === scriptId && existing.recipientPhoneHash === recipientPhoneHash;
}
