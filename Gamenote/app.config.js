const OBFUSCATION_KEY = [0xA3, 0xB7, 0xC9, 0xD1, 0xE5, 0xF2, 0x08, 0x1C];

function obfuscate(str) {
  return Array.from(str).map((c, i) =>
    c.charCodeAt(0) ^ OBFUSCATION_KEY[i % OBFUSCATION_KEY.length]
  );
}

export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    supabaseUrlObfuscated: obfuscate(process.env.SUPABASE_URL || ''),
    supabaseAnonKeyObfuscated: obfuscate(process.env.SUPABASE_ANON_KEY || ''),
    rawgApiKeyObfuscated: obfuscate(process.env.RAWG_API_KEY || ''),
  },
});
