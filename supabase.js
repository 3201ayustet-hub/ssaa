// Supabase接続は、公開クライアントキーを設定する場合のみ利用します。
// service_role key は絶対にこのファイルへ入れないでください。
window.SUPABASE_CONFIG={url:"",anonKey:""};
window.SupabaseBridge={
 enabled(){return Boolean(window.SUPABASE_CONFIG.url&&window.SUPABASE_CONFIG.anonKey)},
 async saveStay(){throw new Error("Supabase未設定")}
};