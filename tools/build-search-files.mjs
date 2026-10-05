#!/usr/bin/env node
// 產生給搜尋引擎與讀者直接進站用的檔案：
// - p/<id>.html：每篇值得被搜到的文章一頁靜態網頁（打開就有全文、書名搜尋按鈕）
// - sitemap.xml、robots.txt
// 用法：node tools/build-search-files.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_JS = path.join(ROOT, 'site', 'data', 'posts.js');
const APP_JS = path.join(ROOT, 'site', 'app.js');
const PAGES_DIR = path.join(ROOT, 'p');
const SITE_URL = 'https://blog.2books.com.tw/';
const BOOKSTORE_URL = 'https://2book.tw/';
const DEFAULT_IMAGE = new URL('site/assets/bookstore-practice.jpg', SITE_URL).toString();
const REMOTE_FACEBOOK_MEDIA_BASE_URL = 'https://storage.googleapis.com/2books-facebook-images/facebook_posts/_extracted/';
const DAILY_BOOK_PICK_SERIES = '書店老闆每日選書';
const GA_ID = 'G-ZZ6PNK10S8';

const STATIC_URLS = [
  {
    loc: new URL('site/serial/unbroken-line/', SITE_URL).toString(),
    lastmod: '2026-08-14',
    changefreq: 'weekly',
    priority: '0.9'
  },
  ...[1, 2, 3, 4].map((lecture) => ({
    loc: new URL(`site/serial/unbroken-line/chapter-01-lecture-${String(lecture).padStart(2, '0')}.html`, SITE_URL).toString(),
    lastmod: '2026-08-14',
    changefreq: 'monthly',
    priority: '0.8'
  })),
  {
    loc: new URL('about.html', SITE_URL).toString(),
    lastmod: '2026-08-13',
    changefreq: 'monthly',
    priority: '0.9'
  }
];

const EXCLUDED_CATEGORIES = new Set([
  'Reels',
  '生活隨筆與其他',
  '早期短貼與生活記錄',
  '日常短句與心情',
  '活動公告與直播'
]);

const PRIORITY_SERIES = new Set([
  '納瓦爾寶典',
  DAILY_BOOK_PICK_SERIES,
  '龍門心法',
  '道系實習生活',
  '道德經',
  '全真教法統',
  '全真道歷史',
  '聖濟總錄',
  '重陽立教十五論',
  '長春真人西遊記',
  '諾貝爾文學獎',
  '傅佩榮西方哲學史',
  '書店老闆讀史哲',
  '書店老闆觀察ＡＩ',
  '明毅請益錄：紫微 400 問',
  '理書日記',
  '聖殿騎士團',
  '李白',
  '卡繆',
  '尼采',
  '叔本華'
]);

const posts = await loadPosts();
const links = await loadBookstoreLinks();
const selectedPosts = posts
  .filter(isSearchCandidate)
  .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
const selectedIds = new Set(selectedPosts.map((post) => post.id));
const seriesPosts = groupSeries(posts);

await fs.rm(PAGES_DIR, { recursive: true, force: true });
await fs.mkdir(PAGES_DIR, { recursive: true });
for (const post of selectedPosts) {
  await fs.writeFile(path.join(PAGES_DIR, `${post.id}.html`), renderPage(post), 'utf8');
}

const urls = [
  {
    loc: SITE_URL,
    lastmod: selectedPosts[0]?.date || new Date().toISOString().slice(0, 10),
    changefreq: 'daily',
    priority: '1.0'
  },
  ...STATIC_URLS,
  ...selectedPosts.map((post) => ({
    loc: pageUrl(post),
    lastmod: post.date || new Date((post.timestamp || Date.now() / 1000) * 1000).toISOString().slice(0, 10),
    changefreq: 'monthly',
    priority: PRIORITY_SERIES.has(post.series) ? '0.8' : '0.6'
  }))
];

await fs.writeFile(path.join(ROOT, 'sitemap.xml'), buildSitemap(urls), 'utf8');
await fs.writeFile(path.join(ROOT, 'robots.txt'), [
  'User-agent: *',
  'Allow: /',
  '',
  `Sitemap: ${new URL('sitemap.xml', SITE_URL).toString()}`,
  ''
].join('\n'), 'utf8');

console.log(`建立 sitemap.xml：${urls.length} 個網址`);
console.log(`建立文章靜態頁：${selectedPosts.length} 頁（p/*.html）`);

async function loadPosts() {
  const source = await fs.readFile(POSTS_JS, 'utf8');
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context);
  return Array.isArray(context.window.FACEBOOK_POSTS) ? context.window.FACEBOOK_POSTS : [];
}

// 找書連結的對應表以 site/app.js 為準，這裡直接讀出來，避免兩邊各寫一份。
async function loadBookstoreLinks() {
  const source = await fs.readFile(APP_JS, 'utf8');
  const extract = (name) => {
    const match = source.match(new RegExp(`const ${name} = new Map\\(\\[[\\s\\S]*?\\n\\]\\);`));
    if (!match) throw new Error(`site/app.js 找不到 ${name}`);
    return match[0];
  };
  // 對應表裡會用到 app.js 開頭的字串常數（例如 BOOK_VIDEO_SERIES），一併帶入。
  const stringConstants = source.match(/^const [A-Z_]+ = '[^'\n]*';$/gm) || [];
  const context = { result: null };
  vm.createContext(context);
  vm.runInContext([
    ...stringConstants,
    extract('SERIES_SLUGS'),
    extract('BOOK_CATEGORY_RECOMMENDATIONS'),
    extract('BOOKSTORE_CATEGORY_IDS'),
    'result = { SERIES_SLUGS, BOOK_CATEGORY_RECOMMENDATIONS, BOOKSTORE_CATEGORY_IDS };'
  ].join('\n'), context);
  return context.result;
}

function isSearchCandidate(post) {
  if (!post?.id) return false;
  if (!post.body || textLength(post.body) < 180) return false;
  if (EXCLUDED_CATEGORIES.has(post.category)) return false;
  if (/^\d{4}-\d{2}-\d{2}\s*貼文$/.test(post.title || '')) return false;
  if (PRIORITY_SERIES.has(post.series)) return true;
  return textLength(post.body) >= 360;
}

function groupSeries(items) {
  const groups = new Map();
  for (const post of items) {
    if (!post.series) continue;
    if (!groups.has(post.series)) groups.set(post.series, []);
    groups.get(post.series).push(post);
  }
  for (const list of groups.values()) list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  return groups;
}

function pageUrl(post) {
  return new URL(`p/${post.id}.html`, SITE_URL).toString();
}

function appPostUrl(post) {
  const url = new URL(SITE_URL);
  url.searchParams.set('post', post.id);
  return url.toString();
}

function postLink(post) {
  return selectedIds.has(post.id) ? pageUrl(post) : appPostUrl(post);
}

function seriesUrl(series) {
  const url = new URL(SITE_URL);
  url.searchParams.set('series', links.SERIES_SLUGS.get(series) || series);
  return url.toString();
}

function seriesLabel(post) {
  if (!post.series) return '';
  const index = post.seriesIndex ? ` 第${post.seriesIndex}${post.seriesUnit || ''}` : '';
  return `${post.series}${index}`;
}

function keywordKey(value = '') {
  return String(value).replace(/[Ａａ]/g, 'A').replace(/[Ｉｉ]/g, 'I').replace(/\s+/g, '').trim();
}

function categoryLabel(post) {
  for (const candidate of [post.series, post.category, ...(post.tags || []), post.title]) {
    const label = links.BOOK_CATEGORY_RECOMMENDATIONS.get(keywordKey(candidate));
    if (label) return label;
  }
  return '全部分類';
}

function categoryUrl(label) {
  const id = links.BOOKSTORE_CATEGORY_IDS.get(label);
  return `${BOOKSTORE_URL}${id ? `?book-category=${encodeURIComponent(id)}` : ''}#two-book-category-frame`;
}

function bookTitle(post) {
  if (post.series !== DAILY_BOOK_PICK_SERIES && post.category !== '書籍選品與推薦') return '';
  const match = String(post.title || '').match(/^《([^》]{1,40})》/);
  return match ? match[1].trim() : '';
}

function searchUrl(query) {
  return `${BOOKSTORE_URL}?book-search=${encodeURIComponent(query)}#two-book-fast-search`;
}

function isImage(value = '') {
  return /\.(avif|gif|jpe?g|png|webp)$/i.test(value);
}

function mediaUrl(value = '') {
  if (/^https?:\/\//i.test(value)) return value;
  const relative = value.replace(/^outputs\/facebook_posts\/_extracted\//, '');
  if (!relative.startsWith('your_facebook_activity/')) return '';
  return `${REMOTE_FACEBOOK_MEDIA_BASE_URL}${relative.split('/').map(encodeURIComponent).join('/')}`;
}

function bodyWithoutTitle(post) {
  const body = String(post.body || '').trim();
  const title = String(post.title || '').replace(/\.\.\.$/, '');
  const firstLine = body.split('\n')[0].trim();
  return firstLine && firstLine === title ? body.slice(body.indexOf('\n') + 1).trim() : body;
}

function excerpt(post, limit = 110) {
  const text = bodyWithoutTitle(post).replace(/\s+/g, ' ').trim();
  const chars = [...text];
  return chars.length > limit ? `${chars.slice(0, limit).join('')}…` : text;
}

function renderParagraphs(text) {
  return String(text)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${block.split('\n').map((line) => linkify(escapeHtml(line.trim()))).join('<br>')}</p>`)
    .join('\n        ');
}

function linkify(html) {
  return html.replace(/https?:\/\/[^\s<>"']+/g, (url) => `<a href="${url}" rel="nofollow noopener" target="_blank">${url}</a>`);
}

function renderCta(post) {
  const book = bookTitle(post);
  const label = categoryLabel(post);
  const shelfText = label === '全部分類' ? '看全部書籍分類' : `看${label}書架`;
  if (book) {
    return `<section class="cta">
        <h2>讀完想找書</h2>
        <p>想找這本書，我替你到臻品齋書店搜尋《${escapeHtml(book)}》；想多看幾本，也可以順路逛書架。</p>
        <div class="cta-actions">
          <a class="button primary" href="${escapeHtml(searchUrl(book))}">搜尋《${escapeHtml(book)}》</a>
          <a class="button" href="${escapeHtml(categoryUrl(label))}">${escapeHtml(shelfText)}</a>
        </div>
      </section>`;
  }
  const note = label === '全部分類'
    ? '這篇文章可以先當作買書前的判斷。想接著找書，我替你接到臻品齋書店的全部書籍分類。'
    : `這篇文章可以先當作買書前的判斷。想接著找書，我替你接到臻品齋書店「${label}」分類。`;
  return `<section class="cta">
        <h2>讀完想找書</h2>
        <p>${escapeHtml(note)}</p>
        <div class="cta-actions">
          <a class="button primary" href="${escapeHtml(categoryUrl(label))}">${escapeHtml(shelfText)}</a>
          <a class="button" href="${escapeHtml(`${BOOKSTORE_URL}#two-book-fast-search`)}">搜尋其他書</a>
        </div>
      </section>`;
}

function renderSeriesNav(post) {
  if (!post.series) return '';
  const list = seriesPosts.get(post.series) || [];
  const index = list.findIndex((item) => item.id === post.id);
  const prev = index > 0 ? list[index - 1] : null;
  const next = index >= 0 && index < list.length - 1 ? list[index + 1] : null;
  const item = (target, label) => target
    ? `<a href="${escapeHtml(postLink(target))}"><span>${label}</span>${escapeHtml(target.title)}</a>`
    : '';
  return `<nav class="series-nav" aria-label="同系列文章">
        <h2>${escapeHtml(post.series)}（共 ${list.length} 篇）</h2>
        <div class="series-links">
          ${item(prev, '上一篇')}
          ${item(next, '下一篇')}
        </div>
        <a class="series-all" href="${escapeHtml(seriesUrl(post.series))}">看「${escapeHtml(post.series)}」全部文章</a>
      </nav>`;
}

function renderPage(post) {
  const title = post.title || `${post.date} 貼文`;
  const description = excerpt(post);
  const images = (post.media || []).filter(isImage).map(mediaUrl).filter(Boolean);
  const image = images[0] || DEFAULT_IMAGE;
  const label = seriesLabel(post);
  const meta = [post.date, post.category, label].filter(Boolean);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title.slice(0, 110),
    description,
    image: [image],
    datePublished: post.datetime || post.date,
    mainEntityOfPage: pageUrl(post),
    author: { '@type': 'Organization', name: '臻品齋書店' },
    publisher: { '@type': 'Organization', name: '臻品齋書店', url: BOOKSTORE_URL }
  };
  const gallery = images.slice(0, 4)
    .map((src, index) => `<img src="${escapeHtml(src)}" alt="${escapeHtml(`${title} 圖片 ${index + 1}`)}" loading="${index ? 'lazy' : 'eager'}" decoding="async">`)
    .join('\n          ');

  return `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}｜書店的修行（臻品齋）</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(pageUrl(post))}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="書店的修行（臻品齋）">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(pageUrl(post))}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <link rel="icon" type="image/png" sizes="32x32" href="/site/assets/favicon-32.png?v=20260806-favicon1">
    <link rel="apple-touch-icon" href="/site/assets/apple-touch-icon.png?v=20260806-favicon1">
    <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA_ID}');
    </script>
    <link rel="stylesheet" href="/site/post.css?v=20261005-1">
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="/">書店的修行<span>臻品齋</span></a>
      <a class="shop" href="${BOOKSTORE_URL}">逛臻品齋書店</a>
    </header>
    <main class="article">
      <p class="meta">${meta.map(escapeHtml).join('<span>·</span>')}</p>
      <h1>${escapeHtml(title)}</h1>
      <article class="body">
        ${renderParagraphs(bodyWithoutTitle(post))}
      </article>
      ${gallery ? `<div class="gallery">\n          ${gallery}\n        </div>` : ''}
      ${renderCta(post)}
      ${renderSeriesNav(post)}
      <p class="more"><a href="${escapeHtml(appPostUrl(post))}">在「書店的修行」閱讀這篇與更多文章</a></p>
    </main>
    <footer class="site-footer">
      <p>臻品齋書店｜道教、五術、中醫、歷史、哲學，新書、二手書、絕版書</p>
      <p><a href="${BOOKSTORE_URL}">2book.tw</a> · <a href="/">書店的修行</a> · <a href="/about.html">書店介紹</a></p>
    </footer>
  </body>
</html>
`;
}

function buildSitemap(items) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...items.map((item) => [
      '  <url>',
      `    <loc>${escapeXml(item.loc)}</loc>`,
      `    <lastmod>${escapeXml(item.lastmod)}</lastmod>`,
      `    <changefreq>${item.changefreq}</changefreq>`,
      `    <priority>${item.priority}</priority>`,
      '  </url>'
    ].join('\n')),
    '</urlset>',
    ''
  ].join('\n');
}

function textLength(value = '') {
  return [...String(value).trim()].length;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeXml(value = '') {
  return escapeHtml(value).replace(/'/g, '&apos;');
}
