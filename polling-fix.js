// 地図が5秒ごとに「読み込み中」へ戻る問題を停止する。
// app.js の5秒間隔ポーリングだけを無効化し、その他のタイマーはそのまま動かす。
(() => {
  const nativeSetInterval = window.setInterval.bind(window);
  window.setInterval = (handler, timeout, ...args) => {
    if (Number(timeout) === 5000) return 0;
    return nativeSetInterval(handler, timeout, ...args);
  };
})();
