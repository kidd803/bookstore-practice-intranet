// 文章資料的後處理規則：organize-facebook-export.mjs 產生資料時套用，
// repair-posts-data.mjs 也用同一套規則修正既有的 posts.json / posts.js。

export const DAILY_BOOK_PICK_SERIES = '書店老闆每日選書';

// 系列改名（舊名 -> 新名）
export const SERIES_RENAMES = new Map([
  ['諾貝爾文學奬', '諾貝爾文學獎']
]);

// 以作者／主題收集的系列，文章本身沒有集數；文中的年份或數字不能當成第幾篇。
export const UNNUMBERED_SERIES = new Set([
  '諾貝爾文學獎',
  '村上春樹',
  '莎士比亞',
  '海明威',
  '托爾斯泰',
  '李白',
  '卡繆',
  '莊子',
  '尼采',
  '叔本華',
  '柏拉圖',
  '蘇格拉底'
]);

export function applyPostRules(post, config) {
  const series = SERIES_RENAMES.get(post.series) || post.series || '';
  const next = { ...post, series };

  if (post.tags) {
    next.tags = [...new Set(post.tags.map((tag) => SERIES_RENAMES.get(tag) || tag))];
  }

  if (series && UNNUMBERED_SERIES.has(series)) {
    next.seriesIndex = null;
  }

  if (series && !post.category) {
    next.category = seriesCategory(series, config);
  }

  if (series === DAILY_BOOK_PICK_SERIES) {
    next.title = dailyBookPickTitle(post.title, post.body);
  }

  return next;
}

export function seriesCategory(seriesName, config) {
  const category = (config?.categories || [])
    .find((item) => (item.series || []).includes(seriesName));
  return category ? category.name : '';
}

// 每日選書的第一行常是半句宣傳語（「一部由……親筆撰寫，」）；標題沒有書名時，改用內文第一個書名。
export function dailyBookPickTitle(title = '', body = '') {
  if (/《[^》]+》/.test(title)) return title;
  const bookTitle = String(body).match(/《[^》\n]{1,60}》/);
  return bookTitle ? bookTitle[0] : title;
}
