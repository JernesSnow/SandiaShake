//----- GOOGLE DRIVE -----
import { google } from "googleapis";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Auto-save tokens to Supabase whenever they are refreshed
oauth2Client.on("tokens", async (tokens) => {
  try {
    const supabase = createSupabaseAdmin();
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (tokens.access_token) {
      update.access_token_enc = tokens.access_token;
    }
    if (tokens.refresh_token) {
      update.refresh_token_enc = tokens.refresh_token;
    }
    if (tokens.expiry_date) {
      update.token_expiry = new Date(tokens.expiry_date).toISOString();
    }

    await supabase
      .from("google_drive_connection")
      .update(update)
      .eq("is_active", true)
      .eq("estado", "ACTIVO");
  } catch (err) {
    console.error("[Google Drive] Failed to save refreshed tokens:", err);
  }
});

/**
 * Loads tokens from Supabase and sets them on the oauth2Client.
 * Called once before the first Drive API call per server lifecycle.
 */
let _loaded = false;

export async function ensureDriveCredentials(): Promise<boolean> {
  // If credentials are already set (e.g. from callback), skip DB load
  if (oauth2Client.credentials?.access_token) {
    return true;
  }

  // Only attempt DB load once per process
  if (_loaded) return false;
  _loaded = true;

  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("google_drive_connection")
      .select("access_token_enc, refresh_token_enc, token_expiry")
      .eq("is_active", true)
      .eq("estado", "ACTIVO")
      .limit(1)
      .single();

    if (error || !data) {
      console.warn("[Google Drive] No active connection found in DB.");
      return false;
    }

    const credentials: Record<string, unknown> = {};
    if (data.access_token_enc) credentials.access_token = data.access_token_enc;
    if (data.refresh_token_enc) credentials.refresh_token = data.refresh_token_enc;
    if (data.token_expiry) credentials.expiry_date = new Date(data.token_expiry).getTime();

    if (!credentials.access_token && !credentials.refresh_token) {
      return false;
    }

    oauth2Client.setCredentials(credentials);
    console.log("[Google Drive] Tokens loaded from Supabase.");
    return true;
  } catch (err) {
    console.error("[Google Drive] Failed to load tokens from DB:", err);
    return false;
  }
}

/**
 * Saves tokens to Supabase after initial OAuth callback.
 */
export async function saveTokensToSupabase(tokens: {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
}) {
  try {
    const supabase = createSupabaseAdmin();

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      connection_error: null,
    };

    if (tokens.access_token) update.access_token_enc = tokens.access_token;
    if (tokens.refresh_token) update.refresh_token_enc = tokens.refresh_token;
    if (tokens.expiry_date) update.token_expiry = new Date(tokens.expiry_date).toISOString();

    // Upsert: update existing active row, or insert if none
    const { data: existing } = await supabase
      .from("google_drive_connection")
      .select("id_connection")
      .eq("is_active", true)
      .eq("estado", "ACTIVO")
      .limit(1)
      .single();

    if (existing) {
      await supabase
        .from("google_drive_connection")
        .update(update)
        .eq("id_connection", existing.id_connection);
    } else {
      await supabase
        .from("google_drive_connection")
        .insert({
          id_admin: 1,
          is_active: true,
          estado: "ACTIVO",
          ...update,
        });
    }

    console.log("[Google Drive] Tokens saved to Supabase.");
  } catch (err) {
    console.error("[Google Drive] Failed to save tokens:", err);
  }
}

export default oauth2Client;
