import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''
const supabaseServiceRoleKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ''
const fallbackSupabaseUrl = 'https://example.supabase.co'
const fallbackSupabaseKey = 'development-placeholder-key'

const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export const isSupabaseConfigured =
  isValidHttpUrl(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  Boolean(supabaseServiceRoleKey)

export const getSupabaseConfigError = () => {
  if (!isValidHttpUrl(supabaseUrl)) {
    return 'NEXT_PUBLIC_SUPABASE_URL must be a valid HTTP or HTTPS URL.'
  }
  if (!supabaseAnonKey) {
    return 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required.'
  }
  if (!supabaseServiceRoleKey) {
    return 'SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required for server API routes.'
  }
  return null
}

export const supabase = createClient(
  isValidHttpUrl(supabaseUrl) ? supabaseUrl : fallbackSupabaseUrl,
  supabaseAnonKey || fallbackSupabaseKey,
)

export const supabaseAdmin = createClient(
  isValidHttpUrl(supabaseUrl) ? supabaseUrl : fallbackSupabaseUrl,
  supabaseServiceRoleKey || supabaseAnonKey || fallbackSupabaseKey,
)

export const SCHEMA_SQL = 'See databasesupabase.md for the complete database schema.'

export default supabase
