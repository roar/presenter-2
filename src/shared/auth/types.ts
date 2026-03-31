// Auth context passed to repository calls.
// When Clerk is integrated, token comes from Clerk's getToken().
// Until then, pass `nullAuthContext` — repositories treat it as unauthenticated/local.

export interface AuthContext {
  userId: string | null
  getToken: () => Promise<string | null>
}

export const nullAuthContext: AuthContext = {
  userId: null,
  getToken: async () => null
}
