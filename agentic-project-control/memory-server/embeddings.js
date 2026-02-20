const EMBEDDING_DIM = 1024;

/**
 * Embeds text using a local Ollama instance.
 * Model defaults to mxbai-embed-large (1024 dims).
 * Override via OLLAMA_HOST and OLLAMA_EMBED_MODEL environment variables.
 */
export async function embed(text) {
  const baseUrl = process.env.OLLAMA_HOST ?? 'http://localhost:11434';
  const model = process.env.OLLAMA_EMBED_MODEL ?? 'mxbai-embed-large';

  const response = await fetch(`${baseUrl}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: text }),
  });

  if (!response.ok) {
    throw new Error(`Ollama embed error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.embeddings[0];
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
