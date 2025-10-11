export async function calculateChecksum(emojiChain: string): Promise<string> {
  const canonical = JSON.stringify({ emojiChain });
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);

  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
