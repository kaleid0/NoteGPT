export default async function* mockOpenAI(input: string) {
  const words = (input || 'Hello from mock OpenAI!').split(' ')
  for (const w of words) {
    await new Promise((r) => setTimeout(r, 150))
    yield w + ' '
  }
}
