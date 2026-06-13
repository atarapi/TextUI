/** @type {Record<string, number>} */
const STROKE_MAP = {
  // ひらがな
  あ: 3, い: 2, う: 2, え: 2, お: 3,
  か: 3, き: 3, く: 2, け: 3, こ: 2,
  が: 4, ぎ: 4, ぐ: 3, げ: 4, ご: 3,
  さ: 3, し: 1, す: 2, せ: 2, そ: 2,
  ざ: 4, じ: 2, ず: 3, ぜ: 3, ぞ: 3,
  た: 3, ち: 2, つ: 2, て: 2, と: 2,
  だ: 4, ぢ: 3, づ: 3, で: 3, ど: 3,
  な: 2, に: 2, ぬ: 2, ね: 2, の: 1,
  は: 3, ひ: 2, ふ: 2, へ: 2, ほ: 2,
  ば: 4, び: 3, ぶ: 3, べ: 3, ぼ: 3,
  ぱ: 4, ぴ: 3, ぷ: 3, ぺ: 3, ぽ: 3,
  ま: 2, み: 2, む: 2, め: 2, も: 3,
  や: 2, ゆ: 2, よ: 2,
  ゃ: 1, ゅ: 1, ょ: 1,
  ら: 2, り: 2, る: 2, れ: 2, ろ: 2,
  わ: 2, を: 3, ん: 1, ゔ: 3,
  // カタカナ
  ア: 2, イ: 2, ウ: 2, エ: 2, オ: 3,
  カ: 2, キ: 3, ク: 2, ケ: 3, コ: 2,
  ガ: 3, ギ: 3, グ: 2, ゲ: 3, ゴ: 2,
  サ: 2, シ: 2, ス: 2, セ: 2, ソ: 2,
  ザ: 3, ジ: 2, ズ: 2, ゼ: 2, ゾ: 2,
  タ: 2, チ: 2, ツ: 2, テ: 2, ト: 2,
  ダ: 3, ヂ: 2, ヅ: 2, デ: 2, ド: 2,
  ナ: 2, ニ: 2, ヌ: 2, ネ: 2, ノ: 1,
  ハ: 2, ヒ: 2, フ: 2, ヘ: 2, ホ: 2,
  バ: 3, ビ: 2, ブ: 2, ベ: 2, ボ: 2,
  パ: 3, ピ: 2, プ: 2, ペ: 2, ポ: 2,
  マ: 2, ミ: 2, ム: 2, メ: 2, モ: 2,
  ヤ: 2, ユ: 2, ヨ: 2,
  ャ: 1, ュ: 1, ョ: 1,
  ラ: 2, リ: 2, ル: 2, レ: 2, ロ: 2,
  ワ: 2, ヲ: 3, ン: 1, ヴ: 2,
  // 数字・記号
  〇: 1, 一: 1, 二: 2, 三: 3, 四: 5, 五: 4, 六: 4, 七: 2, 八: 2, 九: 2, 十: 2,
  百: 6, 千: 3, 万: 3, 億: 15, 兆: 6,
  // よく使う漢字
  人: 2, 口: 3, 日: 4, 月: 4, 田: 5, 目: 5, 耳: 6, 手: 4, 足: 7, 見: 7,
  言: 7, 語: 14, 話: 13, 読: 14, 書: 10, 文: 4, 字: 6, 画: 8, 数: 13,
  木: 4, 林: 8, 森: 12, 本: 5, 村: 7, 町: 7, 山: 3, 川: 3, 水: 4, 火: 4,
  土: 3, 石: 5, 金: 8, 玉: 5, 王: 4, 花: 7, 草: 9, 虫: 6, 魚: 11, 鳥: 11,
  犬: 4, 馬: 10, 車: 7, 道: 12, 学: 8, 校: 10, 先: 6, 生: 5, 名: 6, 年: 6,
  時: 10, 分: 4, 間: 12, 休: 6, 気: 6, 空: 8, 雨: 8, 雪: 11, 風: 9, 雲: 12,
  春: 9, 夏: 10, 秋: 9, 冬: 5, 朝: 12, 昼: 9, 夜: 8, 明: 8, 暗: 13, 光: 6,
  赤: 7, 青: 8, 白: 5, 黒: 11, 黄: 12, 緑: 14, 色: 6,
  心: 4, 体: 7, 病: 10, 医: 7, 安: 6, 危: 6, 難: 18, 易: 8,
  多: 6, 少: 4, 大: 3, 小: 3, 高: 10, 低: 7, 長: 8, 短: 12,
  軽: 12, 重: 9, 強: 11, 弱: 10, 早: 6, 遅: 12, 新: 13, 古: 5,
  愛: 13, 憎: 13, 喜: 12, 怒: 9, 哀: 9, 楽: 13,
  上: 3, 下: 3, 中: 4, 外: 5, 内: 4, 左: 5, 右: 5, 前: 9, 後: 9,
  東: 8, 西: 6, 南: 9, 北: 5, 国: 8, 会: 6, 社: 7, 店: 8,
  食: 9, 飲: 12, 肉: 6, 米: 6, 茶: 9, 酒: 10,
  買: 12, 売: 7, 円: 4,
  電: 13, 聞: 14, 思: 9, 考: 6, 知: 8, 覚: 12, 忘: 7,
  走: 7, 歩: 8, 立: 5, 座: 7, 寝: 13, 起: 10, 死: 6, 生: 5, 命: 8,
  海: 9, 湖: 12, 島: 10, 岸: 8, 波: 8, 港: 12,
  家: 10, 室: 9, 門: 8, 開: 12, 閉: 11,
  力: 2, 動: 11, 静: 16, 音: 9, 声: 7,
  鬱: 29, 驫: 30, 龍: 16, 曜: 18, 議: 20,
};

function isCJK(char) {
  const cp = char.codePointAt(0);
  return (cp >= 0x4E00 && cp <= 0x9FFF) || (cp >= 0x3400 && cp <= 0x4DBF);
}

function getStrokeCount(char) {
  if (STROKE_MAP[char] !== undefined) return STROKE_MAP[char];
  if (/[a-zA-Z]/.test(char)) return 1;
  if (/[0-9]/.test(char)) return Number(char) <= 3 ? Number(char) : 4;
  if (isCJK(char)) return 10;
  return 2;
}

function getWeight(char) {
  const strokes = getStrokeCount(char);
  return 300 + Math.min(strokes * 14, 550);
}

const HEAVY_THRESHOLD = 9;

/** @returns {'float' | 'sink' | 'heavy'} */
function getMotionType(char) {
  const strokes = getStrokeCount(char);
  if (strokes <= 2) return 'float';
  if (strokes >= HEAVY_THRESHOLD) return 'heavy';
  return 'sink';
}

function randomTilt(strokes) {
  const sign = Math.random() < 0.5 ? -1 : 1;
  const base = strokes >= HEAVY_THRESHOLD ? 4 : 1.5;
  const amount = base + (strokes - 3) * 0.35 + Math.random() * 2;
  return `${(sign * amount).toFixed(2)}deg`;
}

function getMotionVars(char) {
  const strokes = getStrokeCount(char);
  if (strokes <= 2) {
    return {
      type: 'float',
      floatY: `${-(10 + strokes * 4)}px`,
      riseDur: `${2.8 + strokes * 0.6}s`,
      bobDur: `${2.2 + strokes * 0.4}s`,
    };
  }

  const isHeavy = strokes >= HEAVY_THRESHOLD;
  return {
    type: isHeavy ? 'heavy' : 'sink',
    sinkY: `${(strokes - 2) * 2.6}px`,
    sinkDur: `${2.5 + strokes * 0.2}s`,
    sinkTilt: randomTilt(strokes),
    sinkScale: isHeavy ? `${(0.98 - Math.min(strokes, 20) * 0.003).toFixed(3)}` : '1',
  };
}
