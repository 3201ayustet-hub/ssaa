import type { GameState, PrefectureView } from "./lib/types";

const PREFECTURE_LABELS: PrefectureView[] = [
  { id: "hokkaido", name: "北海道", status: "unclaimed" },
  { id: "aomori", name: "青森", status: "unclaimed" },
  { id: "iwate", name: "岩手", status: "unclaimed" },
  { id: "miyagi", name: "宮城", status: "unclaimed" },
  { id: "akita", name: "秋田", status: "unclaimed" },
  { id: "yamagata", name: "山形", status: "unclaimed" },
  { id: "fukushima", name: "福島", status: "unclaimed" },
  { id: "ibaraki", name: "茨城", status: "unclaimed" },
  { id: "tochigi", name: "栃木", status: "unclaimed" },
  { id: "gunma", name: "群馬", status: "unclaimed" },
  { id: "saitama", name: "埼玉", status: "unclaimed" },
  { id: "chiba", name: "千葉", status: "unclaimed" },
  { id: "tokyo", name: "東京", status: "excluded" },
  { id: "kanagawa", name: "神奈川", status: "unclaimed" },
  { id: "niigata", name: "新潟", status: "unclaimed" },
  { id: "toyama", name: "富山", status: "unclaimed" },
  { id: "ishikawa", name: "石川", status: "unclaimed" },
  { id: "fukui", name: "福井", status: "unclaimed" },
  { id: "yamanashi", name: "山梨", status: "unclaimed" },
  { id: "nagano", name: "長野", status: "unclaimed" },
  { id: "gifu", name: "岐阜", status: "unclaimed" },
  { id: "shizuoka", name: "静岡", status: "unclaimed" },
  { id: "aichi", name: "愛知", status: "unclaimed" },
  { id: "mie", name: "三重", status: "unclaimed" },
  { id: "shiga", name: "滋賀", status: "unclaimed" },
  { id: "kyoto", name: "京都", status: "unclaimed" },
  { id: "osaka", name: "大阪", status: "excluded" },
  { id: "hyogo", name: "兵庫", status: "unclaimed" },
  { id: "nara", name: "奈良", status: "unclaimed" },
  { id: "wakayama", name: "和歌山", status: "unclaimed" },
  { id: "tottori", name: "鳥取", status: "unclaimed" },
  { id: "shimane", name: "島根", status: "unclaimed" },
  { id: "okayama", name: "岡山", status: "unclaimed" },
  { id: "hiroshima", name: "広島", status: "unclaimed" },
  { id: "yamaguchi", name: "山口", status: "unclaimed" },
  { id: "tokushima", name: "徳島", status: "unclaimed" },
  { id: "kagawa", name: "香川", status: "unclaimed" },
  { id: "ehime", name: "愛媛", status: "unclaimed" },
  { id: "kochi", name: "高知", status: "unclaimed" },
  { id: "fukuoka", name: "福岡", status: "unclaimed" },
  { id: "saga", name: "佐賀", status: "unclaimed" },
  { id: "nagasaki", name: "長崎", status: "unclaimed" },
  { id: "kumamoto", name: "熊本", status: "unclaimed" },
  { id: "oita", name: "大分", status: "unclaimed" },
  { id: "miyazaki", name: "宮崎", status: "unclaimed" },
  { id: "kagoshima", name: "鹿児島", status: "unclaimed" },
  { id: "okinawa", name: "沖縄", status: "unclaimed" },
];

export function JapanMap({ state }: { state: GameState }) {
  return (
    <div className="map-placeholder" role="img" aria-label="日本地図">
      <div className="map-title">日本全国</div>
      <div className="prefecture-grid">
        {PREFECTURE_LABELS.map((prefecture) => {
          const live = state.prefectures.find((p) => p.id === prefecture.id) ?? prefecture;
          return (
            <button
              key={live.id}
              className={`prefecture prefecture--${live.status}`}
              aria-label={live.name}
              type="button"
            >
              {live.name}
            </button>
          );
        })}
      </div>
      <p className="map-dev-note">
        ※ 本番ではライセンス確認済みの47都道府県SVG pathへ置換する
      </p>
    </div>
  );
}
