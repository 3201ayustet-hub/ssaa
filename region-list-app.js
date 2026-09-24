/* 地方一覧ページ追加用
   既存の app.js に以下の3点を反映してください。
   1) menuScreen() のメニューに「地方一覧」を追加
   2) regionListScreen() を追加
   3) nav() の分岐に 'regions' を追加
*/

/* ① menuScreen() 内のメニュー配列に追加する項目 */
const REGION_MENU_ITEM = `
  <button class="menu-item" onclick="nav('regions')">
    <span>地方一覧</span><span>›</span>
  </button>
`;

/* ② 地方一覧ページ */
function regionListScreen(){
  const regions = [
    ['北海道', ['北海道']],
    ['東北', ['青森県','岩手県','宮城県','秋田県','山形県','福島県']],
    ['関東', ['茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県']],
    ['中部', ['新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県']],
    ['近畿', ['三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県']],
    ['中国', ['鳥取県','島根県','岡山県','広島県','山口県']],
    ['四国', ['徳島県','香川県','愛媛県','高知県']],
    ['九州・沖縄', ['福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県']]
  ];

  return `
    <h1 class="screen-title">地方一覧</h1>
    <p class="screen-sub">都道府県は以下の8地方に分類されています。</p>
    <section class="region-list">
      ${regions.map(([region, prefs]) => `
        <article class="region-card">
          <h2>${esc(region)}</h2>
          <div class="region-prefs">
            ${prefs.map(p => `<span>${esc(p)}</span>`).join('')}
          </div>
        </article>
      `).join('')}
    </section>
  `;
}

/* ③ nav() の画面分岐に追加する内容
   case 'regions':
     screen.innerHTML = regionListScreen();
     break;
*/
