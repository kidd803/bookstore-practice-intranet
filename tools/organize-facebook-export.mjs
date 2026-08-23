#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUT = path.join(ROOT, 'outputs', 'facebook_posts');
const DEFAULT_SITE_DATA = path.join(ROOT, 'site', 'data');
const DEFAULT_CATEGORIES = path.join(ROOT, 'facebook-archive', 'categories.json');
const NUMBER_CHARS = '一二三四五六七八九十百零〇○\\d';
const MODIFIED_VERSION_WINDOW_SECONDS = 60 * 60 * 48;
const LIFESTYLE_CATEGORY = '生活隨筆與其他';
const LIFESTYLE_REFINEMENTS = [
  {
    name: '書籍選品與推薦',
    patterns: [
      /《[^》]{2,}》|[［\[][^\]］\n]{2,60}[\]］]/,
      /作者|出版社|出版|ISBN|譯者|絕版|初版|典藏|收藏|簡體書|全新書|英文版|日文版|韓文版|英語|日語|韓語|德語|法語|開本|套書|書況|內頁|藏書|推薦閱讀|讀本|版本|booktok/i,
      /美味大挑戰|妙廚老爹|浪人劍客|黃昏流星群|島耕作|神之雫|天龍八部|金庸|獵人|芙莉蓮|火影忍者|迷宮飯/
    ]
  },
  {
    name: '書店營運與電商',
    patterns: [
      /carousell|Linepay|LINEPay|LINE Pay|一卡通|街口|代收代付/i,
      /出售|全新書|書單|聯絡電話|鎖定|私訊|匯款|下標|售價|賣方|買方|奇摩拍賣|露天拍賣|賣場|出貨|店到店|運費|郵寄|超商|蝦皮|交易|客訂|保留|銷售|慶功|已賣出|後台/
    ]
  },
  {
    name: '創業工作與經營筆記',
    patterns: [
      /創業|事業|工作|上班|團隊|目標|規劃|管理|經營|市場|客戶|生意|通路|資本|競爭|業績|成本|庫存|員工|公司|簽約|合約|報價|導入|效率|完成|執行|做事/,
      /努力|堅持|成功|失敗|改變自己|大任|舞台|戰打贏|借貨|調價格|存活|活下來/
    ]
  },
  {
    name: '心理溝通與人生',
    patterns: [
      /心理|情緒|關係|焦慮|恐懼|認同|感同身受|如履薄冰|仁慈|心軟|忍耐|調適|相信自己|夢想|勇氣|難過|不被理解|被理解|珍惜|自由|人生|心性|不強求|各自安好/
    ]
  },
  {
    name: '歷史文明與聖殿',
    patterns: [
      /三國志|岳飛|司馬遷|史記|宋代|唐代|明代|清代|朝代|鄭成功|戚繼光|本能寺|唐三彩|歷史|戰國|漢代|魏晉|考古|博物館|故宮|文明|古代|戰爭|世說新語|韓非子|王安石|張角|朱熹|子曰|孔子|管子|左傳|曹操|呂布|張遼|馬超|漢中|荊州|東吳/
    ]
  },
  {
    name: '文學與諾貝爾',
    patterns: [
      /水滸傳|三國演義|紅樓夢|西遊記|蘇軾|蘇東坡|杜甫|李白|辛棄疾|大仲馬|三劍客|莎士比亞|小說|詩|文學|散文|作家|文豪|卡夫卡|托爾斯泰|海明威|村上春樹|柴田鍊三郎|陳舜臣|藤澤周平/
    ]
  },
  {
    name: 'AI科技觀察',
    patterns: [
      /我愛寫程式|我愛架站|我愛修電腦|架站|網站|程式|電腦|網頁|伺服器|資料庫|php|firepower|Cisco|openbazaar|coinbase/i,
      /AI|ChatGPT|Codex|自動化|科技|演算法|軟體|系統/i
    ]
  },
  {
    name: '宗教民俗與靈修',
    patterns: [
      /阿彌陀佛|佛教|佛|禪|忍辱|六波羅蜜|菩薩|神明|宮廟|宗教|修行|靈修|祭拜|法會|因果|金剛經|妙法|秘術|河洛|理氣|象數/
    ]
  },
  {
    name: '高雄在地與旅行',
    patterns: [
      /高雄|楠梓|台南|臺南|台中|臺中|台北|臺北|台東|臺東|屏東|花蓮|嘉義|上海|廣州|廈門|安平|金門/,
      /旅行|旅遊|出遊|歸途|機場|候補|城市|夜市|市場|瑞豐夜市|自由市場|駁二|台灣燈會|燈會|蓮池潭|觀音湖|旗津|西子灣|新崛江|鳳山|旗山|岡山/
    ]
  },
  {
    name: '飲食餐桌與日常',
    patterns: [
      /吃飯|吃一下|晚餐|早餐|午餐|宵夜|咖啡|喝|茶|酒|飯|麵|便當|蛋糕|餐廳|料理|下酒菜|美食|家樂福|麻辣|鴨翅|水餃|男子漢的晚餐|壽喜燒|芒果冰|雞胸肉|大阪王將|炭火料理|豆漿|烤肉|關東煮/
    ]
  },
  {
    name: '金錢理財與消費',
    patterns: [
      /錢|財富|投資|股票|基金|理財|消費|價格|收入|財務|發財|財神|付款|支付|現金|刷卡|信用卡|變現|智付寶|支付寶|alipay|有錢|沒錢|花錢/i
    ]
  },
  {
    name: '健康身體與作息',
    patterns: [
      /身體|健康|醫院|醫生|生病|感冒|睡眠|失眠|疲勞|運動|走路|公里|早睡早起|作息|精神|血壓|戰力|愛睏|熱到|三十四度|溫度|天氣|晴空|秋分|立夏|小滿|進廠維修|瘦身/
    ]
  },
  {
    name: '社會時事與觀察',
    patterns: [
      /新聞|政治|社會|選舉|政府|媒體|疫情|戰爭|中國|美國|日本|台灣|臺灣|事件|國家|世界|時代|自由時報|工商時報|Yahoo|ctee|ltn|edh\.tw|news|馬雲|淘寶|麥肯錫/i
    ]
  },
  {
    name: '家庭人情與日常',
    patterns: [
      /老婆|媽媽|爸爸|父親|母親|老媽|孩子|女兒|兒子|家人|家庭|朋友|生日快樂|人情|相處|MOMO|momo|貓咪日常|胖胖貓/
    ]
  },
  {
    name: '影音音樂與娛樂',
    patterns: [
      /音樂|演唱會|遊戲|電影|戲劇|影集|我的大叔|動漫|漫畫|歌曲|這首歌|歌名|鋼琴|布拉姆斯|nightwish|Spotify|Netflix|追劇|大娛樂家|Youku|youku|百看不厭/i
    ]
  },
  {
    name: '日常短句與心情',
    patterns: [
      /大家早安|大家晚安|早安|晚安|新的一天|新的一週|加油|衝啊|衝阿|喘口氣|算了|好吧|很好|真好|奇怪|可惡|哈哈|希望|快樂|心情|決定了|繼續衝刺|精疲力盡|網路紅人|徽章|活得精彩|江湖|期待|光明|路遠|滑壘成功|耶誕快樂|跨年|拜拜|舒服|感傷|開心|好心情|真妙|不錯|感覺/
    ]
  }
];
const LOCATION_ONLY_LINES = new Set([
  '高雄市',
  '高雄',
  '台北市',
  '臺北市',
  '新北市',
  '台中市',
  '臺中市',
  '台南市',
  '臺南市',
  '桃園市',
  '基隆市',
  '新竹市',
  '嘉義市',
  '新竹縣',
  '苗栗縣',
  '彰化縣',
  '南投縣',
  '雲林縣',
  '嘉義縣',
  '屏東縣',
  '宜蘭縣',
  '花蓮縣',
  '台東縣',
  '臺東縣',
  '澎湖縣',
  '金門縣',
  '連江縣',
  'kaohsiung',
  'kaohsiungcity',
  'kaohsiungtaiwan'
].map(normalizeSeriesText));
const KNOWN_SERIES = [
  {
    name: '重陽立教十五論',
    total: 15,
    unit: '講',
    anyKeywords: ['重陽立教十五論']
  },
  {
    name: '道士在書中找到黃金屋',
    total: null,
    unit: '章',
    anyKeywords: ['道士在書中找到黃金屋', '冠巾近百日後的變化'],
    matchLines: 5
  },
  {
    name: '鹿邑之旅',
    total: null,
    unit: '天',
    anyKeywords: ['鹿邑之旅', '鹿邑冠巾之旅'],
    matchLines: 2
  },
  {
    name: '圓安易學',
    total: null,
    unit: '篇',
    anyKeywords: ['圓安易學'],
    matchLines: 2
  },
  {
    name: '長春真人西遊記',
    total: null,
    unit: '章',
    patterns: ['^(高雄市){0,2}長春真人西遊記'],
    matchLines: 3,
    exclude: ['這不是孫悟空的故事']
  },
  {
    name: '全真教法統',
    total: null,
    unit: '',
    unitPattern: '[卷章]',
    dynamicUnit: true,
    category: '道學全真與道德經',
    patterns: [
      '^第[一二三四五六七八九十百零〇○0-9]+卷',
      '^第[一二三四五六七八九十百零〇○0-9]+章',
      '^冠巾第[一二三四五六七八九十百零〇○0-9]+章'
    ],
    matchLines: 1
  },
  {
    name: '龍門心法',
    total: null,
    unit: '章',
    unitPattern: '[章部篇講]',
    anyKeywords: ['龍門心法'],
    matchLines: 4,
    matchChars: 420
  },
  {
    name: '納瓦爾寶典',
    total: null,
    unit: '講',
    anyKeywords: ['納瓦爾寶典', 'Naval Ravikant'],
    exclude: ['馬斯克寶典'],
    indexPatterns: [
      '納瓦爾寶典\\s*0?[2-9][-－—]([0-9]{1,3})',
      '書店老闆讀《?納瓦爾寶典》?\\s*0?[2-9][-－—]([0-9]{1,3})'
    ],
    matchLines: 5,
    matchChars: 520
  },
  {
    name: '全真道歷史',
    total: null,
    unit: '篇',
    anyKeywords: [
      '書店老闆讀全真道',
      '全真道歷史新探',
      '全真道歷史筆記',
      '全真道歷史📝筆記',
      '明代全真道',
      '明代全真道的衰而復興'
    ],
    patterns: [
      '^書店老闆讀全真道歷史新探',
      '^[0-9]{5,8}全真道歷史',
      '^[0-9]{5,8}明代全真道'
    ],
    matchLines: 2,
    matchChars: 260
  },
  {
    name: '聖殿騎士團',
    total: null,
    unit: '章',
    anyKeywords: ['聖殿騎士團']
  },
  {
    name: '文藝復興',
    total: null,
    unit: '',
    patterns: [
      '^文藝復興[一二三四五六七八九十百零〇○0-9]',
      '傅佩榮西方哲學課.*文藝復興[一二三四五六七八九十百零〇○0-9]'
    ],
    matchLines: 3
  },
  {
    name: '復旦大學歷史系',
    total: null,
    unit: '',
    patterns: ['^復旦大學歷史系'],
    matchLines: 2
  },
  {
    name: '八二三注',
    total: null,
    unit: '章',
    patterns: ['^(高雄市){0,2}八二三注'],
    matchLines: 3
  },
  {
    name: '諾貝爾文學奬',
    total: null,
    unit: '篇',
    anyKeywords: ['諾貝爾文學奬', '諾貝爾文學獎']
  },
  {
    name: '傅佩榮西方哲學史',
    total: null,
    unit: '篇',
    anyKeywords: ['傅佩榕西方哲學史', '傅佩榕西方哲學課', '傅佩榮的西方哲學課', '傅佩榮的西方哲學']
  },
  {
    name: '書店老闆讀史哲',
    total: null,
    unit: '篇',
    anyKeywords: ['書店老闆讀史哲']
  },
  {
    name: '聖濟總錄',
    total: null,
    unit: '篇',
    anyKeywords: ['聖濟總錄', '書店老闆讀《聖濟總錄》']
  },
  {
    name: '理書日記',
    total: null,
    unit: '篇',
    anyKeywords: ['理書日記']
  },
  {
    name: '明毅請益錄：紫微 400 問',
    total: 400,
    unit: '',
    anyKeywords: ['明毅請益錄：紫微 400 問', '明毅請益錄紫微400問', '紫微斗數400問', '紫微400問']
  },
  {
    name: '書店老闆觀察ＡＩ',
    total: null,
    unit: '篇',
    anyKeywords: ['書店老闆觀察AI', '書店老闆觀察AI時代']
  },
  {
    name: '道德經',
    total: 81,
    unit: '章',
    anyKeywords: ['書店老闆讀道德經', '道德經原文', '道德經']
  },
  {
    name: '卡繆',
    total: null,
    unit: '篇',
    anyKeywords: ['卡繆', '卡謬', '阿爾貝卡繆', '阿爾貝卡謬', '加繆'],
    matchLines: 5,
    matchChars: 520
  },
  {
    name: '叔本華',
    total: null,
    unit: '篇',
    anyKeywords: ['叔本華'],
    matchLines: 5,
    matchChars: 520
  },
  {
    name: '尼采',
    total: null,
    unit: '篇',
    anyKeywords: ['尼采', 'Nietzsche'],
    matchLines: 5,
    matchChars: 520
  },
  {
    name: '莊子',
    total: null,
    unit: '篇',
    anyKeywords: ['莊子'],
    matchLines: 5,
    matchChars: 520
  },
  {
    name: '莎士比亞',
    total: null,
    unit: '篇',
    anyKeywords: ['莎士比亞', '莎翁', 'Shakespeare'],
    matchLines: 5,
    matchChars: 520
  },
  {
    name: '托爾斯泰',
    total: null,
    unit: '篇',
    anyKeywords: ['托爾斯泰', '托尔斯泰'],
    matchLines: 5,
    matchChars: 520
  },
  {
    name: '海明威',
    total: null,
    unit: '篇',
    anyKeywords: ['海明威', 'Hemingway'],
    matchLines: 5,
    matchChars: 520
  },
  {
    name: '柏拉圖',
    total: null,
    unit: '篇',
    anyKeywords: ['柏拉圖', '柏拉图', 'Plato'],
    matchLines: 5,
    matchChars: 520
  },
  {
    name: '蘇格拉底',
    total: null,
    unit: '篇',
    anyKeywords: ['蘇格拉底', '苏格拉底', 'Socrates'],
    matchLines: 5,
    matchChars: 520
  },
  {
    name: '村上春樹',
    total: null,
    unit: '篇',
    anyKeywords: ['村上春樹', '村上春树'],
    matchLines: 5,
    matchChars: 520
  },
  {
    name: '李白',
    total: null,
    unit: '篇',
    anyKeywords: ['李白', '李太白'],
    matchLines: 5,
    matchChars: 520
  }
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const input = args.input ? path.resolve(args.input) : await findLatestZip();
  if (!input) {
    throw new Error('找不到 Facebook ZIP。請指定路徑，例如：node tools/organize-facebook-export.mjs ~/Downloads/facebook.zip');
  }

  const outDir = path.resolve(args.out || DEFAULT_OUT);
  const siteDataDir = path.resolve(args.siteData || DEFAULT_SITE_DATA);
  const categoriesPath = path.resolve(args.categories || DEFAULT_CATEGORIES);
  const workDir = path.join(outDir, '_extracted');

  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(siteDataDir, { recursive: true });

  const sourceDir = await prepareInput(input, workDir);
  const categories = await readCategories(categoriesPath);
  const jsonFiles = await collectJsonFiles(sourceDir);
  const posts = [];

  for (const file of jsonFiles) {
    const parsed = await readJson(file);
    if (!parsed) continue;
    findPosts(parsed, file, posts);
  }

  const enriched = dedupePosts(posts)
    .map((post) => enrichPost(post, sourceDir, categories))
    .filter((post) => post.body || post.media.length)
    .sort((a, b) => b.timestamp - a.timestamp);
  const { posts: cleanPosts, removed: mojibakeRemoved } = removeMojibakePosts(enriched);
  const { posts: normalized, report } = mergeDuplicatePosts(cleanPosts);
  report.mojibakeRemoved = mojibakeRemoved;
  report.summary.mojibakeRemovedPosts = mojibakeRemoved.length;
  const numbered = numberQuanzhenHistoryNewExplorationTitles(normalized);

  await writeOutputs(numbered, outDir, siteDataDir, report);

  console.log(`完成：整理出 ${numbered.length} 篇貼文`);
  console.log(`亂碼中文刪除：${mojibakeRemoved.length} 篇`);
  console.log(`精確重複合併：${report.summary.exactMergedGroups} 組，合併 ${report.summary.exactMergedPosts} 篇`);
  console.log(`修改版本合併：${report.summary.modifiedMergedGroups} 組，合併 ${report.summary.modifiedMergedPosts} 篇，保留最後一版`);
  console.log(`純圖片同日合併：${report.summary.mediaOnlyMergedGroups} 組，合併 ${report.summary.mediaOnlyMergedPosts} 篇`);
  console.log(`隱藏純圖片重複：${report.summary.hiddenMediaOnlyPosts} 篇`);
  console.log(`疑似重複待確認：${report.summary.suspectedDuplicateGroups} 組`);
  console.log(`Markdown：${path.join(outDir, 'markdown')}`);
  console.log(`網站資料：${path.join(siteDataDir, 'posts.js')}`);
  console.log(`索引檔：${path.join(outDir, 'posts.json')}`);
  console.log(`重複報告：${path.join(outDir, 'duplicate-report.md')}`);
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--out') args.out = argv[++index];
    else if (arg === '--site-data') args.siteData = argv[++index];
    else if (arg === '--categories') args.categories = argv[++index];
    else if (!args.input) args.input = arg;
  }
  return args;
}

function printHelp() {
  console.log(`
用法：
  node tools/organize-facebook-export.mjs /path/to/facebook-export.zip
  node tools/organize-facebook-export.mjs /path/to/extracted-folder

輸出：
  outputs/facebook_posts/posts.json
  outputs/facebook_posts/markdown/*.md
  site/data/posts.js

不指定路徑時，會嘗試從 ~/Downloads 找最近的 Facebook ZIP。
`.trim());
}

async function findLatestZip() {
  const downloads = path.join(os.homedir(), 'Downloads');
  let entries = [];
  try {
    entries = await fs.readdir(downloads, { withFileTypes: true });
  } catch {
    return null;
  }

  const candidates = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.zip')) continue;
    const fullPath = path.join(downloads, entry.name);
    const stat = await fs.stat(fullPath);
    const name = entry.name.toLowerCase();
    const likelyFacebook = /facebook|meta|information|download|your.*info|資料|資訊/.test(name);
    if (likelyFacebook) candidates.push({ fullPath, mtimeMs: stat.mtimeMs });
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0]?.fullPath || null;
}

function numberQuanzhenHistoryNewExplorationTitles(posts) {
  const baseTitle = '書店老闆讀《全真道歷史新探》';
  const targetIds = new Map(
    posts
      .filter((post) => post.series === '全真道歷史' && post.title === baseTitle)
      .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id))
      .map((post, index) => [post.id, `${baseTitle}${index + 1}`])
  );

  if (!targetIds.size) return posts;
  return posts.map((post) => {
    const numberedTitle = targetIds.get(post.id);
    return numberedTitle ? { ...post, title: numberedTitle } : post;
  });
}

async function prepareInput(input, workDir) {
  const stat = await fs.stat(input);
  if (stat.isDirectory()) return input;
  if (!input.toLowerCase().endsWith('.zip')) {
    throw new Error(`不支援的檔案類型：${input}`);
  }

  await fs.rm(workDir, { recursive: true, force: true });
  await fs.mkdir(workDir, { recursive: true });
  try {
    await execFileAsync('unzip', ['-q', input, 'your_facebook_activity/posts/*', '-d', workDir]);
  } catch {
    await fs.rm(workDir, { recursive: true, force: true });
    await fs.mkdir(workDir, { recursive: true });
    await execFileAsync('unzip', ['-q', input, '-d', workDir]);
  }
  return workDir;
}

async function readCategories(file) {
  try {
    const text = await fs.readFile(file, 'utf8');
    return JSON.parse(text);
  } catch {
    return {
      categories: [
        { name: '修行開示', keywords: ['修行', '修煉', '靜心', '善念', '心性', '功德', '因果', '道心'] },
        { name: '道法科儀', keywords: ['法會', '科儀', '符', '咒', '祭', '開光', '安座', '祈福'] },
        { name: '經典法語', keywords: ['經', '道德經', '老子', '莊子', '祖師', '聖訓', '法語'] },
        { name: '人生問答', keywords: ['請問', '問答', '感情', '事業', '家庭', '健康', '煩惱'] },
        { name: '節日祭祀', keywords: ['農曆', '初一', '十五', '中元', '清明', '端午', '過年', '祭祖'] },
        { name: '公告活動', keywords: ['公告', '通知', '報名', '活動', '直播', '時間', '地址'] }
      ],
      fallback: '未分類'
    };
  }
}

async function collectJsonFiles(dir) {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function findPosts(value, file, posts) {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (isPostLike(item, file)) posts.push({ raw: item, sourceFile: file });
      else findPosts(item, file, posts);
    }
    return;
  }

  if (!value || typeof value !== 'object') return;
  for (const child of Object.values(value)) findPosts(child, file, posts);
}

function isPostLike(item, file) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const fileHint = /post|貼文|your_activity|timeline/i.test(file);
  const timestamp = findTimestamp(item);
  const body = extractBody(item);
  const media = collectMedia(item);
  return fileHint && Boolean(timestamp) && Boolean(body || media.length);
}

function findTimestamp(value) {
  if (!value || typeof value !== 'object') return null;
  for (const key of ['timestamp', 'creation_timestamp', 'created_timestamp', 'created_time']) {
    if (typeof value[key] === 'number') return normalizeTimestamp(value[key]);
    if (typeof value[key] === 'string' && /^\d+$/.test(value[key])) return normalizeTimestamp(Number(value[key]));
  }
  return null;
}

function normalizeTimestamp(timestamp) {
  return timestamp > 10_000_000_000 ? Math.round(timestamp / 1000) : timestamp;
}

function dedupePosts(posts) {
  const seen = new Set();
  const unique = [];
  for (const post of posts) {
    const timestamp = findTimestamp(post.raw) || 0;
    const body = extractBody(post.raw);
    const key = hash(`${timestamp}\n${body}\n${post.sourceFile}`);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(post);
  }
  return unique;
}

function enrichPost(post, sourceRoot, categories) {
  const timestamp = findTimestamp(post.raw) || 0;
  const body = cleanLeadingLocationLines(extractBody(post.raw));
  const media = collectMedia(post.raw).map((uri) => normalizeMediaUri(uri, sourceRoot, post.sourceFile));
  const title = makeTitle(body, timestamp);
  const text = `${title}\n${body}`;
  const datetime = new Date(timestamp * 1000).toISOString();
  const date = taipeiDate(timestamp);
  const preliminaryCategory = normalizeCategoryName(categorize(text, categories));
  const seriesInfo = inferSeries(text, preliminaryCategory);
  let category = seriesInfo.name ? '' : preliminaryCategory;
  if (!seriesInfo.name && !body && media.length) category = 'Reels';
  if (!seriesInfo.name && category === LIFESTYLE_CATEGORY) {
    category = refineLifestyleCategory({ title, body, text, date });
  }
  const relativeSource = path.relative(sourceRoot, post.sourceFile);
  const id = hash(`${timestamp}\n${body}\n${relativeSource}`).slice(0, 12);

  return {
    id,
    title,
    date,
    datetime,
    timestamp,
    category,
    series: seriesInfo.name,
    seriesIndex: seriesInfo.index,
    seriesTotal: seriesInfo.total,
    seriesUnit: seriesInfo.unit,
    tags: unique([seriesInfo.name, ...inferTags(text, categories)]),
    body,
    media,
    sourceFile: relativeSource,
    sourceFiles: [relativeSource]
  };
}

function mergeDuplicatePosts(posts) {
  const exactReport = [];
  const exactMerged = [];
  const exactGroups = new Map();
  const exactGroupedIds = new Set();

  for (const post of posts) {
    const bodyKey = duplicateBodyKey(post.body);
    if (!bodyKey) continue;
    const key = `${post.date}\n${bodyKey}`;
    if (!exactGroups.has(key)) exactGroups.set(key, []);
    exactGroups.get(key).push(post);
  }

  for (const group of exactGroups.values()) {
    if (group.length < 2) continue;
    const merged = mergePostGroup(group);
    exactMerged.push(merged);
    group.forEach((post) => exactGroupedIds.add(post.id));
    exactReport.push({
      date: merged.date,
      title: merged.title,
      keptId: merged.id,
      mergedIds: group.map((post) => post.id),
      mergedPosts: group.length,
      mediaBefore: unique(group.flatMap((post) => post.media || [])).length,
      mediaAfter: merged.media.length,
      sourceFiles: merged.sourceFiles
    });
  }

  const exactVisible = [
    ...posts.filter((post) => !exactGroupedIds.has(post.id)),
    ...exactMerged
  ].sort((a, b) => b.timestamp - a.timestamp);

  const { posts: modifiedVisible, report: modifiedMerged } = mergeModifiedPostVersions(exactVisible);
  const { posts: mediaOnlyVisible, report: mediaOnlyMerged } = mergeMediaOnlyPostGroups(modifiedVisible);

  const mediaInTextPosts = new Set();
  for (const post of mediaOnlyVisible) {
    if (!post.body?.trim()) continue;
    for (const item of post.media || []) mediaInTextPosts.add(item);
  }

  const hiddenMediaOnly = [];
  const visible = [];
  for (const post of mediaOnlyVisible) {
    const media = post.media || [];
    const isRedundantMediaOnly = !post.body?.trim()
      && media.length
      && media.every((item) => mediaInTextPosts.has(item));
    if (isRedundantMediaOnly) {
      hiddenMediaOnly.push({
        id: post.id,
        date: post.date,
        title: post.title,
        media,
        sourceFile: post.sourceFile
      });
      continue;
    }
    visible.push(post);
  }

  const suspectedDuplicates = findSuspectedDuplicates(visible);
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      inputPosts: posts.length,
      outputPosts: visible.length,
      exactMergedGroups: exactReport.length,
      exactMergedPosts: exactReport.reduce((sum, item) => sum + item.mergedPosts - 1, 0),
      modifiedMergedGroups: modifiedMerged.length,
      modifiedMergedPosts: modifiedMerged.reduce((sum, item) => sum + item.mergedPosts - 1, 0),
      mediaOnlyMergedGroups: mediaOnlyMerged.length,
      mediaOnlyMergedPosts: mediaOnlyMerged.reduce((sum, item) => sum + item.mergedPosts - 1, 0),
      hiddenMediaOnlyPosts: hiddenMediaOnly.length,
      suspectedDuplicateGroups: suspectedDuplicates.length
    },
    exactMerged: exactReport,
    modifiedMerged,
    mediaOnlyMerged,
    hiddenMediaOnly,
    suspectedDuplicates
  };

  return { posts: visible, report };
}

function removeMojibakePosts(posts) {
  const removed = [];
  const clean = [];
  for (const post of posts) {
    if (hasCjkMojibake(`${post.title || ''}\n${post.body || ''}`)) {
      removed.push({
        id: post.id,
        date: post.date,
        title: post.title,
        category: post.category,
        series: post.series,
        excerpt: excerptForReport(post.body)
      });
      continue;
    }
    clean.push(post);
  }
  return { posts: clean, removed };
}

function hasCjkMojibake(value = '') {
  const text = String(value);
  const byteLikeSequences = text.match(/(?:[\u00c2-\u00f4][\u0080-\u00bf]{1,3})+/g) || [];
  return byteLikeSequences.some((sequence) => {
    const decoded = Buffer.from(sequence, 'latin1').toString('utf8');
    return countMatches(decoded, /[\u3400-\u9fff]/g) > 0;
  });
}

function mergePostGroup(group, options = {}) {
  const sorted = [...group].sort((a, b) => {
    if (options.primary === 'latest') return b.timestamp - a.timestamp;
    const bodyDelta = (b.body || '').length - (a.body || '').length;
    if (bodyDelta) return bodyDelta;
    const mediaDelta = (b.media || []).length - (a.media || []).length;
    if (mediaDelta) return mediaDelta;
    return b.timestamp - a.timestamp;
  });
  const primary = sorted[0];
  const media = unique(group.flatMap((post) => post.media || []));
  const sourceFiles = unique(group.flatMap((post) => post.sourceFiles || [post.sourceFile]));
  const tags = unique(group.flatMap((post) => post.tags || []));

  return {
    ...primary,
    media,
    tags,
    sourceFile: sourceFiles[0] || primary.sourceFile,
    sourceFiles,
    mergedPostIds: group.map((post) => post.id),
    duplicateCount: group.length
  };
}

function mergeModifiedPostVersions(posts) {
  const groups = new Map();
  for (const post of posts) {
    if (!post.body?.trim()) continue;
    const titleKey = duplicateTitleKey(post.title);
    if (!isUsefulModifiedTitleKey(titleKey)) continue;
    if (!groups.has(titleKey)) groups.set(titleKey, []);
    groups.get(titleKey).push(post);
  }

  const mergedIds = new Set();
  const mergedPosts = [];
  const report = [];

  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const clusters = clusterModifiedPostVersions(group);
    for (const cluster of clusters) {
      if (cluster.length < 2) continue;
      const merged = mergePostGroup(cluster, { primary: 'latest' });
      mergedPosts.push(merged);
      cluster.forEach((post) => mergedIds.add(post.id));
      report.push({
        date: merged.date,
        title: merged.title,
        keptId: merged.id,
        keptDatetime: merged.datetime,
        mergedIds: cluster.map((post) => post.id),
        mergedPosts: cluster.length,
        dateRange: unique(cluster.map((post) => post.date)).sort(),
        mediaBefore: unique(cluster.flatMap((post) => post.media || [])).length,
        mediaAfter: merged.media.length,
        sourceFiles: merged.sourceFiles
      });
    }
  }

  return {
    posts: [
      ...posts.filter((post) => !mergedIds.has(post.id)),
      ...mergedPosts
    ].sort((a, b) => b.timestamp - a.timestamp),
    report
  };
}

function clusterModifiedPostVersions(group) {
  const sorted = [...group].sort((a, b) => b.timestamp - a.timestamp);
  const clusters = [];
  const used = new Set();
  for (let index = 0; index < sorted.length; index += 1) {
    if (used.has(index)) continue;
    const cluster = [sorted[index]];
    used.add(index);
    for (let otherIndex = index + 1; otherIndex < sorted.length; otherIndex += 1) {
      if (used.has(otherIndex)) continue;
      const candidate = sorted[otherIndex];
      const matches = cluster.some((post) => isModifiedVersion(post, candidate));
      if (!matches) continue;
      cluster.push(candidate);
      used.add(otherIndex);
    }
    clusters.push(cluster);
  }
  return clusters;
}

function isModifiedVersion(left, right) {
  if (Math.abs((left.timestamp || 0) - (right.timestamp || 0)) > MODIFIED_VERSION_WINDOW_SECONDS) return false;
  if (!sameSeriesOrCategory(left, right)) return false;
  return isSameOrHighlySimilar(left.body, right.body);
}

function isSameOrHighlySimilar(left, right) {
  const a = duplicateBodyKey(left);
  const b = duplicateBodyKey(right);
  if (!a || !b) return false;
  if (a === b) return true;
  return isHighlySimilar(left, right);
}

function sameSeriesOrCategory(left, right) {
  if ((left.series || right.series) && left.series !== right.series) return false;
  if ((left.category || right.category) && left.category !== right.category) return false;
  return true;
}

function isUsefulModifiedTitleKey(titleKey = '') {
  if (titleKey.length < 6) return false;
  return !['reels', '貼文', '高雄市', '高雄'].includes(titleKey);
}

function mergeMediaOnlyPostGroups(posts) {
  const groups = new Map();
  const singles = [];
  for (const post of posts) {
    const key = mediaOnlyGroupKey(post);
    if (!key) {
      singles.push(post);
      continue;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(post);
  }

  const merged = [];
  const report = [];
  for (const group of groups.values()) {
    if (group.length < 2) {
      singles.push(group[0]);
      continue;
    }
    const mergedPost = mergePostGroup(group);
    merged.push(mergedPost);
    report.push({
      date: mergedPost.date,
      title: mergedPost.title,
      keptId: mergedPost.id,
      mergedIds: group.map((post) => post.id),
      mergedPosts: group.length,
      mediaBefore: group.reduce((sum, post) => sum + (post.media || []).length, 0),
      mediaAfter: mergedPost.media.length,
      sourceFiles: mergedPost.sourceFiles
    });
  }

  return {
    posts: [...singles, ...merged].sort((a, b) => b.timestamp - a.timestamp),
    report
  };
}

function mediaOnlyGroupKey(post) {
  const media = post.media || [];
  if (post.body?.trim() || !media.length) return '';
  const titleKey = duplicateTitleKey(post.title);
  if (!titleKey) return '';
  return [
    post.date || '',
    post.category || '',
    post.series || '',
    post.seriesIndex || '',
    titleKey
  ].join('\n');
}

function findSuspectedDuplicates(posts) {
  const groups = new Map();
  for (const post of posts) {
    if (!post.body?.trim()) continue;
    const titleKey = duplicateTitleKey(post.title);
    if (!titleKey) continue;
    const key = `${post.date}\n${titleKey}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(post);
  }

  const suspects = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const clusters = clusterSimilarPosts(group);
    for (const cluster of clusters) {
      if (cluster.length < 2) continue;
      suspects.push({
        date: cluster[0].date,
        title: cluster[0].title,
        items: cluster.map((post) => ({
          id: post.id,
          datetime: post.datetime,
          bodyLength: post.body.length,
          mediaCount: post.media.length,
          sourceFile: post.sourceFile,
          excerpt: excerptForReport(post.body)
        }))
      });
    }
  }
  return suspects;
}

function clusterSimilarPosts(group) {
  const clusters = [];
  const used = new Set();
  for (let index = 0; index < group.length; index += 1) {
    if (used.has(index)) continue;
    const cluster = [group[index]];
    used.add(index);
    for (let otherIndex = index + 1; otherIndex < group.length; otherIndex += 1) {
      if (used.has(otherIndex)) continue;
      if (isHighlySimilar(group[index].body, group[otherIndex].body)) {
        cluster.push(group[otherIndex]);
        used.add(otherIndex);
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

function isHighlySimilar(left, right) {
  const a = duplicateBodyKey(left);
  const b = duplicateBodyKey(right);
  if (!a || !b || a === b) return false;
  const shorter = Math.min(a.length, b.length);
  const longer = Math.max(a.length, b.length);
  if (shorter < 80) return false;
  if ((a.includes(b) || b.includes(a)) && shorter / longer >= 0.78) return true;
  return shingleSimilarity(a, b) >= 0.86;
}

function shingleSimilarity(left, right) {
  const a = shingles(left, 8);
  const b = shingles(right, 8);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection += 1;
  }
  return intersection / Math.min(a.size, b.size);
}

function shingles(value, size) {
  const result = new Set();
  for (let index = 0; index <= value.length - size; index += 1) {
    result.add(value.slice(index, index + size));
  }
  return result;
}

function inferSeries(text, preliminaryCategory = '') {
  for (const series of KNOWN_SERIES) {
    if (series.category && preliminaryCategory !== series.category) continue;
    const probeText = seriesProbeText(text, series.matchLines || 1, series.matchChars || 0);
    const normalized = normalizeSeriesText(probeText);
    const includesKeywords = seriesMatches(series, normalized);
    const includesExcluded = (series.exclude || []).some((keyword) => normalized.includes(normalizeSeriesText(keyword)));
    if (!includesKeywords || includesExcluded) continue;
    return {
      name: series.name,
      index: inferSeriesIndex(probeText, series.unit, series.indexKeywords || [series.name], series.unitPattern, series.indexPatterns),
      total: series.total,
      unit: series.dynamicUnit ? inferSeriesUnit(probeText, series.unit) : series.unit
    };
  }
  return { name: '', index: null, total: null, unit: '' };
}

function seriesProbeText(text, lineLimit = 1, charLimit = 0) {
  const lines = String(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const probe = lines.slice(0, lineLimit).join('\n') || String(text).slice(0, 160);
  return charLimit ? probe.slice(0, charLimit) : probe;
}

function seriesMatches(series, normalizedText) {
  const anyKeywords = series.anyKeywords || series.keywords || [];
  const allKeywords = series.allKeywords || [];
  const patterns = series.patterns || [];
  const hasAny = !anyKeywords.length
    || anyKeywords.some((keyword) => normalizedText.includes(normalizeSeriesText(keyword)));
  const hasAll = allKeywords.every((keyword) => normalizedText.includes(normalizeSeriesText(keyword)));
  const hasPattern = !patterns.length
    || patterns.some((pattern) => new RegExp(pattern, 'i').test(normalizedText));
  return hasAny && hasAll && hasPattern;
}

function inferSeriesIndex(text, unit, labels = [], customUnitPattern = '', customIndexPatterns = []) {
  const unitPattern = customUnitPattern || (unit ? escapeRegExp(unit) : '[章講篇條]');
  const labelPattern = labels.length
    ? `(?:${labels.map((label) => escapeRegExp(label)).join('|')})`
    : null;
  const patterns = [
    ...customIndexPatterns.map((pattern) => new RegExp(pattern, 'i')),
    ...(labelPattern ? [new RegExp(`${labelPattern}\\s*([${NUMBER_CHARS}]{1,4})`, 'i')] : []),
    new RegExp(`第\\s*([${NUMBER_CHARS}]{1,4})\\s*${unitPattern}`, 'i'),
    new RegExp(`[（(]\\s*([${NUMBER_CHARS}]{1,4})\\s*[）)]`, 'i'),
    new RegExp(`([${NUMBER_CHARS}]{1,4})\\s*${unitPattern}`, 'i'),
    new RegExp(`問[與和]?答\\s*([${NUMBER_CHARS}]{1,4})`, 'i'),
    new RegExp(`([${NUMBER_CHARS}]{1,4})\\s*$`, 'i')
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = chapterNumberValue(match[1]);
    if (value) return value;
  }
  return null;
}

function inferSeriesUnit(text, fallback = '') {
  const match = String(text).match(new RegExp(`第\\s*[${NUMBER_CHARS}]{1,4}\\s*(卷|章)`, 'i'));
  return match?.[1] || fallback;
}

function simpleDaodejingChapter(text) {
  const title = text.split('\n').find((line) => line.trim()) || '';
  const normalizedTitle = normalizeSeriesText(title);
  if (!normalizedTitle.includes('道德經')) return null;
  const excluded = ['黃元吉', '互證', '清靜經', '佛教', '佛經', '道書', '圓安講道', '圓安論道'];
  if (excluded.some((keyword) => normalizedTitle.includes(normalizeSeriesText(keyword)))) return null;
  const match = title.match(/《?道德經》?\s*第([一二三四五六七八九十百零〇○\d]+)章/);
  if (!match) return null;
  return chapterNumberValue(match[1]);
}

function extractBody(item) {
  const parts = [];
  walk(item, (key, value, path) => {
    if (typeof value !== 'string') return;
    const normalizedKey = String(key || '').toLowerCase();
    const allowed = ['post', 'text', 'description', 'comment', 'note', 'message', 'name'];
    if (!allowed.includes(normalizedKey)) return;
    const text = cleanText(value);
    if (text.length >= 2 && !looksLikeFilePath(text)) parts.push(text);
  });

  return unique(parts)
    .filter((part) => !/^https?:\/\//.test(part))
    .join('\n\n')
    .trim();
}

function cleanText(value) {
  return maybeDecode(value)
    .replace(/\r\n/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function maybeDecode(value) {
  const decoded = Buffer.from(value, 'latin1').toString('utf8');
  const cjkBefore = countMatches(value, /[\u3400-\u9fff]/g);
  const cjkAfter = countMatches(decoded, /[\u3400-\u9fff]/g);
  const latinNoise = countMatches(value, /[\u00c0-\u00ff]/g);
  return cjkAfter > cjkBefore + 2 && latinNoise > 2 ? decoded : value;
}

function collectMedia(item) {
  const uris = [];
  walk(item, (key, value, path) => {
    if (typeof value !== 'string') return;
    if (path.includes('place')) return;
    const normalizedKey = String(key || '').toLowerCase();
    if (!['uri', 'url', 'href'].includes(normalizedKey)) return;
    if (isMediaUri(value) || /^https?:\/\//i.test(value)) {
      uris.push(maybeDecode(value));
    }
  });
  return unique(uris);
}

function isMediaUri(value = '') {
  return /\.(avif|gif|jpe?g|m4v|mov|mp4|png|webp)(\?|$)/i.test(value);
}

function normalizeMediaUri(uri, sourceRoot, sourceFile) {
  if (/^https?:\/\//.test(uri)) return uri;
  const candidates = [
    path.resolve(path.dirname(sourceFile), uri),
    path.resolve(sourceRoot, uri),
    path.resolve(path.dirname(sourceRoot), uri),
    path.resolve(ROOT, 'outputs', 'facebook_posts', '_extracted', uri)
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return path.relative(ROOT, candidate);
  }
  return uri;
}

function categorize(text, config, seriesInfo = null) {
  if (seriesInfo?.name) {
    const seriesCategory = (config.categories || [])
      .find((category) => (category.series || []).includes(seriesInfo.name));
    if (seriesCategory) return normalizeCategoryName(seriesCategory.name);
  }

  let best = { name: config.fallback || '未分類', score: 0 };
  for (const category of config.categories || []) {
    const score = (category.keywords || []).reduce((sum, keyword) => {
      const matches = text.match(new RegExp(escapeRegExp(keyword), 'gi'));
      return sum + (matches ? matches.length : 0);
    }, 0);
    if (score > best.score) best = { name: category.name, score };
  }
  return normalizeCategoryName(best.name);
}

function normalizeCategoryName(name = '') {
  return name === '影音圖片' || name === 'Reels封面圖' ? 'Reels' : name;
}

function refineLifestyleCategory({ title = '', body = '', text = '', date = '' }) {
  for (const refinement of LIFESTYLE_REFINEMENTS) {
    if (refinement.patterns.some((pattern) => pattern.test(text))) return refinement.name;
  }

  const length = textLength(`${title}\n${body}`);
  const year = Number(date.slice(0, 4));
  if (year && year < 2019) return '早期短貼與生活記錄';
  if (length < 80) return '日常短句與心情';
  return LIFESTYLE_CATEGORY;
}

function textLength(value = '') {
  return [...String(value).trim()].length;
}

function inferTags(text, config) {
  const tags = [];
  for (const category of config.categories || []) {
    for (const keyword of category.keywords || []) {
      if (text.includes(keyword)) tags.push(keyword);
      if (tags.length >= 6) return unique(tags);
    }
  }
  return unique(tags);
}

function makeTitle(body, timestamp) {
  const firstLine = body.split('\n').map((line) => line.trim()).find((line) => line && !isLocationOnlyLine(line));
  if (!firstLine) return `${taipeiDate(timestamp)} 貼文`;
  const compact = firstLine.replace(/\s+/g, ' ');
  return compact.length > 34 ? `${compact.slice(0, 34)}...` : compact;
}

function cleanLeadingLocationLines(body = '') {
  const lines = String(body).split('\n');
  let index = 0;
  while (index < lines.length && !lines[index].trim()) index += 1;
  while (index < lines.length && isLocationOnlyLine(lines[index])) index += 1;
  while (index < lines.length && !lines[index].trim()) index += 1;
  return lines.slice(index).join('\n').trim();
}

function isLocationOnlyLine(value = '') {
  const normalized = normalizeSeriesText(value);
  return LOCATION_ONLY_LINES.has(normalized);
}

async function writeOutputs(posts, outDir, siteDataDir, duplicateReport) {
  const markdownDir = path.join(outDir, 'markdown');
  await fs.rm(markdownDir, { recursive: true, force: true });
  await fs.mkdir(markdownDir, { recursive: true });

  for (const post of posts) {
    const filename = `${post.date}-${safeFilename(post.title)}-${post.id}.md`;
    await fs.writeFile(path.join(markdownDir, filename), toMarkdown(post), 'utf8');
  }

  await fs.writeFile(path.join(outDir, 'posts.json'), `${JSON.stringify(posts, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(outDir, 'duplicate-report.json'), `${JSON.stringify(duplicateReport, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(outDir, 'duplicate-report.md'), duplicateReportMarkdown(duplicateReport), 'utf8');
  await fs.writeFile(
    path.join(siteDataDir, 'posts.js'),
    `window.FACEBOOK_POSTS = ${JSON.stringify(posts, null, 2)};\n`,
    'utf8'
  );
}

function toMarkdown(post) {
  const mediaBlock = post.media.length
    ? `\n\n## 媒體\n\n${post.media.map((uri) => `- ${uri}`).join('\n')}`
    : '';
  return `---\ntitle: ${JSON.stringify(post.title)}\ndate: ${JSON.stringify(post.date)}\ncategory: ${JSON.stringify(post.category)}\nseries: ${JSON.stringify(post.series || null)}\nseries_index: ${JSON.stringify(post.seriesIndex || null)}\nseries_total: ${JSON.stringify(post.seriesTotal || null)}\ntags: ${JSON.stringify(post.tags)}\nsource_file: ${JSON.stringify(post.sourceFile)}\nsource_files: ${JSON.stringify(post.sourceFiles || [post.sourceFile])}\nduplicate_count: ${JSON.stringify(post.duplicateCount || 1)}\n---\n\n${post.body || '_無文字內容_'}${mediaBlock}\n`;
}

function duplicateReportMarkdown(report) {
  const lines = [
    '# 重複文章整理報告',
    '',
    `產生時間：${report.generatedAt}`,
    '',
    '## 摘要',
    '',
    `- 原始整理篇數：${report.summary.inputPosts}`,
    `- 合併後顯示篇數：${report.summary.outputPosts}`,
    `- 精確重複合併：${report.summary.exactMergedGroups} 組，少顯示 ${report.summary.exactMergedPosts} 篇`,
    `- 修改版本合併：${report.summary.modifiedMergedGroups || 0} 組，少顯示 ${report.summary.modifiedMergedPosts || 0} 篇，保留最後一版`,
    `- 純圖片同日合併：${report.summary.mediaOnlyMergedGroups || 0} 組，少顯示 ${report.summary.mediaOnlyMergedPosts || 0} 篇`,
    `- 純圖片重複隱藏：${report.summary.hiddenMediaOnlyPosts} 篇`,
    `- 亂碼中文刪除：${report.summary.mojibakeRemovedPosts || 0} 篇`,
    `- 疑似重複待人工確認：${report.summary.suspectedDuplicateGroups} 組`,
    '',
    '## 亂碼中文刪除',
    ''
  ];

  const mojibakeRemoved = report.mojibakeRemoved || [];
  if (!mojibakeRemoved.length) {
    lines.push('- 無');
  } else {
    for (const item of mojibakeRemoved.slice(0, 120)) {
      lines.push(`- ${item.date}｜${item.id}｜${item.title}｜${item.excerpt}`);
    }
    if (mojibakeRemoved.length > 120) lines.push(`- 另有 ${mojibakeRemoved.length - 120} 篇，詳見 duplicate-report.json`);
  }

  lines.push(
    '',
    '## 精確重複合併',
    ''
  );

  if (!report.exactMerged.length) {
    lines.push('- 無');
  } else {
    for (const item of report.exactMerged.slice(0, 120)) {
      lines.push(`- ${item.date}｜${item.title}｜${item.mergedPosts} 篇合併，圖片 ${item.mediaAfter} 個`);
    }
    if (report.exactMerged.length > 120) lines.push(`- 另有 ${report.exactMerged.length - 120} 組，詳見 duplicate-report.json`);
  }

  const modifiedMerged = report.modifiedMerged || [];
  lines.push('', '## 修改版本合併', '');
  if (!modifiedMerged.length) {
    lines.push('- 無');
  } else {
    for (const item of modifiedMerged.slice(0, 120)) {
      lines.push(`- ${item.date}｜${item.title}｜${item.mergedPosts} 篇合併，保留 ${item.keptDatetime}`);
    }
    if (modifiedMerged.length > 120) lines.push(`- 另有 ${modifiedMerged.length - 120} 組，詳見 duplicate-report.json`);
  }

  const mediaOnlyMerged = report.mediaOnlyMerged || [];
  lines.push('', '## 純圖片同日合併', '');
  if (!mediaOnlyMerged.length) {
    lines.push('- 無');
  } else {
    for (const item of mediaOnlyMerged.slice(0, 120)) {
      lines.push(`- ${item.date}｜${item.title}｜${item.mergedPosts} 篇合併，附件 ${item.mediaAfter} 個`);
    }
    if (mediaOnlyMerged.length > 120) lines.push(`- 另有 ${mediaOnlyMerged.length - 120} 組，詳見 duplicate-report.json`);
  }

  lines.push('', '## 純圖片重複隱藏', '');
  if (!report.hiddenMediaOnly.length) {
    lines.push('- 無');
  } else {
    for (const item of report.hiddenMediaOnly.slice(0, 120)) {
      lines.push(`- ${item.date}｜${item.id}｜${item.title}｜圖片 ${item.media.length} 個`);
    }
    if (report.hiddenMediaOnly.length > 120) lines.push(`- 另有 ${report.hiddenMediaOnly.length - 120} 篇，詳見 duplicate-report.json`);
  }

  lines.push('', '## 疑似重複待確認', '');
  if (!report.suspectedDuplicates.length) {
    lines.push('- 無');
  } else {
    for (const group of report.suspectedDuplicates.slice(0, 80)) {
      lines.push(`- ${group.date}｜${group.title}`);
      for (const item of group.items) {
        lines.push(`  - ${item.id}｜文字 ${item.bodyLength} 字｜圖片 ${item.mediaCount} 個｜${item.excerpt}`);
      }
    }
    if (report.suspectedDuplicates.length > 80) lines.push(`- 另有 ${report.suspectedDuplicates.length - 80} 組，詳見 duplicate-report.json`);
  }

  return `${lines.join('\n')}\n`;
}

function taipeiDate(timestamp) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date(timestamp * 1000));
}

function safeFilename(value) {
  const safe = Array.from(String(value)
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, ''))
    .slice(0, 60)
    .join('')
    .replace(/-+$/g, '');
  return safe || 'post';
}

function walk(value, visitor, key = '', pathParts = []) {
  const path = key ? [...pathParts, key] : pathParts;
  visitor(key, value, path);
  if (Array.isArray(value)) {
    value.forEach((child) => walk(child, visitor, key, pathParts));
  } else if (value && typeof value === 'object') {
    for (const [childKey, child] of Object.entries(value)) walk(child, visitor, childKey, path);
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function looksLikeFilePath(value) {
  return /(^|\/)(photos|videos|posts|media)\//i.test(value) || /\.(json|jpg|jpeg|png|mp4)$/i.test(value);
}

function normalizeSeriesText(value = '') {
  return String(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '');
}

function duplicateBodyKey(value = '') {
  return String(value)
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function duplicateTitleKey(value = '') {
  return String(value)
    .replace(/\s+/g, '')
    .replace(/[：:。．.，,、！!？?「」『』《》〈〉（）()[\]【】]/g, '')
    .toLowerCase()
    .trim();
}

function excerptForReport(value = '') {
  return String(value)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function chineseNumber(value) {
  const digits = {
    零: 0,
    〇: 0,
    '○': 0,
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9
  };
  if (value === '十') return 10;
  const tenIndex = value.indexOf('十');
  if (tenIndex >= 0) {
    const before = value.slice(0, tenIndex);
    const after = value.slice(tenIndex + 1);
    const tens = before ? digits[before] : 1;
    const ones = after ? digits[after] : 0;
    return (tens || 0) * 10 + (ones || 0);
  }
  return [...value].reduce((sum, char) => sum * 10 + (digits[char] || 0), 0);
}

function chapterNumberValue(value = '') {
  if (/^\d+$/.test(value)) return Number(value);
  return chineseNumber(value);
}

function countMatches(value, pattern) {
  return (value.match(pattern) || []).length;
}

function hash(value) {
  return createHash('sha1').update(value).digest('hex');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
