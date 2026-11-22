import { createClient, type Session } from '@supabase/supabase-js'
import {isCloudSourceAvailable} from '@/context/settings'
import { sameSession } from './authSession'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/env'

const cloudFetch: typeof fetch = (input, init) => {
  if (!isCloudSourceAvailable()) return Promise.reject(new Error('cloudUnavailable'))
  return fetch(input, init)
}

function createCloudClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {fetch: cloudFetch},
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
}

type CloudClient = ReturnType<typeof createCloudClient>
let client: CloudClient | undefined

export const supabase = new Proxy({} as CloudClient, {
  get(_target, property) {
    if (!client) {
      if (!isCloudSourceAvailable()) throw new Error('cloudUnavailable')
      client = createCloudClient()
    }
    const value = Reflect.get(client, property)
    return typeof value === 'function' ? value.bind(client) : value
  },
})

export function createPasswordCheckClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {fetch: cloudFetch},
    auth: {
      storageKey: 'gamenote.auth.password-check',
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}


export async function requireSession(expected: Session) {
  const {data: {session}, error} = await supabase.auth.getSession()
  if (error || !session || !sameSession(expected, session)) throw new Error('session')
  return session
}
