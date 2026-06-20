import Constants from "expo-constants";

const OBFUSCATION_KEY = [0xA3, 0xB7, 0xC9, 0xD1, 0xE5, 0xF2, 0x08, 0x1C];

function deobfuscate(arr: number[]): string {
  return String.fromCharCode(
    ...arr.map((c, i) => c ^ OBFUSCATION_KEY[i % OBFUSCATION_KEY.length])
  );
}

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, number[]>;

export const SUPABASE_URL = deobfuscate(extra.supabaseUrlObfuscated ?? []);
export const SUPABASE_ANON_KEY = deobfuscate(extra.supabaseAnonKeyObfuscated ?? []);
export const RAWG_API_KEY = deobfuscate(extra.rawgApiKeyObfuscated ?? []);
