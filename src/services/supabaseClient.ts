/**
 * Re-export authoritative Supabase client from central src/lib/supabaseClient
 * Ensures a single shared client instance across the application.
 */
export {
  supabase,
  getSupabase,
  isSupabaseConfigured,
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  STORAGE_BUCKET_DOCUMENTS,
  uploadToStorage,
  getPublicUrl,
  testSupabaseConnection,
} from '../lib/supabaseClient';
export type { SupabaseConnectionTestResult } from '../lib/supabaseClient';
export { default } from '../lib/supabaseClient';
