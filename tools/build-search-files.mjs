#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const POSTS_JS = path.join(ROOT, 'site', 'data', 'posts.js');
const SITE_URL = 'https://2books.com.tw/';

const EXCLUDED_CATEGORIES = new Set([
  'Reels',
  '生活隨筆與其他',
  '早期短貼與生活記錄',
  '日常短句與心情',
  '活動公告與直播'
]);

const PRIORITY_SERIES = new Set([
  '納瓦爾寶典',
  '龍門心法',
  '道德經',
  '全真教法統',
  '全真道歷史',
  '書店老闆讀全真道',
  '書店老闆讀聖濟總錄',
  '重陽立教十五論',
  '長春真人西遊記',
  '諾貝爾文學奬',
  '傅佩榮西方哲學史',
  '書店老闆觀察ＡＩ',
  '紫微斗數400問',
  '理書日記',
  '聖殿騎士團',
  '李白',
  '卡繆',
  '尼采',
  '叔本華'
]);

const source = await fs.readFile(POSTS_JS, 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);

const posts = Array.isArray(context.window.FACEBOOK_POSTS)
  ? context.window.FACEBOOK_POSTS
  : [];

const selectedPosts = posts
  .filter(isSearchCandidate)
  .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

const urls = [
  {
    loc: SITE_URL,
    lastmod: selectedPosts[0]?.date || new Date().toISOString().slice(0, 10),
    changefreq: 'daily',
    priority: '1.0'
  },
  ...selectedPosts.map((post) => ({
    loc: postUrl(post),
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
console.log(`其中文章網址：${selectedPosts.length} 篇`);

function isSearchCandidate(post) {
  if (!post?.id) return false;
  if (!post.body || textLength(post.body) < 180) return false;
  if (EXCLUDED_CATEGORIES.has(post.category)) return false;
  if (/^\d{4}-\d{2}-\d{2}\s*貼文$/.test(post.title || '')) return false;
  if (PRIORITY_SERIES.has(post.series)) return true;
  return textLength(post.body) >= 360;
}

function postUrl(post) {
  const url = new URL(SITE_URL);
  url.searchParams.set('post', post.id);
  return url.toString();
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

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
