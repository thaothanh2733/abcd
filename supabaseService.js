let supabaseClient = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) return null;

  const { createClient } = require('@supabase/supabase-js');
  supabaseClient = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return supabaseClient;
}

async function saveAnalysisHistory(sessionId, result) {
  const client = getSupabaseClient();
  if (!client) return { saved: false, reason: 'SUPABASE_NOT_CONFIGURED' };

  const { error } = await client.from('analysis_history').insert({
    session_id: sessionId,
    sanitized_preview: result.sanitized_input_preview || '',
    alert_level: result.alert_level,
    scenario: result.scenario || null,
    detected_signs: Array.isArray(result.detected_signs) ? result.detected_signs : [],
    recommended_actions: Array.isArray(result.recommended_actions) ? result.recommended_actions : []
  });

  if (error) throw error;
  return { saved: true };
}

module.exports = { getSupabaseClient, saveAnalysisHistory };
