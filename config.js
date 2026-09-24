// デジ太郎電鉄 / SSAA Supabase設定
// ブラウザには Publishable key のみを使用。
// 既存の app.js が games / players / stays / settlements を参照していても、
// SSAA専用の ssaa_* テーブルへルーティングします。
window.APP_CONFIG = {
  version: '3.2.0',
  supabaseUrl: 'https://qznjkiqbjbcuahhfzlzg.supabase.co',
  supabasePublishableKey: 'sb_publishable_G_zcn0Pmm-gPAmloz-m3yg_QEG1mpWO'
};

(() => {
  const originalFetch = window.fetch.bind(window);
  const tableMap = {
    games: 'ssaa_games',
    players: 'ssaa_players',
    stays: 'ssaa_stays',
    settlements: 'ssaa_settlements'
  };

  window.fetch = function(input, init) {
    try {
      const rawUrl = typeof input === 'string' ? input : input?.url;
      if (rawUrl) {
        const u = new URL(rawUrl, window.location.href);
        const marker = '/rest/v1/';
        const i = u.pathname.indexOf(marker);

        if (i >= 0) {
          const restPath = u.pathname.slice(i + marker.length);
          const parts = restPath.split('/');

          if (tableMap[parts[0]]) {
            parts[0] = tableMap[parts[0]];
            u.pathname = u.pathname.slice(0, i + marker.length) + parts.join('/');

            if (typeof input === 'string') {
              input = u.toString();
            } else {
              input = new Request(u.toString(), input);
            }
          }
        }
      }
    } catch (e) {
      console.warn('SSAA API route rewrite skipped', e);
    }

    return originalFetch(input, init);
  };
})();
