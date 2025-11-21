export function interpolate(text: string | null | undefined, variables: { name: string; value: string }[]): string {
  if (!text) return ''
  return text.replace(/\{\{\s*([a-zA-Z0-9_\-]+)\s*\}\}/g, (match, key) => {
    const found = variables.find((v) => v.name.trim() === key)
    return found ? found.value : match
  })
}


