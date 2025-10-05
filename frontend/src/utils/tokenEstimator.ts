export function estimateTokensApproximate(text: string): number {
  if (!text) return 0
  const rough = Math.ceil(text.length / 4)
  return rough
}


