// Supabase接続設定
// Publishable keyのみを使用。Secret keyはブラウザへ入れない。
// SSAAは既存アプリの public.games / public.players 等を使わず、
// REST APIの対象だけを ssaa_* テーブルへ振り替える。
window.APP_CONFIG = {
  version: '3.1.0',
  supabaseUrl: 'https://qznjkiqbjbcuahhfzlzg.supabase.co',
  supabasePublishableKey: 'sb_publishable_G_zcn0Pmm-gPAmloz-m3yg_QEG1mpWO'
};

(function(){
  const originalFetch = window.fetch.bind(window);
  const tableMap = {
    games: 'ssaa_games',
    players: 'ssaa_players',
    stays: 'ssaa_stays',
    settlements: 'ssaa_settlements'
  };
  window.fetch = function(input, init){
    try {
      const rawUrl = typeof input === 'string' ? input : input.url;
      const u = new URL(rawUrl, window.location.href);
      const marker = '/rest/v1/';
      const i = u.pathname.indexOf(marker);
      if(i >= 0){
        const restPath = u.pathname.slice(i + marker.length);
        const parts = restPath.split('/');
        if(tableMap[parts[0]]){
          parts[0] = tableMap[parts[0]];
          u.pathname = u.pathname.slice(0, i + marker.length) + parts.join('/');
          if(typeof input === 'string'){
            input = u.toString();
          } else {
            input = new Request(u.toString(), input);
          }
        }
      }
    } catch(e) {
      console.warn('SSAA API route rewrite skipped', e);
    }
    return originalFetch(input, init);
  };
})();
