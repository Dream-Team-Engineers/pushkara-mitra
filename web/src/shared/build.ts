interface BuildEnv {
  readonly VITE_BUILD_ID?: string;
}

/** Commit the running copy was built from (plus "staging"), or "dev". Shown on the Me tab. */
export const BUILD_ID: string =
  (import.meta as unknown as { env?: BuildEnv }).env?.VITE_BUILD_ID ?? 'dev';
