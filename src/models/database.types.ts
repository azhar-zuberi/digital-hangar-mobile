/**
 * Hand-written stand-in for `supabase gen types typescript`.
 *
 * This file exists so the typed Supabase client (src/services/supabaseClient.ts)
 * compiles before anyone has run `supabase link` against the live project — see
 * issue #2's credential boundary (senior-engineer has no DB password / access
 * token in this environment).
 *
 * IMPORTANT: once you've run `supabase link --project-id aocmjvqsdrdftubpxrnk`
 * and applied the migrations under supabase/migrations/, regenerate this file
 * for real with:
 *
 *   npm run db:types
 *
 * That will overwrite this file with the CLI's actual output — including the
 * real domain tables (users, aircraft, timeline_entries, squawks, reminders,
 * communities, flights, ...) as they land via their own issues. Only the
 * `_health_check` shape below is hand-verified against
 * supabase/migrations/20260725103203_create_health_check.sql; treat it as
 * provisional.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      _health_check: {
        Row: {
          id: string;
          label: string;
          checked_at: string;
        };
        Insert: {
          id?: string;
          label: string;
          checked_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          checked_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
