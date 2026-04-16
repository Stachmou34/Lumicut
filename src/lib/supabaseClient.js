import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Client Supabase — configurez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env
// Sans ces variables, le client est null et l'app fonctionne en mode mock local
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
