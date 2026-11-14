type AuthFetch = (input: string, init?: RequestInit) => Promise<Response>;

/** POST to /api/account/... with the access token. Throws an Error whose message is safe to show to the user. */
export async function accountPost<T>(authFetch: AuthFetch, path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await authFetch(`/api/account${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Nu ne-am putut conecta la server. Încearcă din nou în câteva momente.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message || `Eroare ${res.status}`);
  return data as T;
}

export interface CodeSent {
  message: string;
  /** The address the code went to, partly hidden: "n***@gmail.com" */
  sentTo: string;
}

export const MIN_PASSWORD = 6; // same rule as registration and the backend
