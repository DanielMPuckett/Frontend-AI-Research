const EMBEDDING_DIM = 1024;

/**
 * Embeds text using the Voyage AI API.
 * Reads VOYAGE_API_KEY from environment.
 */
export async function embed(text) {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error('VOYAGE_API_KEY environment variable is required');
  }

  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'voyage-3',
      input: [text],
    }),
  });

  if (!response.ok) {
    throw new Error(`Voyage API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Returns a deterministic fake embedder for use in tests.
 * Produces consistent 1024-dim float arrays without calling any API.
 */
export function makeFakeEmbedder() {
  return async function fakeEmbed(text) {
    const vector = new Array(EMBEDDING_DIM).fill(0);
    for (let i = 0; i < text.length; i++) {
      vector[i % EMBEDDING_DIM] += text.charCodeAt(i) / 255;
    }
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vector.map(v => v / magnitude);
  };
}
