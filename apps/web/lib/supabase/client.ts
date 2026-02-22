/**
 * Supabase Client Configuration (Browser)
 * 
 * This file provides the Supabase client for browser-side operations.
 * Used in Client Components and browser-side logic.
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

/**
 * Create a Supabase client for browser-side operations
 * 
 * This client:
 * - Automatically manages cookies for session persistence
 * - Works in Client Components
 * - Handles authentication state
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
