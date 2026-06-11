import { requireSupabaseConfig } from "./supabaseEnv";

export async function supabaseFetchJson<T>(
  path: string,
  errorMessage: string,
  init: RequestInit = {},
): Promise<T> {
  const { supabaseUrl, supabaseAnonKey } = requireSupabaseConfig();
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`${errorMessage}: ${response.status}`);
  }

  return (await response.json()) as T;
}
