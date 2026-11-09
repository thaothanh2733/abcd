(function (root, factory) {
  const historyStore = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = historyStore;
  }
  root.MessageHistory = historyStore;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STORAGE_KEY = 'la-chan-nguoi-than-history';
  const MAX_ITEMS = 15;

  function load(storage) {
    const stored = storage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const items = JSON.parse(stored);
    if (!Array.isArray(items)) return [];

    return items
      .filter((item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.text === 'string' &&
        typeof item.createdAt === 'string' &&
        item.result &&
        typeof item.result.alert_level === 'string'
      )
      .slice(0, MAX_ITEMS);
  }

  function save(storage, items) {
    storage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  }

  function createEntry(text, result, now) {
    return {
      id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      result: {
        alert_level: result.alert_level,
        scenario: result.scenario,
        detected_signs: Array.isArray(result.detected_signs) ? result.detected_signs : [],
        explanation: result.explanation || '',
        recommended_actions: Array.isArray(result.recommended_actions) ? result.recommended_actions : [],
        safety_reminder: result.safety_reminder || ''
      },
      createdAt: now.toISOString()
    };
  }

  return { STORAGE_KEY, MAX_ITEMS, load, save, createEntry };
});
