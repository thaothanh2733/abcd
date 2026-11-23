/**
 * services/supabaseService.js - Tích hợp cơ sở dữ liệu Supabase (PostgreSQL)
 * Dự án: LÁ CHẮN NGƯỜI THÂN - AI giúp nhận diện tin nhắn lừa đảo cho người cao tuổi
 */

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

async function getRecentAnalysisStats(days = 7) {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await client
      .from('analysis_history')
      .select('scenario, alert_level, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Lỗi khi lấy dữ liệu thống kê từ Supabase:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Lỗi kết nối Supabase thống kê:', err.message);
    return null;
  }
}

module.exports = { getSupabaseClient, saveAnalysisHistory, getRecentAnalysisStats };
