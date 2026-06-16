import { supabase } from './supabase'

const ERROR_MAP = {
  'Invalid login credentials': 'Pogrešna e-mail adresa ili lozinka.',
  'Email not confirmed': 'E-mail adresa nije potvrđena. Provjerite inbox.',
  'User already registered': 'Korisnik s tom e-mail adresom već postoji.',
  'Password should be at least 6 characters': 'Lozinka mora imati najmanje 6 znakova.',
  'Unable to validate email address: invalid format': 'Nevažeći format e-mail adrese.',
  'Signup requires a valid password': 'Unesite valjanu lozinku.',
}

function translateError(msg: string) {
  return ERROR_MAP[msg as keyof typeof ERROR_MAP] || msg
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { success: false as const, error: translateError(error.message) }
  }

  return { success: true as const, user: data.user }
}

export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  })

  if (error) {
    return { success: false as const, error: translateError(error.message) }
  }

  return { success: true as const, user: data.user }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    return { success: false as const, error: translateError(error.message) }
  }
  return { success: true as const }
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'gamenote://reset-password',
  })

  if (error) {
    return { success: false as const, error: translateError(error.message) }
  }

  return { success: true as const, error: '' }
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    return { success: false as const, error: translateError(error.message) }
  }
  return { success: true as const, error: '' }
}
