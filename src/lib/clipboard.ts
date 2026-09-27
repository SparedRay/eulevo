/**
 * Copies text. Where the Clipboard API is missing (old browsers, plain http on a phone),
 * selects the text in `fallback` and uses the legacy copy command.
 */
export async function copyText(text: string, fallback?: HTMLInputElement | null): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    fallback?.select()
    document.execCommand('copy')
  }
}
