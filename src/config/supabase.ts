/**
 * src/config/supabase.ts
 * Cliente Supabase (Free Tier). Usa SUPABASE_KEY = service_role,
 * pois o RLS está ligado sem policy pública: só o backend acessa.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

// Falha cedo e com mensagem clara se o ambiente não estiver configurado.
if (!url || !key) {
  throw new Error(
    "[config] SUPABASE_URL e SUPABASE_KEY são obrigatórios. Copie .env.example para .env."
  );
}

export const supabase: SupabaseClient = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
