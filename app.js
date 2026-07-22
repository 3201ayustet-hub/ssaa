const questions = await fetch('./questions.json').then(r => r.json());
const appRoot = document.querySelector('#app');
if (!appRoot) throw new Error('app root not found');
const app = appRoot;

let session = [];
let index = 0;
let score = 0;
let selected = {};
let activeBlank = '';
let checked = false;
let currentMode = 'all';
let currentCategory = null;

const categories = [...new Set(questions.map(q => q.category))];

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function shell(content) {
  app.innerHTML = `
    <div class="app-shell">
      <header>
        <h1>SSA 語句群穴埋め演習</h1>
        <p>条文・定義・表を中心に反復</p>
      </header>
      <main>${content}</main>
    </div>`;
}

function renderHome() {
  const options = categories.map(c => `<option value="${c}">${c}</option>`).join('');
  shell(`
    <div class="card">
      <div class="home-grid">
        <button class="mode" id="allMode"><strong>全問題</strong>91セットをランダム出題</button>
        <button class="mode" id="mockMode"><strong>模擬演習</strong>頻出優先で30セット</button>
        <div class="mode">
          <strong>分野別</strong>
          <select id="categorySelect" style="width:100%;padding:10px;margin:8px 0 10px">${options}</select>
          <button class="primary" id="categoryMode" style="width:100%">開始</button>
        </div>
      </div>
      <div class="notice">
        本アプリはSSA公式過去問題集ではありません。日本認証の公開出題範囲・問題形式と、主要な機械安全規格の要点を基に独自に再構成しています。規格本文の逐語転載ではありません。
      </div>
    </div>`);
  document.querySelector('#allMode')?.addEventListener('click', () => start('all'));
  document.querySelector('#mockMode')?.addEventListener('click', () => start('mock'));
  document.querySelector('#categoryMode')?.addEventListener('click', () => {
    const value = (document.querySelector('#categorySelect')).value;
    start('category', value);
  });
}

function start(mode, category) {
  currentMode = mode;
  currentCategory = category ?? null;
  index = 0;
  score = 0;
  if (mode === 'all') session = shuffle(questions);
  if (mode === 'category') session = shuffle(questions.filter(q => q.category === category));
  if (mode === 'mock') {
    const high = questions.filter(q => q.priority === 1);
    const medium = questions.filter(q => q.priority === 2);
    session = shuffle([...shuffle(high).slice(0, 24), ...shuffle(medium).slice(0, 6)]).slice(0, 30);
  }
  renderQuestion();
}

function blankButton(id, answer) {
  const value = selected[id] ?? '（選択）';
  let cls = 'blank';
  if (activeBlank === id) cls += ' active';
  if (checked) cls += selected[id] === answer ? ' correct' : ' wrong';
  return `<button class="${cls}" data-blank="${id}">${value}</button>`;
}

function renderText(q) {
  return `<div class="question-text">${q.segments.map(s => 'text' in s ? s.text : blankButton(s.blank, q.answers[s.blank])).join('')}</div>`;
}

function renderCell(cell, q) {
  return typeof cell === 'string' ? cell : blankButton(cell.blank, q.answers[cell.blank]);
}

function renderTable(q) {
  return `<table><thead><tr>${q.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${q.rows.map(r => `<tr>${r.map(c => `<td>${renderCell(c,q)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function renderQuestion() {
  if (index >= session.length) return renderResult();
  const q = session[index];
  selected = {};
  activeBlank = Object.keys(q.answers)[0] ?? '';
  checked = false;
  const pct = Math.round((index / session.length) * 100);
  shell(`
    <div class="progress"><div style="width:${pct}%"></div></div>
    <div class="card">
      <div class="meta"><span>${q.category}</span><span>${index + 1} / ${session.length}</span></div>
      <div class="question-title">${q.title}</div>
      <div id="questionArea">${q.type === 'text' ? renderText(q) : renderTable(q)}</div>
      <div class="word-bank" id="wordBank">${shuffle(q.choices).map(c => `<button class="choice" data-choice="${c}">${c}</button>`).join('')}</div>
      <div class="controls">
        <button class="primary" id="checkBtn">採点する</button>
        <button class="secondary" id="homeBtn">トップへ</button>
      </div>
      <div id="feedback"></div>
    </div>`);
  bindQuestion(q);
}

function bindQuestion(q) {
  document.querySelectorAll('[data-blank]').forEach(el => {
    el.addEventListener('click', () => {
      if (checked) return;
      activeBlank = el.dataset.blank ?? '';
      refreshQuestionArea(q);
    });
  });
  document.querySelectorAll('[data-choice]').forEach(el => {
    el.addEventListener('click', () => {
      if (checked || !activeBlank) return;
      selected[activeBlank] = el.dataset.choice ?? '';
      const ids = Object.keys(q.answers);
      const pos = ids.indexOf(activeBlank);
      const next = ids.slice(pos + 1).find(id => !selected[id]) ?? ids.find(id => !selected[id]);
      if (next) activeBlank = next;
      refreshQuestionArea(q);
      refreshChoices(q);
    });
  });
  document.querySelector('#checkBtn')?.addEventListener('click', () => check(q));
  document.querySelector('#homeBtn')?.addEventListener('click', renderHome);
}

function refreshQuestionArea(q) {
  const area = document.querySelector('#questionArea');
  if (area) area.innerHTML = q.type === 'text' ? renderText(q) : renderTable(q);
  document.querySelectorAll('[data-blank]').forEach(el => {
    el.addEventListener('click', () => {
      if (checked) return;
      activeBlank = el.dataset.blank ?? '';
      refreshQuestionArea(q);
    });
  });
}

function refreshChoices(q) {
  const used = Object.values(selected);
  document.querySelectorAll('[data-choice]').forEach(el => {
    el.classList.toggle('used', used.includes(el.dataset.choice ?? '') && !Object.entries(selected).some(([id,v]) => id === activeBlank && v === el.dataset.choice));
  });
}

function check(q) {
  if (checked) return;
  const missing = Object.keys(q.answers).some(id => !selected[id]);
  if (missing) {
    const fb = document.querySelector('#feedback');
    if (fb) fb.innerHTML = `<div class="feedback ng">すべての空欄を選択してください。</div>`;
    return;
  }
  checked = true;
  const correct = Object.entries(q.answers).every(([id, ans]) => selected[id] === ans);
  if (correct) score++;
  refreshQuestionArea(q);
  const answerList = Object.entries(q.answers).map(([id, ans], i) => `${i + 1}. ${ans}`).join('<br>');
  const fb = document.querySelector('#feedback');
  if (fb) fb.innerHTML = `
    <div class="feedback ${correct ? 'ok' : 'ng'}">
      <strong>${correct ? '正解' : '不正解'}</strong><br>
      ${correct ? '' : `正答：<br>${answerList}<br>`}
      <div class="explanation">${q.explanation}</div>
      <div class="reference">参照：${q.reference}</div>
    </div>
    <div class="controls"><button class="primary" id="nextBtn">${index + 1 === session.length ? '結果を見る' : '次の問題'}</button></div>`;
  document.querySelector('#checkBtn')?.setAttribute('disabled','true');
  document.querySelector('#nextBtn')?.addEventListener('click', () => { index++; renderQuestion(); });
}

function renderResult() {
  const rate = session.length ? Math.round(score / session.length * 100) : 0;
  shell(`
    <div class="card result">
      <h2>結果</h2>
      <div class="score">${score} / ${session.length}</div>
      <p>正答率 ${rate}%</p>
      <div class="controls" style="justify-content:center">
        <button class="primary" id="retryBtn">同じモードでもう一度</button>
        <button class="secondary" id="homeBtn">トップへ</button>
      </div>
    </div>`);
  document.querySelector('#retryBtn')?.addEventListener('click', () => start(currentMode, currentCategory));
  document.querySelector('#homeBtn')?.addEventListener('click', renderHome);
}

renderHome();
