export function segmentInput(input: string, maxLen = 1000): string[] {
  if (!input || input.length <= maxLen) return [input]
  const words = input.split(/(\s+)/)
  const segments: string[] = []
  let current = ''
  for (const w of words) {
    if (current.length + w.length > maxLen) {
      if (current.length > 0) {
        segments.push(current)
        current = w
      } else {
        // single word longer than maxLen: slice it
        segments.push(w.slice(0, maxLen))
        current = w.slice(maxLen)
      }
    } else {
      current += w
    }
  }
  if (current.length > 0) segments.push(current)
  return segments
}