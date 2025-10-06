import { createClient } from "@supabase/supabase-js";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      resume_analyses: {
        Row: {
          id: string;
          user_id: string;
          file_name: string;
          file_url: string;
          analysis_results: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_name: string;
          file_url: string;
          analysis_results: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_name?: string;
          file_url?: string;
          analysis_results?: Json;
          created_at?: string;
        };
      };
    };
  };
}

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").toString();
const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""
).toString();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    [
      "Missing Supabase environment variables.",
      "",
      "Make sure you have a .env (or .env.local) file at the project root with the following entries:",
      '  VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"',
      '  VITE_SUPABASE_ANON_KEY="<your-anon-key>"',
      "",
      "Important:",
      "- The keys must be prefixed with VITE_ to be available in browser code.",
      "- After creating/updating .env, restart the Vite dev server so the variables are loaded.",
    ].join("\n"),
  );
}

let parsedUrl: URL;
try {
  parsedUrl = new URL(supabaseUrl);
} catch (err) {
  throw new Error(
    `Invalid VITE_SUPABASE_URL: "${supabaseUrl}". It must be a full HTTP or HTTPS URL, e.g. "https://<project-ref>.supabase.co".`,
  );
}

if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
  throw new Error(
    `Invalid VITE_SUPABASE_URL protocol: "${parsedUrl.protocol}". The URL must start with "http://" or "https://".`,
  );
}

if (import.meta.env.DEV) {
  const displayUrl =
    supabaseUrl.length > 80 ? supabaseUrl.slice(0, 80) + "…" : supabaseUrl;
  console.info("[supabase] using URL:", displayUrl);
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
