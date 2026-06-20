import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/env'

if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL env var (set in .env.local).')
if (!SUPABASE_ANON_KEY) throw new Error('Missing SUPABASE_ANON_KEY env var (set in .env.local).')

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
