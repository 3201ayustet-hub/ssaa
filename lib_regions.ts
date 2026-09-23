export const REGIONS = [
  { id: "hokkaido", name: "北海道", prefectures: ["hokkaido"] },
  { id: "tohoku", name: "東北", prefectures: ["aomori","iwate","miyagi","akita","yamagata","fukushima"] },
  { id: "kanto", name: "関東", prefectures: ["ibaraki","tochigi","gunma","saitama","chiba","tokyo","kanagawa"] },
  { id: "chubu", name: "中部", prefectures: ["niigata","toyama","ishikawa","fukui","yamanashi","nagano","gifu","shizuoka","aichi"] },
  { id: "kinki", name: "近畿", prefectures: ["mie","shiga","kyoto","osaka","hyogo","nara","wakayama"] },
  { id: "chugoku", name: "中国", prefectures: ["tottori","shimane","okayama","hiroshima","yamaguchi"] },
  { id: "shikoku", name: "四国", prefectures: ["tokushima","kagawa","ehime","kochi"] },
  { id: "kyushu_okinawa", name: "九州・沖縄", prefectures: ["fukuoka","saga","nagasaki","kumamoto","oita","miyazaki","kagoshima","okinawa"] },
] as const;
