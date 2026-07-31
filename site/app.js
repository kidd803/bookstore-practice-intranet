const posts = Array.isArray(window.FACEBOOK_POSTS) ? window.FACEBOOK_POSTS : [];
const videoLinks = normalizeVideoLinks(window.FACEBOOK_VIDEO_LINKS || {});
const PAGE_SIZE = 80;
const RECOMMENDATION_INTERVAL_MS = 60 * 60 * 1000;
const FEATURED_CAROUSEL_INTERVAL_MS = 8000;
const BOOK_VIDEO_CAROUSEL_LIMIT = 10;
const BOOK_VIDEO_SERIES = '書店翻書短影音';
const BOOKSTORE_COLLECTION_URL = 'https://www.2book.tw/collections/';
const NAVAL_SERIES = '納瓦爾寶典';
const NAVAL_PRODUCT_URL = 'https://2book.tw/products/-957m-全新書-納瓦爾寶典-從白手起家到財務自由-矽谷傳奇創投家的投資哲學與人生智慧-臻品齋書店-';
const PUBLIC_SITE_URL = 'https://2books.com.tw/';
const REMOTE_FACEBOOK_MEDIA_BASE_URL = 'https://storage.googleapis.com/2books-facebook-images/facebook_posts/_extracted/';
const POST_QUERY_PARAM = 'post';
const DEFAULT_DOCUMENT_TITLE = document.title;
const RECOMMENDATION_EXCLUDED_CATEGORIES = new Set([
  'Reels',
  '生活隨筆與其他',
  '早期短貼與生活記錄',
  '日常短句與心情',
  '高雄在地與旅行',
  '飲食餐桌與日常',
  '金錢理財與消費',
  '健康身體與作息',
  '社會時事與觀察',
  '家庭人情與日常',
  '影音音樂與娛樂',
  '書店營運與電商',
  '活動公告與直播'
]);
const ARCHIVE_CATEGORIES = new Set([
  'Reels',
  '生活隨筆與其他',
  '早期短貼與生活記錄',
  '日常短句與心情',
  '高雄在地與旅行',
  '飲食餐桌與日常',
  '金錢理財與消費',
  '健康身體與作息',
  '社會時事與觀察',
  '家庭人情與日常',
  '影音音樂與娛樂',
  '活動公告與直播'
]);
const RECOMMENDATION_BLOCKED_TEXT = [
  /LINE\s*POINTS/i,
  /蝦皮|取貨|免運|市集|花市|消費回饋|限量|折扣|促銷|滿額|出貨|運費/
];
const READING_LANES = [
  {
    key: 'featured',
    title: '先聽老闆說書',
    lead: '我先從文章裡挑出比較完整的一篇，像在店裡拿起一本書，先說給你聽。',
    chips: ['說書', '長文', '找書'],
    matcher: isFeaturedReadingPost
  },
  {
    key: 'classic',
    title: '經典怎麼讀',
    lead: '道德經、全真道、聖濟總錄與哲學宗教，我從書店老闆的角度說它們為什麼值得讀。',
    chips: ['道德經', '全真道', '哲學'],
    categories: ['道學全真與道德經', '宗教民俗與靈修', '中醫養生', '西方哲學與史哲'],
    series: ['道德經', '全真教法統', '龍門心法', '全真道歷史', '書店老闆讀聖濟總錄', '重陽立教十五論', '長春真人西遊記', '傅佩榮西方哲學史', '莊子', '蘇格拉底', '柏拉圖', '尼采', '叔本華']
  },
  {
    key: 'bookstore',
    title: '買書前先判斷',
    lead: '有些書值得慢慢找，有些書要先懂脈絡再買。這裡放我選書、理書與經營的判斷。',
    chips: ['選書', '判斷', '臻品齋'],
    categories: ['書籍選品與推薦', '書店營運與電商', '創業工作與經營筆記'],
    series: ['理書日記', '納瓦爾寶典', '道士在書中找到黃金屋', '書店老闆觀察ＡＩ']
  },
  {
    key: 'literature',
    title: '人物與時代故事',
    lead: '從諾貝爾文學、卡繆、李白到聖殿騎士團，我把書裡的人與時代說成容易進入的故事。',
    chips: ['文學', '歷史', '人物'],
    categories: ['文學與諾貝爾', '歷史文明與聖殿'],
    series: ['諾貝爾文學奬', '聖殿騎士團', '李白', '卡繆', '莎士比亞', '托爾斯泰', '海明威', '村上春樹', '文藝復興', '復旦大學歷史系', '八二三注', '鹿邑之旅']
  }
];
const BOOK_CATEGORY_RECOMMENDATIONS = new Map([
  ['道德經', '五術 宗教 易經'],
  ['道學全真與道德經', '五術 宗教 易經'],
  ['全真教法統', '五術 宗教 易經'],
  ['龍門心法', '五術 宗教 易經'],
  ['全真道歷史', '五術 宗教 易經'],
  ['書店老闆讀全真道', '五術 宗教 易經'],
  ['重陽立教十五論', '五術 宗教 易經'],
  ['長春真人西遊記', '五術 宗教 易經'],
  ['圓安易學', '圓安易學書店'],
  ['宗教民俗與靈修', '五術 宗教 易經'],
  ['書店老闆讀聖濟總錄', '醫療 健康'],
  ['中醫養生', '醫療 健康'],
  ['西方哲學與史哲', '文學 歷史 哲學'],
  ['傅佩榮西方哲學史', '文學 歷史 哲學'],
  ['尼采', '文學 歷史 哲學'],
  ['叔本華', '文學 歷史 哲學'],
  ['柏拉圖', '文學 歷史 哲學'],
  ['蘇格拉底', '文學 歷史 哲學'],
  ['莊子', '五術 宗教 易經'],
  ['文學與諾貝爾', '文學 歷史 哲學'],
  ['諾貝爾文學奬', '文學 歷史 哲學'],
  ['李白', '文學 歷史 哲學'],
  ['卡繆', '文學 歷史 哲學'],
  ['莎士比亞', '文學 歷史 哲學'],
  ['托爾斯泰', '文學 歷史 哲學'],
  ['海明威', '文學 歷史 哲學'],
  ['村上春樹', '文學 歷史 哲學'],
  ['歷史文明與聖殿', '文學 歷史 哲學'],
  ['聖殿騎士團', '文學 歷史 哲學'],
  ['文藝復興', '文學 歷史 哲學'],
  ['復旦大學歷史系', '文學 歷史 哲學'],
  ['八二三注', '軍事'],
  ['鹿邑之旅', '五術 宗教 易經'],
  ['納瓦爾寶典', '財經 理財 投資'],
  ['書籍選品與推薦', '文學 歷史 哲學'],
  ['書店營運與電商', '商業 創業 管理'],
  ['創業工作與經營筆記', '商業 創業 管理'],
  ['理書日記', '文學 歷史 哲學'],
  ['道士在書中找到黃金屋', '財經 理財 投資'],
  ['書店老闆觀察AI', '電腦 程式 系統 資料庫'],
  ['AI科技觀察', '電腦 程式 系統 資料庫'],
  ['心理溝通與人生', '心靈 勵志'],
  ['命理五術與紫微', '五術 宗教 易經'],
  ['明毅請益錄：紫微 400 問', '五術 宗教 易經'],
  ['金錢理財與消費', '財經 理財 投資'],
  ['社會時事與觀察', '政治 國際 時事'],
  ['高雄在地與旅行', '烹飪 美食 旅遊'],
  ['飲食餐桌與日常', '烹飪 美食 旅遊'],
  ['健康身體與作息', '醫療 健康'],
  ['家庭人情與日常', '親子教育'],
  ['影音音樂與娛樂', 'CD 唱片 錄音帶'],
  ['活動公告與直播', '臻品齋好物'],
  ['Reels', '臻品齋好物'],
  ['日常短句與心情', '心靈 勵志'],
  ['早期短貼與生活記錄', '所有商品'],
  ['生活隨筆與其他', '所有商品']
]);
const BOOKSTORE_COLLECTION_SLUGS = new Map([
  ['所有商品', 'all'],
  ['圓安易學書店', '老頑童書店']
]);
const BOOK_DIRECT_LINKS = new Map([
  [NAVAL_SERIES, {
    label: NAVAL_SERIES,
    url: NAVAL_PRODUCT_URL
  }]
]);
const CATEGORY_ORDER = [
  '書籍選品與推薦',
  '書店營運與電商',
  '創業工作與經營筆記',
  'AI科技觀察',
  '道學全真與道德經',
  '文學與諾貝爾',
  '歷史文明與聖殿',
  '西方哲學與史哲',
  '中醫養生',
  '命理五術與紫微',
  '宗教民俗與靈修',
  '心理溝通與人生',
  '金錢理財與消費',
  '社會時事與觀察',
  '高雄在地與旅行',
  '飲食餐桌與日常',
  '健康身體與作息',
  '家庭人情與日常',
  '影音音樂與娛樂',
  '活動公告與直播',
  'Reels',
  '日常短句與心情',
  '早期短貼與生活記錄',
  '生活隨筆與其他',
  '理書日記'
];
const TIKTOK_STORAGE_KEY = 'linyiyi.published.v1';
const ADMIN_STORAGE_KEY = 'linyiyi.admin.v1';
const PUBLISHED_API_URL = '/api/published';
const IMAGE_CAPTIONS_STORAGE_KEY = 'linyiyi.image.captions.v1';
const IMAGE_CAPTIONS_API_URL = '/api/image-captions';
const isAdminMode = loadAdminMode();
const countFormat = new Intl.NumberFormat('zh-Hant');
const postsById = new Map(posts.map((post) => [post.id, post]));
const state = {
  category: '全部',
  query: '',
  sort: 'newest',
  year: '全部年份',
  series: '全部系列',
  publishFilter: '全部狀態',
  visible: PAGE_SIZE,
  selectedId: initialPostId(),
  recommendationOpenId: null,
  featuredCarouselIndex: 0,
  bookVideoIndex: 0,
  lane: null
};
let featuredCarouselTimer = null;
const shouldScrollToInitialPost = Boolean(state.selectedId);

const summary = document.querySelector('#summary');
const categoryBar = document.querySelector('#categoryBar');
const recommendationBand = document.querySelector('#recommendationBand');
const readingGateway = document.querySelector('#readingGateway');
const postList = document.querySelector('#postList');
const reader = document.querySelector('#reader');
const layout = document.querySelector('.layout');
const stats = document.querySelector('.stats');
const searchInput = document.querySelector('#searchInput');
const sortSelect = document.querySelector('#sortSelect');
const yearSelect = document.querySelector('#yearSelect');
const seriesSelect = document.querySelector('#seriesSelect');
const publishSelect = document.querySelector('#publishSelect');
const template = document.querySelector('#postTemplate');
const resultTitle = document.querySelector('#resultTitle');
const resultMeta = document.querySelector('#resultMeta');
const loadMoreButton = document.querySelector('#loadMoreButton');
const topicPackLink = document.querySelector('#topicPackLink');
const mobileSearchButton = document.querySelector('#mobileSearchButton');
const topButton = document.querySelector('#topButton');
const categoryCounts = countByCategory(posts);
const seriesCounts = countBySeries(posts);
const years = [...new Set(posts.map((post) => post.date?.slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a));
const seriesNames = orderSeriesNames([...seriesCounts.keys()]);
const publishedIds = isAdminMode ? loadPublishedIds() : new Set();
const imageCaptions = isAdminMode ? loadImageCaptions() : new Map();
const earliestPost = posts.reduce((earliest, post) => !earliest || post.timestamp < earliest.timestamp ? post : earliest, null);
const latestPost = posts.reduce((latest, post) => !latest || post.timestamp > latest.timestamp ? post : latest, null);

document.documentElement.classList.toggle('admin-mode', isAdminMode);
document.documentElement.classList.toggle('public-mode', !isAdminMode);
clearUnknownPostUrl();

populateYears();
populateSeries();

searchInput.addEventListener('input', () => {
  state.query = searchInput.value.trim().toLowerCase();
  state.category = '全部';
  state.year = '全部年份';
  state.series = '全部系列';
  state.lane = null;
  state.publishFilter = '全部狀態';
  state.visible = PAGE_SIZE;
  state.selectedId = null;
  clearPostUrl();
  render();
});

sortSelect.addEventListener('change', () => {
  state.sort = sortSelect.value;
  state.visible = PAGE_SIZE;
  state.selectedId = null;
  clearPostUrl();
  render();
});

yearSelect.addEventListener('change', () => {
  state.year = yearSelect.value;
  state.query = '';
  state.category = '全部';
  state.series = '全部系列';
  state.lane = null;
  state.publishFilter = '全部狀態';
  searchInput.value = '';
  state.visible = PAGE_SIZE;
  state.selectedId = null;
  clearPostUrl();
  render();
});

seriesSelect.addEventListener('change', () => {
  state.series = seriesSelect.value;
  state.category = '全部';
  state.lane = null;
  state.visible = PAGE_SIZE;
  state.selectedId = null;
  clearPostUrl();
  render();
});

publishSelect.addEventListener('change', () => {
  if (!isAdminMode) return;
  state.publishFilter = publishSelect.value;
  state.visible = PAGE_SIZE;
  state.selectedId = null;
  clearPostUrl();
  render();
});

loadMoreButton.addEventListener('click', () => {
  state.visible += PAGE_SIZE;
  render();
});

mobileSearchButton.addEventListener('click', () => scrollToSearch());
topButton.addEventListener('click', () => scrollToTop());

if (isAdminMode) {
  loadSharedPublishedIds();
  loadSharedImageCaptions();
}
render();
startFeaturedCarousel();
if (shouldScrollToInitialPost) {
  requestAnimationFrame(() => scrollToSelectedPost());
}

window.addEventListener('popstate', () => {
  state.selectedId = initialPostId();
  state.recommendationOpenId = null;
  render({ preserveScroll: true });
});

function render(options = {}) {
  const scrollPosition = options.preserveScroll
    ? { x: window.scrollX, y: window.scrollY }
    : null;
  const matched = matchPosts();
  const filtered = matched;
  const selected = selectedPost(filtered);
  updateDocumentTitle(selected);
  renderSummary(filtered);
  renderReadingGateway();
  renderCategories();
  renderRecommendationBand(selected?.id || null);
  renderStats(filtered);
  renderPosts(filtered, selected);
  renderReader(selected);
  if (options.skipReaderAlign) {
    resetReaderAlignment();
  } else {
    alignReaderWithSelectedPost(selected);
  }
  renderTopicTools(matched);
  yearSelect.value = state.year;
  seriesSelect.value = state.series;
  publishSelect.value = state.publishFilter;
  mobileSearchButton.hidden = !(isMobileLayout() && state.selectedId);
  if (scrollPosition) {
    requestAnimationFrame(() => {
      window.scrollTo(scrollPosition.x, scrollPosition.y);
    });
  }
}

function matchPosts() {
  const tokens = searchTokens(state.query);
  return posts
    .filter((post) => !state.lane || postMatchesLane(post, activeLane()))
    .filter((post) => state.category === '全部' || post.category === state.category)
    .filter((post) => state.year === '全部年份' || post.date?.startsWith(state.year))
    .filter((post) => postMatchesSeries(post, state.series))
    .filter((post) => {
      if (!isAdminMode) return true;
      if (state.publishFilter === '全部狀態') return true;
      const published = isPublished(post);
      return state.publishFilter === '已發佈' ? published : !published;
    })
    .filter((post) => {
      if (!tokens.length) return true;
      const text = [
        displayTitle(post),
        displayBody(post),
        post.title,
        post.body,
        post.category,
        post.series,
        postHasBookVideo(post) ? BOOK_VIDEO_SERIES : '',
        seriesLabel(post),
        post.date,
        ...(post.tags || [])
      ].join('\n');
      const haystack = normalizeSearch(text);
      const chapters = chapterNumbers(text);
      if (post.seriesIndex) chapters.add(post.seriesIndex);
      return tokens.every((token) => tokenMatches(token, haystack, chapters));
    })
    .sort((a, b) => state.sort === 'oldest' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp);
}

function activeLane() {
  return READING_LANES.find((lane) => lane.key === state.lane) || null;
}

function postMatchesLane(post, lane) {
  if (!lane) return false;
  if (typeof lane.matcher === 'function') return lane.matcher(post);
  if (lane.categories?.includes(post.category)) return true;
  if (post.series && lane.series?.includes(post.series)) return true;
  return false;
}

function postMatchesSeries(post, series) {
  if (series === '全部系列') return true;
  if (series === BOOK_VIDEO_SERIES) return postHasBookVideo(post);
  return post.series === series;
}

function isFeaturedReadingPost(post) {
  const title = normalizeRecommendationText(displayTitle(post));
  const body = normalizeRecommendationText(displayBody(post));
  const text = `${title}\n${body}`;
  if (isImageOnlyPost(post)) return false;
  if (!post.series && ARCHIVE_CATEGORIES.has(post.category)) return false;
  if (body.length < 260) return false;
  if (isWeakRecommendationTitle(title)) return false;
  if (RECOMMENDATION_BLOCKED_TEXT.some((pattern) => pattern.test(text))) return false;
  return true;
}

function renderSummary(filtered) {
  const total = posts.length;
  if (!total) {
    summary.textContent = '把 Facebook 匯出的 ZIP 整理後，文章會出現在這裡';
    return;
  }
  if (state.lane) {
    const lane = activeLane();
    summary.textContent = lane
      ? `共 ${formatCount(total)} 篇，目前進入「${lane.title}」，符合 ${formatCount(filtered.length)} 篇`
      : `共 ${formatCount(total)} 篇，目前符合 ${formatCount(filtered.length)} 篇`;
    return;
  }
  summary.textContent = `共 ${formatCount(total)} 篇，目前符合 ${formatCount(filtered.length)} 篇`;
}

function renderReadingGateway() {
  if (!readingGateway) return;

  const heading = document.createElement('div');
  heading.className = 'reading-gateway-heading';
  const eyebrow = document.createElement('span');
  eyebrow.textContent = '說書入口';
  const title = document.createElement('strong');
  title.textContent = '先聽老闆說，再去找書';
  const note = document.createElement('p');
  note.textContent = '我把平常在臉書寫下的讀書、理書與選書判斷，整理成一條條讀書路線。讀懂了，再到臻品齋找適合自己的書。';
  heading.append(eyebrow, title, note);

  const grid = document.createElement('div');
  grid.className = 'reading-gateway-grid';
  grid.replaceChildren(...READING_LANES.map((lane) => {
    const count = posts.reduce((sum, post) => sum + (postMatchesLane(post, lane) ? 1 : 0), 0);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'reading-lane';
    button.setAttribute('aria-pressed', String(state.lane === lane.key));

    const top = document.createElement('span');
    top.className = 'reading-lane-top';
    const name = document.createElement('strong');
    name.textContent = lane.title;
    const badge = document.createElement('span');
    badge.textContent = `${formatCount(count)}篇`;
    top.append(name, badge);

    const lead = document.createElement('span');
    lead.className = 'reading-lane-lead';
    lead.textContent = lane.lead;

    const chips = document.createElement('span');
    chips.className = 'reading-lane-chips';
    chips.replaceChildren(...lane.chips.map((chip) => {
      const item = document.createElement('span');
      item.textContent = chip;
      return item;
    }));

    button.replaceChildren(top, lead, chips);
    button.addEventListener('click', () => {
      state.lane = state.lane === lane.key ? null : lane.key;
      state.category = '全部';
      state.series = '全部系列';
      state.query = '';
      state.visible = PAGE_SIZE;
      state.selectedId = null;
      searchInput.value = '';
      clearPostUrl();
      render();
      scrollToResults();
    });
    return button;
  }));

  readingGateway.replaceChildren(heading, grid);
}

function renderCategories() {
  const orderedCategories = CATEGORY_ORDER.filter((category) => categoryCounts.has(category));
  const remainingCategories = [...categoryCounts.keys()]
    .filter((category) => !CATEGORY_ORDER.includes(category))
    .sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  const categories = ['全部', ...orderedCategories, ...remainingCategories];
  const mainCategories = categories.filter((category) => category === '全部' || !ARCHIVE_CATEGORIES.has(category));
  const archiveCategories = categories.filter((category) => category !== '全部' && ARCHIVE_CATEGORIES.has(category));
  const heading = document.createElement('div');
  heading.className = 'categories-heading';
  const eyebrow = document.createElement('span');
  eyebrow.textContent = '分類瀏覽';
  const title = document.createElement('strong');
  title.textContent = '書店主題分類';
  heading.append(eyebrow, title);

  const grid = categoryGrid(mainCategories);
  const archiveHeading = document.createElement('div');
  archiveHeading.className = 'categories-subheading';
  const archiveTitle = document.createElement('strong');
  archiveTitle.textContent = '存檔分類';
  const archiveNote = document.createElement('span');
  archiveNote.textContent = '日常、短貼、Reels 與活動記錄先收在這裡，想翻舊文時再進去找。';
  archiveHeading.append(archiveTitle, archiveNote);
  const archiveGrid = categoryGrid(archiveCategories);
  archiveGrid.classList.add('category-grid-archive');

  categoryBar.replaceChildren(heading, grid, archiveHeading, archiveGrid);
}

function categoryGrid(categories) {
  const grid = document.createElement('div');
  grid.className = 'category-grid';
  grid.replaceChildren(...categories.map((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    const count = category === '全部' ? posts.length : categoryCounts.get(category);
    const label = document.createElement('span');
    label.className = 'category-name';
    label.textContent = category;
    const badge = document.createElement('span');
    badge.className = 'category-count';
    badge.textContent = `${formatCount(count)}篇`;
    button.replaceChildren(label, badge);
    button.setAttribute('aria-pressed', String(state.category === category));
    button.addEventListener('click', () => {
      state.category = category;
      state.series = '全部系列';
      state.lane = null;
      state.visible = PAGE_SIZE;
      state.selectedId = null;
      clearPostUrl();
      render();
      scrollToResults();
    });
    return button;
  }));
  return grid;
}

function renderStats(filtered) {
  const lines = [
    seriesNav(),
    statLine('全部文章', formatCount(posts.length)),
    statLine('符合條件', formatCount(filtered.length))
  ];
  if (isAdminMode) {
    const publishedCount = posts.reduce((count, post) => count + (isPublished(post) ? 1 : 0), 0);
    lines.push(
      statLine('已發佈', formatCount(publishedCount)),
      statLine('未發佈', formatCount(Math.max(posts.length - publishedCount, 0)))
    );
  }
  lines.push(
    statLine('分類數', formatCount(categoryCounts.size)),
    statLine('系列數', formatCount(seriesCounts.size)),
    statLine('最早日期', earliestPost?.date || '-'),
    statLine('最新日期', latestPost?.date || '-')
  );
  stats.replaceChildren(...lines);
}

function seriesNav() {
  const section = document.createElement('section');
  section.className = 'series-nav';
  section.setAttribute('aria-label', '系列');

  const title = document.createElement('h2');
  title.textContent = '系列';

  const buttons = document.createElement('div');
  buttons.className = 'series-nav-buttons';
  const names = ['全部系列', ...seriesNames];
  buttons.replaceChildren(...names.map((series) => {
    const button = document.createElement('button');
    button.type = 'button';
    const label = series === '全部系列' ? '全部文章' : series;
    const count = series === '全部系列' ? posts.length : seriesCounts.get(series);
    const labelNode = document.createElement('span');
    labelNode.className = 'series-nav-label';
    labelNode.textContent = label;
    const countNode = document.createElement('span');
    countNode.className = 'series-nav-count';
    countNode.textContent = `${formatCount(count)}篇`;
    button.replaceChildren(labelNode, countNode);
    button.setAttribute('aria-pressed', String(state.series === series));
    button.addEventListener('click', () => {
      state.series = series;
      state.category = '全部';
      state.visible = PAGE_SIZE;
      state.selectedId = null;
      clearPostUrl();
      render();
      scrollToResults();
    });
    return button;
  }));

  section.append(title, buttons);
  return section;
}

function renderPosts(filtered, selected) {
  const visiblePosts = filtered.slice(0, state.visible);
  if (selected && !visiblePosts.some((post) => post.id === selected.id)) {
    visiblePosts.push(selected);
  }
  const mobileLayout = isMobileLayout();
  resultTitle.textContent = state.series !== '全部系列'
    ? state.series
    : state.lane
      ? activeLane()?.title || '閱讀入口'
      : state.category === '全部'
        ? '全部文章'
        : state.category;
  resultMeta.textContent = filtered.length
    ? `顯示 ${formatCount(visiblePosts.length)} / ${formatCount(filtered.length)} 篇`
    : '0 篇';

  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = posts.length ? '沒有符合條件的文章' : '尚未匯入文章資料';
    postList.replaceChildren(empty);
    loadMoreButton.hidden = true;
    return;
  }

  const nodes = [];
  for (const post of visiblePosts) {
    const node = template.content.firstElementChild.cloneNode(true);
    const isSelected = selected?.id === post.id;
    node.dataset.postId = post.id;
    node.tabIndex = 0;
    node.setAttribute('role', 'button');
    node.setAttribute('aria-current', String(isSelected));
    node.setAttribute('aria-expanded', String(mobileLayout && isSelected));
    node.classList.toggle('is-published', isAdminMode && isPublished(post));
    node.querySelector('time').textContent = post.date;
    node.querySelector('.category').textContent = categoryLabel(post);
    if (post.series) node.querySelector('.post-meta').append(seriesBadge(post));
    if (postHasBookVideo(post)) node.querySelector('.post-meta').append(videoSeriesBadge());
    if (isAdminMode && isPublished(post)) {
      const status = document.createElement('span');
      status.className = 'status-badge';
      status.textContent = '已發佈';
      node.querySelector('.post-meta').append(status);
    }
    node.querySelector('h2').textContent = displayTitle(post);
    node.querySelector('.excerpt').textContent = excerpt(displayBody(post));
    const tags = node.querySelector('.tags');
    tags.replaceChildren(...(post.tags || []).map((tag) => {
      const item = document.createElement('li');
      item.textContent = tag;
      return item;
    }));
    node.addEventListener('click', () => selectPost(post.id));
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectPost(post.id);
      }
    });
    nodes.push(node);
    if (mobileLayout && isSelected) nodes.push(inlineReader(post));
  }

  postList.replaceChildren(...nodes);
  loadMoreButton.hidden = visiblePosts.length >= filtered.length;
}

function renderReader(post) {
  if (!post) {
    const empty = document.createElement('div');
    empty.className = 'empty reader-empty';
    empty.textContent = posts.length ? '沒有可閱讀的文章' : '尚未匯入文章資料';
    reader.replaceChildren(empty);
    return;
  }

  reader.replaceChildren(...readerSections(post));
}

function renderRecommendationBand(selectedId) {
  if (!recommendationBand) return;
  const fixedCarousel = renderFixedBookCarousel();
  const bookVideoCarousel = renderBookVideoCarousel();
  const hourlyRecommendation = renderHourlyRecommendation(selectedId, 'band');
  recommendationBand.replaceChildren(
    ...[fixedCarousel, bookVideoCarousel, hourlyRecommendation].filter((section) => section && !section.hidden)
  );
}

function updateFixedBookCarousel() {
  if (!recommendationBand) return;
  const nextCarousel = renderFixedBookCarousel();
  const currentCarousel = recommendationBand.querySelector('.fixed-book-carousel');
  if (!nextCarousel || nextCarousel.hidden) {
    currentCarousel?.remove();
    return;
  }
  if (currentCarousel) {
    currentCarousel.replaceWith(nextCarousel);
    return;
  }
  recommendationBand.prepend(nextCarousel);
}

function renderFixedBookCarousel() {
  const items = fixedBookCarouselPosts();
  const section = document.createElement('section');
  section.className = 'fixed-book-carousel';
  section.setAttribute('aria-label', '納瓦爾寶典固定輪播');
  if (!items.length) {
    section.hidden = true;
    return section;
  }

  const activeIndex = Math.min(state.featuredCarouselIndex, items.length - 1);
  state.featuredCarouselIndex = activeIndex;
  const post = items[activeIndex];

  const media = document.createElement('figure');
  media.className = 'fixed-book-carousel-media';
  const image = document.createElement('img');
  image.src = recommendationImageUrl(post);
  image.alt = `${displayTitle(post)} 推薦圖`;
  image.loading = 'lazy';
  image.addEventListener('error', () => {
    image.src = 'assets/bookstore-practice.jpg';
  }, { once: true });
  media.append(image);

  const content = document.createElement('div');
  content.className = 'fixed-book-carousel-content';

  const head = document.createElement('div');
  head.className = 'fixed-book-carousel-head';
  const label = document.createElement('span');
  label.textContent = '固定輪播';
  const count = document.createElement('span');
  count.textContent = `${formatCount(items.length)}篇說書`;
  head.append(label, count);

  const meta = document.createElement('div');
  meta.className = 'post-meta fixed-book-carousel-meta';
  const date = document.createElement('time');
  date.textContent = post.date;
  meta.append(date);
  if (post.series) {
    meta.append(seriesBadge(post));
  } else {
    const category = document.createElement('span');
    category.className = 'category';
    category.textContent = categoryLabel(post);
    meta.append(category);
  }

  const title = document.createElement('h2');
  title.textContent = displayTitle(post);

  const note = document.createElement('p');
  note.textContent = '從書店老闆的角度讀《納瓦爾寶典》：先看一篇文章，再決定這本書是不是值得帶回去。';

  const actions = document.createElement('div');
  actions.className = 'fixed-book-carousel-actions';
  const readButton = document.createElement('button');
  readButton.type = 'button';
  readButton.textContent = '讀這篇說書';
  readButton.addEventListener('click', () => openFixedBookPost(post));
  const productLink = document.createElement('a');
  productLink.href = NAVAL_PRODUCT_URL;
  productLink.target = '_blank';
  productLink.rel = 'noopener noreferrer';
  productLink.textContent = '看這本書';
  actions.append(readButton, productLink);

  const controls = document.createElement('div');
  controls.className = 'fixed-book-carousel-controls';
  const previousButton = carouselControlButton('上一篇', -1, items.length);
  const dots = document.createElement('div');
  dots.className = 'fixed-book-carousel-dots';
  dots.replaceChildren(...items.map((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `切換到第 ${index + 1} 篇：${displayTitle(item)}`);
    button.setAttribute('aria-current', String(index === activeIndex));
    button.addEventListener('click', () => {
      state.featuredCarouselIndex = index;
      updateFixedBookCarousel();
    });
    return button;
  }));
  const nextButton = carouselControlButton('下一篇', 1, items.length);
  controls.append(previousButton, dots, nextButton);

  content.append(head, meta, title, note, actions, controls);
  section.append(media, content);
  return section;
}

function fixedBookCarouselPosts() {
  const directSeriesPosts = posts.filter((post) => post.series === NAVAL_SERIES);
  const fallbackPosts = directSeriesPosts.length
    ? directSeriesPosts
    : posts.filter((post) => /納瓦爾寶典|Naval Ravikant/i.test(`${displayTitle(post)}\n${displayBody(post)}`));
  return fallbackPosts
    .filter((post) => !isImageOnlyPost(post))
    .filter((post) => displayBody(post).length >= 180)
    .filter((post) => !/蝦皮|Shopee|Yahoo|購買網址|下單|含運費|取貨|售價/i.test(`${displayTitle(post)}\n${displayBody(post)}`))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8);
}

function carouselControlButton(label, direction, count) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'fixed-book-carousel-arrow';
  button.textContent = direction < 0 ? '‹' : '›';
  button.setAttribute('aria-label', label);
  button.disabled = count < 2;
  button.addEventListener('click', () => {
    state.featuredCarouselIndex = (state.featuredCarouselIndex + direction + count) % count;
    updateFixedBookCarousel();
  });
  return button;
}

function openFixedBookPost(post) {
  state.series = NAVAL_SERIES;
  state.category = '全部';
  state.lane = null;
  state.query = '';
  state.visible = PAGE_SIZE;
  state.selectedId = post.id;
  searchInput.value = '';
  setPostUrl(post.id);
  render();
  scrollToResults();
}

function renderBookVideoCarousel() {
  const items = bookVideoCarouselItems();
  const section = document.createElement('section');
  section.className = 'book-video-carousel';
  section.setAttribute('aria-label', BOOK_VIDEO_SERIES);
  if (!items.length) {
    section.hidden = true;
    return section;
  }

  const activeIndex = Math.min(state.bookVideoIndex, items.length - 1);
  state.bookVideoIndex = activeIndex;
  const item = items[activeIndex];
  const { post, video } = item;

  const player = document.createElement('figure');
  player.className = 'book-video-carousel-player';
  const frame = document.createElement('iframe');
  frame.src = youtubeEmbedUrl(video);
  frame.title = `${bookVideoTitle(item)} 短影音`;
  frame.loading = 'lazy';
  frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  frame.allowFullscreen = true;
  player.append(frame);

  const content = document.createElement('div');
  content.className = 'book-video-carousel-content';

  const head = document.createElement('div');
  head.className = 'book-video-carousel-head';
  const label = document.createElement('span');
  label.textContent = BOOK_VIDEO_SERIES;
  const count = document.createElement('span');
  count.textContent = `${formatCount(items.length)}支`;
  head.append(label, count);

  const meta = document.createElement('div');
  meta.className = 'post-meta book-video-carousel-meta';
  const date = document.createElement('time');
  date.textContent = post.date;
  const category = document.createElement('span');
  category.className = 'category';
  category.textContent = categoryLabel(post);
  meta.append(date, category);
  if (post.series) meta.append(seriesBadge(post));
  meta.append(videoSeriesBadge());

  const title = document.createElement('h2');
  title.textContent = bookVideoTitle(item);

  const note = document.createElement('p');
  note.textContent = '先用一支短影音翻進這本書，再回到文章慢慢看脈絡。喜歡這一路，再到書店找相關書。';

  const actions = document.createElement('div');
  actions.className = 'book-video-carousel-actions';
  const readButton = document.createElement('button');
  readButton.type = 'button';
  readButton.textContent = '看完整文章';
  readButton.addEventListener('click', () => openBookVideoPost(post));
  const youtubeLink = document.createElement('a');
  youtubeLink.href = youtubeWatchUrl(video);
  youtubeLink.target = '_blank';
  youtubeLink.rel = 'noopener noreferrer';
  youtubeLink.textContent = '開啟Shorts';
  actions.append(readButton, bookstoreCategoryLink(post, '找相關書'), youtubeLink);

  const controls = document.createElement('div');
  controls.className = 'book-video-carousel-controls';
  const previousButton = bookVideoCarouselControlButton('上一支短影音', -1, items.length);
  const thumbs = document.createElement('div');
  thumbs.className = 'book-video-carousel-thumbs';
  thumbs.replaceChildren(...items.map((candidate, index) => bookVideoThumbButton(candidate, index, activeIndex)));
  const nextButton = bookVideoCarouselControlButton('下一支短影音', 1, items.length);
  controls.append(previousButton, thumbs, nextButton);

  content.append(head, meta, title, note, actions, controls);
  section.append(player, content);
  return section;
}

function bookVideoCarouselItems() {
  return posts
    .flatMap((post) => youtubeVideos(post).map((video) => ({ post, video })))
    .filter(({ post, video }) => video.youtubeId && displayTitle(post))
    .sort((a, b) => b.post.timestamp - a.post.timestamp)
    .slice(0, BOOK_VIDEO_CAROUSEL_LIMIT);
}

function bookVideoThumbButton(item, index, activeIndex) {
  const { post, video } = item;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'book-video-thumb';
  button.setAttribute('aria-current', String(index === activeIndex));
  button.setAttribute('aria-label', `切換到短影音：${bookVideoTitle(item)}`);
  button.addEventListener('click', () => {
    state.bookVideoIndex = index;
    renderRecommendationBand(state.selectedId);
  });

  const image = document.createElement('img');
  image.src = youtubeThumbnailUrl(video);
  image.alt = '';
  image.loading = 'lazy';

  const label = document.createElement('span');
  label.textContent = bookVideoTitle(item);
  button.append(image, label);
  return button;
}

function bookVideoTitle({ post, video }) {
  const label = (video.label || '').replace(/\s*(?:短影音|影片)\s*$/u, '').trim();
  const source = label || displayTitle(post);
  const bookTitle = source.match(/《[^》]{2,40}》/u)?.[0];
  if (bookTitle) return bookTitle;
  return source.length > 24 ? `${source.slice(0, 24)}...` : source;
}

function bookVideoCarouselControlButton(label, direction, count) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'book-video-carousel-arrow';
  button.textContent = direction < 0 ? '‹' : '›';
  button.setAttribute('aria-label', label);
  button.disabled = count < 2;
  button.addEventListener('click', () => {
    state.bookVideoIndex = (state.bookVideoIndex + direction + count) % count;
    renderRecommendationBand(state.selectedId);
  });
  return button;
}

function openBookVideoPost(post) {
  state.category = '全部';
  state.series = BOOK_VIDEO_SERIES;
  state.lane = null;
  state.query = '';
  state.visible = PAGE_SIZE;
  state.selectedId = post.id;
  state.recommendationOpenId = null;
  searchInput.value = '';
  setPostUrl(post.id);
  render({ preserveScroll: true });
  requestAnimationFrame(() => scrollToSelectedPost());
}

function startFeaturedCarousel() {
  if (featuredCarouselTimer) return;
  featuredCarouselTimer = setInterval(() => {
    const count = fixedBookCarouselPosts().length;
    if (count < 2) return;
    state.featuredCarouselIndex = (state.featuredCarouselIndex + 1) % count;
    updateFixedBookCarousel();
  }, FEATURED_CAROUSEL_INTERVAL_MS);
}

function renderHourlyRecommendation(selectedId, placement = 'before') {
  const post = hourlyRecommendedPost(selectedId);
  const section = document.createElement('section');
  section.className = 'hourly-recommendation';
  section.classList.add(`hourly-recommendation-${placement}`);
  section.classList.toggle('is-open', state.recommendationOpenId === post?.id);
  section.setAttribute('aria-label', '今日說書');
  if (!post) {
    section.hidden = true;
    return section;
  }
  section.addEventListener('click', (event) => {
    if (event.target.closest('button, a, input, textarea, select, .recommendation-reader')) return;
    openRecommendedPost(post);
  });

  const media = document.createElement('figure');
  media.className = 'hourly-recommendation-media';
  const image = document.createElement('img');
  image.src = recommendationImageUrl(post);
  image.alt = `${displayTitle(post)} 推薦圖`;
  image.loading = 'lazy';
  image.addEventListener('error', () => {
    image.src = 'assets/bookstore-practice.jpg';
  }, { once: true });
  media.append(image);

  const content = document.createElement('div');
  content.className = 'hourly-recommendation-content';

  const head = document.createElement('div');
  head.className = 'hourly-recommendation-head';
  const label = document.createElement('span');
  label.className = 'hourly-recommendation-label';
  label.textContent = '今日說書';
  const stamp = document.createElement('time');
  stamp.dateTime = hourlyRecommendationDateTime();
  stamp.textContent = hourlyRecommendationLabel();
  head.append(label, stamp);

  const meta = document.createElement('div');
  meta.className = 'post-meta hourly-recommendation-meta';
  const date = document.createElement('time');
  date.textContent = post.date;
  const category = document.createElement('span');
  category.className = 'category';
  category.textContent = categoryLabel(post);
  meta.append(date, category);
  if (post.series) meta.append(seriesBadge(post));
  if (postHasBookVideo(post)) meta.append(videoSeriesBadge());

  const title = document.createElement('h3');
  title.textContent = displayTitle(post);

  const body = document.createElement('p');
  body.className = 'hourly-recommendation-note';
  body.textContent = recommendationNote(post);

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '聽老闆說這篇';
  button.setAttribute('aria-label', `打開推薦文章：${displayTitle(post)}`);
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    openRecommendedPost(post);
  });

  const actions = document.createElement('div');
  actions.className = 'hourly-recommendation-actions';
  actions.append(button, bookstoreCategoryLink(post, '找相關書'));

  content.append(head, meta, title, body, actions);
  section.append(media, content);
  if (state.recommendationOpenId === post.id) {
    section.append(recommendationReader(post));
  }
  return section;
}

function hourlyRecommendedPost(selectedId) {
  const candidates = posts.filter(isRecommendablePost);
  if (!candidates.length) return null;
  const imageCandidates = candidates.filter(recommendationImageSource);
  const pool = imageCandidates.length ? imageCandidates : candidates;
  const hourKey = Math.floor(Date.now() / RECOMMENDATION_INTERVAL_MS);
  let index = hourKey % pool.length;
  if (pool.length > 1 && pool[index].id === selectedId) {
    index = (index + 1) % pool.length;
  }
  return pool[index];
}

function isRecommendablePost(post) {
  const title = normalizeRecommendationText(displayTitle(post));
  const body = normalizeRecommendationText(displayBody(post));
  const latestYear = Number(latestPost?.date?.slice(0, 4)) || new Date().getFullYear();
  const postYear = Number(post.date?.slice(0, 4)) || 0;
  const text = `${title}\n${body}`;

  if (isImageOnlyPost(post)) return false;
  if (RECOMMENDATION_EXCLUDED_CATEGORIES.has(post.category)) return false;
  if (postYear && latestYear && postYear < latestYear - 1) return false;
  if (body.length < 220) return false;
  if (isWeakRecommendationTitle(title)) return false;
  if (RECOMMENDATION_BLOCKED_TEXT.some((pattern) => pattern.test(text))) return false;
  if (RECOMMENDATION_BLOCKED_TEXT.some((pattern) => pattern.test(title))) return false;
  return true;
}

function recommendationNote(post) {
  const label = seriesLabel(post) || post.category || '書店文章';
  return `我從「${label}」先挑出這篇，先說書，再帶你往相關書架走。`;
}

function renderBookstoreCta(post) {
  const section = document.createElement('section');
  section.className = 'bookstore-cta';
  const recommendation = bookstoreCategoryRecommendation(post);
  const title = document.createElement('h3');
  title.textContent = '讀完想找書';
  const note = document.createElement('p');
  note.textContent = recommendation.type === 'product'
    ? `這篇文章可以先當作買書前的判斷。想接著看書，我替你接到臻品齋書店「${recommendation.label}」商品頁。`
    : `這篇文章可以先當作買書前的判斷。想接著找書，我替你接到臻品齋書店「${recommendation.label}」分類。`;
  section.append(title, note, bookstoreCategoryLink(post, recommendation.type === 'product'
    ? `看${recommendation.label}`
    : `看${recommendation.label}書架`));
  return section;
}

function bookstoreCategoryLink(post, text) {
  const recommendation = bookstoreCategoryRecommendation(post);
  const link = document.createElement('a');
  link.className = 'bookstore-search-link';
  link.href = recommendation.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = text;
  return link;
}

function bookstoreCategoryRecommendation(post) {
  const direct = bookstoreDirectLink(post);
  if (direct) return { ...direct, type: 'product' };
  const label = bookstoreCategoryLabel(post);
  return {
    label,
    url: bookstoreCategoryUrl(label),
    type: 'category'
  };
}

function bookstoreDirectLink(post) {
  const candidates = [
    post.series,
    displayTitle(post),
    ...(post.tags || [])
  ];

  for (const candidate of candidates) {
    const direct = BOOK_DIRECT_LINKS.get(searchKeywordKey(candidate));
    if (direct) return direct;
  }

  return null;
}

function bookstoreCategoryUrl(label = '') {
  const slug = BOOKSTORE_COLLECTION_SLUGS.get(label) || label.replace(/\s+/g, '-');
  return `${BOOKSTORE_COLLECTION_URL}${encodeURIComponent(slug)}`;
}

function bookstoreCategoryLabel(post) {
  const candidates = [
    post.series,
    post.category,
    ...(post.tags || []),
    displayTitle(post)
  ];

  for (const candidate of candidates) {
    const category = BOOK_CATEGORY_RECOMMENDATIONS.get(searchKeywordKey(candidate));
    if (category) return category;
  }

  return '所有商品';
}

function searchKeywordKey(value = '') {
  return String(value)
    .replace(/[Ａａ]/g, 'A')
    .replace(/[Ｉｉ]/g, 'I')
    .replace(/\s+/g, '')
    .trim();
}

function isWeakRecommendationTitle(title) {
  if (textLength(title) < 4) return true;
  if (/^[.…⋯]{2,}/.test(title)) return true;
  if (/^\d{4}[./-]\d{1,2}[./-]\d{1,2}$/.test(title)) return true;
  if (/^\d{1,2}[./-]\d{1,2}/.test(title)) return true;
  if (/^\d+(?:萬|元|折|%|％)/.test(title)) return true;
  if (/^(高雄市|臺北市|台北市|新北市|桃園市|臺中市|台中市|臺南市|台南市)$/.test(title)) return true;
  return false;
}

function normalizeRecommendationText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

function recommendationImageSource(post) {
  return (post.media || []).find(isImage) || '';
}

function recommendationImageUrl(post) {
  const source = recommendationImageSource(post);
  return source ? assetUrl(source) : 'assets/bookstore-practice.jpg';
}

function hourlyRecommendationDateTime() {
  const date = new Date(Math.floor(Date.now() / RECOMMENDATION_INTERVAL_MS) * RECOMMENDATION_INTERVAL_MS);
  return date.toISOString();
}

function hourlyRecommendationLabel() {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, '0')}:00`;
}

function openRecommendedPost(post) {
  state.selectedId = post.id;
  state.recommendationOpenId = post.id;
  setPostUrl(post.id);
  render({ preserveScroll: true, skipReaderAlign: true });
  requestAnimationFrame(() => {
    document.querySelector('.recommendation-reader')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  });
}

function alignReaderWithSelectedPost(post) {
  reader.style.marginTop = '';
  if (!post || isMobileLayout()) return;

  requestAnimationFrame(() => {
    const selectedCard = [...postList.querySelectorAll('.post-card')]
      .find((node) => node.dataset.postId === post.id);
    if (!selectedCard) return;

    const cardTop = selectedCard.getBoundingClientRect().top + window.scrollY;
    const layoutTop = layout.getBoundingClientRect().top + window.scrollY;
    const offset = Math.max(0, Math.round(cardTop - layoutTop));
    reader.style.marginTop = `${offset}px`;
  });
}

function inlineReader(post) {
  const article = document.createElement('article');
  article.className = 'inline-reader';
  article.setAttribute('aria-label', '展開文章內容');
  article.replaceChildren(...readerSections(post));
  return article;
}

function recommendationReader(post) {
  const article = document.createElement('article');
  article.className = 'recommendation-reader';
  article.setAttribute('aria-label', '今日說書文章內容');
  article.replaceChildren(...readerSections(post));
  return article;
}

function readerSections(post) {
  const header = document.createElement('header');
  header.className = 'reader-head';

  const meta = document.createElement('div');
  meta.className = 'post-meta reader-meta';
  const time = document.createElement('time');
  time.textContent = post.date;
  const category = document.createElement('span');
  category.className = 'category';
  category.textContent = categoryLabel(post);
  meta.append(time, category);
  if (post.series) meta.append(seriesBadge(post));
  if (postHasBookVideo(post)) meta.append(videoSeriesBadge());
  if (isAdminMode && isPublished(post)) {
    const status = document.createElement('span');
    status.className = 'status-badge';
    status.textContent = '已發佈';
    meta.append(status);
  }

  const title = document.createElement('h2');
  title.textContent = displayTitle(post);
  header.append(meta, title, readerActions(post));

  const body = document.createElement('div');
  body.className = 'reader-body';
  if (isImageOnlyPost(post)) body.classList.add('is-image-story');
  const blocks = paragraphBlocks(displayBody(post));
  const bodyNodes = blocks.map((block) => {
    const paragraph = document.createElement('p');
    paragraph.textContent = block;
    return paragraph;
  });
  if (isImageOnlyPost(post)) {
    const label = document.createElement('p');
    label.className = 'image-story-label';
    label.textContent = 'Reels文案草稿';
    bodyNodes.unshift(label);
  }
  body.replaceChildren(...bodyNodes);

  const tags = document.createElement('ul');
  tags.className = 'tags reader-tags';
  tags.replaceChildren(...(post.tags || []).map((tag) => {
    const item = document.createElement('li');
    item.textContent = tag;
    return item;
  }));

  const details = document.createElement('dl');
  details.className = 'reader-details';
  details.append(
    detailItem('文章 ID', post.id),
    detailItem('系列', seriesLabel(post) || '-'),
    detailItem('原始檔', post.sourceFile || '-')
  );

  const sections = [header];
  const media = renderMedia(post);
  if (media) sections.push(media);
  sections.push(body);
  sections.push(renderBookstoreCta(post));
  if (isAdminMode && isImageOnlyPost(post)) sections.push(renderImageCaptionEditor(post));
  if ((post.tags || []).length) sections.push(tags);
  if (isAdminMode) sections.push(details);
  return sections;
}

function readerActions(post) {
  const actions = document.createElement('div');
  actions.className = 'reader-actions';
  const needsCaption = isAdminMode && isImageOnlyPost(post) && !hasImageCaption(post);

  const homeButton = document.createElement('button');
  homeButton.type = 'button';
  homeButton.className = 'home-button';
  homeButton.textContent = '回首頁';
  homeButton.addEventListener('click', () => goHome());
  actions.append(homeButton);

  const searchButton = document.createElement('button');
  searchButton.type = 'button';
  searchButton.className = 'back-search-button';
  searchButton.textContent = '回到搜尋';
  searchButton.addEventListener('click', () => scrollToSearch());
  actions.append(searchButton);

  actions.append(bookstoreCategoryLink(post, '找相關書'));

  const copyLinkButton = document.createElement('button');
  copyLinkButton.type = 'button';
  copyLinkButton.className = 'copy-link-button';
  copyLinkButton.textContent = '複製網址';
  copyLinkButton.addEventListener('click', async () => {
    const copied = await copyText(postShareUrl(post));
    copyLinkButton.textContent = copied ? '已複製網址' : '複製失敗';
    setTimeout(() => {
      copyLinkButton.textContent = '複製網址';
    }, 1400);
  });
  actions.append(copyLinkButton);

  const copyShareButton = document.createElement('button');
  copyShareButton.type = 'button';
  copyShareButton.className = 'copy-share-button';
  copyShareButton.textContent = '複製分享文';
  copyShareButton.addEventListener('click', async () => {
    const copied = await copyText(shareTextForPost(post));
    copyShareButton.textContent = copied ? '已複製分享文' : '複製失敗';
    setTimeout(() => {
      copyShareButton.textContent = '複製分享文';
    }, 1400);
  });
  actions.append(copyShareButton);

  if (isAdminMode) {
    const publishButton = document.createElement('button');
    publishButton.type = 'button';
    publishButton.className = 'publish-button';
    publishButton.setAttribute('aria-pressed', String(isPublished(post)));
    publishButton.textContent = isPublished(post) ? '取消已發佈' : '標記已發佈';
    publishButton.addEventListener('click', () => {
      togglePublished(post);
      render();
    });
    actions.append(publishButton);
  }

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.textContent = needsCaption ? '先補Reels文案' : '複製文字';
  copyButton.disabled = needsCaption;
  copyButton.addEventListener('click', async () => {
    const copied = await copyText(copyTextForPost(post));
    copyButton.textContent = copied ? '已複製' : '複製失敗';
    setTimeout(() => {
      copyButton.textContent = '複製文字';
    }, 1400);
  });
  actions.append(copyButton);

  if ((post.media || []).filter(isImage).length) {
    const imageButton = document.createElement('button');
    imageButton.type = 'button';
    imageButton.textContent = `下載圖片 ${formatCount(post.media.filter(isImage).length)}`;
    imageButton.addEventListener('click', () => downloadPostImages(post));
    actions.append(imageButton);
  }

  if (isAdminMode && (post.media || []).filter(isVideo).length) {
    const videoButton = document.createElement('button');
    videoButton.type = 'button';
    videoButton.textContent = `下載影片 ${formatCount(post.media.filter(isVideo).length)}`;
    videoButton.addEventListener('click', () => downloadPostVideos(post));
    actions.append(videoButton);
  }

  return actions;
}

function renderImageCaptionEditor(post) {
  const caption = imageCaption(post);
  const section = document.createElement('section');
  section.className = 'image-caption-editor';

  const heading = document.createElement('h3');
  heading.textContent = '補Reels文案';

  const note = document.createElement('p');
  note.className = 'caption-note';
  note.textContent = '請先點封面圖看原圖，再依實際畫面填寫。沒有看清楚前先不要補，避免亂造內容。';

  const titleLabel = document.createElement('label');
  titleLabel.textContent = '標題 10-20字';
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.maxLength = 40;
  titleInput.value = caption?.title || '';
  titleInput.placeholder = '看圖後再填Reels標題';
  titleLabel.append(titleInput);

  const bodyLabel = document.createElement('label');
  bodyLabel.textContent = '介紹 約200字';
  const bodyInput = document.createElement('textarea');
  bodyInput.rows = 7;
  bodyInput.value = caption?.body || '';
  bodyInput.placeholder = '只寫封面圖中看得到、能合理確定的內容';
  bodyLabel.append(bodyInput);

  const counter = document.createElement('p');
  counter.className = 'caption-counter';
  const updateCounter = () => {
    counter.textContent = `標題 ${textLength(titleInput.value)} 字，介紹 ${textLength(bodyInput.value)} 字`;
  };
  titleInput.addEventListener('input', updateCounter);
  bodyInput.addEventListener('input', updateCounter);
  updateCounter();

  const actions = document.createElement('div');
  actions.className = 'caption-actions';

  const status = document.createElement('span');
  status.className = 'caption-status';

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.textContent = '儲存Reels文案';
  saveButton.addEventListener('click', () => {
    saveImageCaption(post, titleInput.value, bodyInput.value);
    status.textContent = '已儲存';
    render();
  });

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.textContent = '清除Reels文案';
  clearButton.addEventListener('click', () => {
    titleInput.value = '';
    bodyInput.value = '';
    saveImageCaption(post, '', '');
    status.textContent = '已清除';
    render();
  });

  actions.append(saveButton, clearButton, status);
  section.append(heading, note, titleLabel, bodyLabel, counter, actions);
  return section;
}

function statLine(label, value) {
  const row = document.createElement('div');
  row.className = 'stat';
  const labelNode = document.createElement('span');
  labelNode.textContent = label;
  const valueNode = document.createElement('strong');
  valueNode.textContent = value;
  row.append(labelNode, valueNode);
  return row;
}

function selectedPost(filtered) {
  if (!filtered.length) {
    state.selectedId = null;
    return null;
  }
  const current = filtered.find((post) => post.id === state.selectedId);
  if (current) return current;
  if (isMobileLayout()) return null;
  state.selectedId = filtered[0].id;
  return filtered[0];
}

function initialPostId() {
  const id = postIdFromLocation();
  return id && postsById.has(id) ? id : null;
}

function postIdFromLocation() {
  try {
    return new URLSearchParams(window.location.search).get(POST_QUERY_PARAM) || '';
  } catch {
    return '';
  }
}

function selectPost(id) {
  if (state.selectedId === id) {
    setPostUrl(id);
    updateDocumentTitle(postsById.get(id));
    return;
  }
  state.selectedId = id;
  state.recommendationOpenId = null;
  setPostUrl(id);
  render({ preserveScroll: true });
}

function setPostUrl(id) {
  if (!id) return;
  try {
    const nextUrl = new URL(window.location.href);
    if (nextUrl.searchParams.get(POST_QUERY_PARAM) === id) return;
    nextUrl.searchParams.set(POST_QUERY_PARAM, id);
    window.history.pushState({ postId: id }, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  } catch {
    // The article can still be read even when history updates are blocked.
  }
}

function clearPostUrl() {
  try {
    const nextUrl = new URL(window.location.href);
    if (!nextUrl.searchParams.has(POST_QUERY_PARAM)) return;
    nextUrl.searchParams.delete(POST_QUERY_PARAM);
    window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  } catch {
    // Leaving the old URL visible is harmless if history updates are blocked.
  }
}

function clearUnknownPostUrl() {
  const id = postIdFromLocation();
  if (!id || postsById.has(id)) return;
  clearPostUrl();
}

function postShareUrl(post) {
  const url = new URL(PUBLIC_SITE_URL);
  url.searchParams.set(POST_QUERY_PARAM, post.id);
  return url.toString();
}

function updateDocumentTitle(post) {
  document.title = post && postIdFromLocation()
    ? `${displayTitle(post)}｜書店的修行`
    : DEFAULT_DOCUMENT_TITLE;
}

function scrollToSelectedPost() {
  const selectedCard = [...postList.querySelectorAll('.post-card')]
    .find((node) => node.dataset.postId === state.selectedId);
  const target = isMobileLayout() ? selectedCard : reader;
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function scrollToSearch() {
  searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  try {
    searchInput.focus({ preventScroll: true });
  } catch {
    searchInput.focus();
  }
}

function goHome() {
  state.category = '全部';
  state.query = '';
  state.sort = 'newest';
  state.year = '全部年份';
  state.series = '全部系列';
  state.publishFilter = '全部狀態';
  state.visible = PAGE_SIZE;
  state.selectedId = null;
  state.recommendationOpenId = null;
  state.lane = null;
  searchInput.value = '';
  sortSelect.value = state.sort;
  clearPostUrl();
  resetReaderAlignment();
  render({ skipReaderAlign: true });
  requestAnimationFrame(() => scrollToTop('auto'));
}

function scrollToResults() {
  requestAnimationFrame(() => {
    const target = document.querySelector('.result-head') || resultTitle || postList;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function scrollToTop(behavior = 'smooth') {
  window.scrollTo({ top: 0, left: 0, behavior });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function isMobileLayout() {
  return window.matchMedia('(max-width: 820px)').matches;
}

function resetReaderAlignment() {
  reader.style.marginTop = '';
}

function countByCategory(values) {
  const counts = new Map();
  for (const post of values) {
    if (post.series) continue;
    const category = post.category;
    if (!category) continue;
    counts.set(category, (counts.get(category) || 0) + 1);
  }
  return counts;
}

function countBySeries(values) {
  const counts = new Map();
  for (const post of values) {
    if (!post.series) continue;
    counts.set(post.series, (counts.get(post.series) || 0) + 1);
  }
  const bookVideoCount = values.reduce((sum, post) => sum + (postHasBookVideo(post) ? 1 : 0), 0);
  if (bookVideoCount) counts.set(BOOK_VIDEO_SERIES, bookVideoCount);
  return counts;
}

function orderSeriesNames(names) {
  const priority = [BOOK_VIDEO_SERIES, NAVAL_SERIES];
  const rest = names
    .filter((name) => !priority.includes(name))
    .sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  return [...priority.filter((name) => names.includes(name)), ...rest];
}

function populateYears() {
  yearSelect.replaceChildren(
    optionNode('全部年份', '全部年份'),
    ...years.map((year) => optionNode(year, `${year} 年`))
  );
}

function populateSeries() {
  seriesSelect.replaceChildren(
    optionNode('全部系列', `全部文章 ${formatCount(posts.length)}`),
    ...seriesNames.map((series) => optionNode(series, `${series} ${formatCount(seriesCounts.get(series))}`))
  );
}

function optionNode(value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
}

function loadAdminMode() {
  let adminParam = null;
  let params = null;
  try {
    params = new URLSearchParams(window.location.search);
    adminParam = params.get('admin');
  } catch {
    params = null;
  }

  if (adminParam === '1') {
    try {
      localStorage.setItem(ADMIN_STORAGE_KEY, '1');
    } catch {
      // Private browsing may block storage; keep the page in admin mode for this load.
    }
    cleanAdminParam(params);
    return true;
  }

  if (adminParam === '0') {
    try {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
    } catch {
      // Ignore storage failures and fall back to public mode.
    }
    cleanAdminParam(params);
    return false;
  }

  try {
    return localStorage.getItem(ADMIN_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function cleanAdminParam(params) {
  if (!params) return;
  try {
    params.delete('admin');
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', nextUrl);
  } catch {
    // Keeping the admin parameter visible is harmless if the browser blocks history updates.
  }
}

function isPublished(post) {
  return publishedIds.has(post.id);
}

function togglePublished(post) {
  const published = !isPublished(post);
  if (!published) {
    publishedIds.delete(post.id);
  } else {
    publishedIds.add(post.id);
  }
  savePublishedIds();
  syncPublishedId(post.id, published);
}

function loadPublishedIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TIKTOK_STORAGE_KEY) || '[]');
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function savePublishedIds() {
  savePublishedIdsLocal();
}

function savePublishedIdsLocal() {
  try {
    localStorage.setItem(TIKTOK_STORAGE_KEY, JSON.stringify([...publishedIds]));
  } catch {
    // If storage is unavailable, keep the in-memory mark for this session.
  }
}

async function loadSharedPublishedIds() {
  const localIds = [...publishedIds];
  try {
    const response = await fetch(PUBLISHED_API_URL, { cache: 'no-store' });
    if (!response.ok) return;
    const payload = await response.json();
    const sharedIds = normalizePublishedIds(payload.publishedIds);
    const mergedIds = [...new Set([...sharedIds, ...localIds])];
    setPublishedIds(mergedIds);
    savePublishedIdsLocal();
    render();
    if (!sameIds(sharedIds, mergedIds)) {
      await syncPublishedIds(mergedIds);
    }
  } catch {
    // Static file servers do not provide the sync API; local browser storage still works.
  }
}

async function syncPublishedId(id, published) {
  try {
    const response = await fetch(`${PUBLISHED_API_URL}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, published })
    });
    if (!response.ok) return;
    const payload = await response.json();
    setPublishedIds(normalizePublishedIds(payload.publishedIds));
    savePublishedIdsLocal();
    render();
  } catch {
    // Keep the local mark; it will sync after the shared server is available.
  }
}

async function syncPublishedIds(ids) {
  try {
    const response = await fetch(PUBLISHED_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publishedIds: ids })
    });
    if (!response.ok) return;
    const payload = await response.json();
    setPublishedIds(normalizePublishedIds(payload.publishedIds));
    savePublishedIdsLocal();
    render();
  } catch {
    // Local storage remains the fallback when the sync API is unavailable.
  }
}

function setPublishedIds(ids) {
  publishedIds.clear();
  for (const id of normalizePublishedIds(ids)) {
    publishedIds.add(id);
  }
}

function normalizePublishedIds(ids) {
  return Array.isArray(ids)
    ? ids.filter((id) => typeof id === 'string' && id.length)
    : [];
}

function sameIds(left, right) {
  if (left.length !== right.length) return false;
  const values = new Set(left);
  return right.every((id) => values.has(id));
}

function saveImageCaption(post, title, body) {
  const caption = normalizeImageCaption({
    title,
    body,
    updatedAt: new Date().toISOString()
  });
  if (caption) {
    imageCaptions.set(post.id, caption);
  } else {
    imageCaptions.delete(post.id);
  }
  saveImageCaptionsLocal();
  syncImageCaption(post.id, caption);
}

function loadImageCaptions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(IMAGE_CAPTIONS_STORAGE_KEY) || '{}');
    return imageCaptionMap(parsed);
  } catch {
    return new Map();
  }
}

function saveImageCaptionsLocal() {
  try {
    localStorage.setItem(IMAGE_CAPTIONS_STORAGE_KEY, JSON.stringify(imageCaptionObject(imageCaptions)));
  } catch {
    // If storage is unavailable, keep captions in memory for this session.
  }
}

async function loadSharedImageCaptions() {
  const localCaptions = imageCaptionObject(imageCaptions);
  try {
    const response = await fetch(IMAGE_CAPTIONS_API_URL, { cache: 'no-store' });
    if (!response.ok) return;
    const payload = await response.json();
    const merged = mergeImageCaptionObjects(payload.captions, localCaptions);
    setImageCaptions(merged);
    saveImageCaptionsLocal();
    render();
    if (JSON.stringify(merged) !== JSON.stringify(normalizeImageCaptionObject(payload.captions))) {
      await syncImageCaptions(merged);
    }
  } catch {
    // Static file servers do not provide the sync API; local captions still work.
  }
}

async function syncImageCaption(id, caption) {
  try {
    const response = await fetch(`${IMAGE_CAPTIONS_API_URL}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, caption })
    });
    if (!response.ok) return;
    const payload = await response.json();
    setImageCaptions(payload.captions);
    saveImageCaptionsLocal();
    render();
  } catch {
    // Keep the local caption; it will sync after the shared server is available.
  }
}

async function syncImageCaptions(captions) {
  try {
    const response = await fetch(IMAGE_CAPTIONS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ captions })
    });
    if (!response.ok) return;
    const payload = await response.json();
    setImageCaptions(payload.captions);
    saveImageCaptionsLocal();
    render();
  } catch {
    // Local storage remains the fallback when the sync API is unavailable.
  }
}

function setImageCaptions(captions) {
  imageCaptions.clear();
  for (const [id, caption] of imageCaptionMap(captions)) {
    imageCaptions.set(id, caption);
  }
}

function mergeImageCaptionObjects(shared, local) {
  const merged = normalizeImageCaptionObject(shared);
  const localNormalized = normalizeImageCaptionObject(local);
  for (const [id, caption] of Object.entries(localNormalized)) {
    if (!merged[id] || Date.parse(caption.updatedAt || '') > Date.parse(merged[id].updatedAt || '')) {
      merged[id] = caption;
    }
  }
  return merged;
}

function imageCaptionMap(captions) {
  return new Map(Object.entries(normalizeImageCaptionObject(captions)));
}

function imageCaptionObject(captions) {
  const entries = captions instanceof Map ? captions.entries() : Object.entries(captions || {});
  return Object.fromEntries([...entries].map(([id, caption]) => [id, normalizeImageCaption(caption)]).filter(([, caption]) => caption));
}

function normalizeImageCaptionObject(captions) {
  if (!captions || typeof captions !== 'object' || Array.isArray(captions)) return {};
  return Object.fromEntries(Object.entries(captions)
    .map(([id, caption]) => [id, normalizeImageCaption(caption)])
    .filter(([id, caption]) => typeof id === 'string' && id.length && caption));
}

function normalizeImageCaption(caption) {
  if (!caption || typeof caption !== 'object') return null;
  const title = String(caption.title || '').trim();
  const body = String(caption.body || '').trim();
  if (!title && !body) return null;
  return {
    title,
    body,
    updatedAt: typeof caption.updatedAt === 'string' ? caption.updatedAt : new Date().toISOString()
  };
}

function detailItem(label, value) {
  const wrapper = document.createDocumentFragment();
  const term = document.createElement('dt');
  term.textContent = label;
  const description = document.createElement('dd');
  description.textContent = value;
  wrapper.append(term, description);
  return wrapper;
}

function seriesBadge(post) {
  const badge = document.createElement('span');
  badge.className = 'series-badge';
  badge.textContent = seriesLabel(post);
  return badge;
}

function videoSeriesBadge() {
  const badge = document.createElement('span');
  badge.className = 'series-badge video-series-badge';
  badge.textContent = BOOK_VIDEO_SERIES;
  return badge;
}

function seriesLabel(post) {
  if (!post?.series) return '';
  const index = post.seriesIndex ? ` 第${post.seriesIndex}${post.seriesUnit || ''}` : '';
  return `${post.series}${index}`;
}

function categoryLabel(post) {
  return post.category || (post.series ? '系列' : '未分類');
}

function renderMedia(post) {
  const youtubeItems = youtubeVideos(post);
  const youtubeSources = new Set(youtubeItems.map((item) => item.source).filter(Boolean));
  const mediaItems = (post.media || []).filter((item) => {
    if (isImage(item)) return true;
    if (!isAdminMode) return false;
    return isVideo(item) && !youtubeSources.has(item);
  });
  const allItems = [...youtubeItems, ...mediaItems];
  if (!allItems.length) return null;

  const section = document.createElement('section');
  section.className = 'reader-media';
  const heading = document.createElement('h3');
  heading.textContent = `附件 ${formatCount(allItems.length)}`;
  const grid = document.createElement('div');
  grid.className = 'media-grid';

  grid.replaceChildren(...allItems.map((item, index) => {
    if (item.kind === 'youtube') {
      const figure = document.createElement('figure');
      const frame = document.createElement('iframe');
      frame.className = 'youtube-frame';
      frame.src = youtubeEmbedUrl(item);
      frame.title = `${displayTitle(post)} YouTube 影片 ${index + 1}`;
      frame.loading = 'lazy';
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      frame.allowFullscreen = true;
      const caption = document.createElement('figcaption');
      caption.textContent = item.label || 'YouTube 影片';
      const link = document.createElement('a');
      link.href = youtubeWatchUrl(item);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = '開啟 YouTube';
      figure.append(frame, caption, link);
      return figure;
    }

    if (isImage(item)) {
      const figure = document.createElement('figure');
      const image = document.createElement('img');
      image.src = assetUrl(item);
      image.alt = `${displayTitle(post)} 附圖 ${index + 1}`;
      image.loading = 'lazy';
      const imageLink = document.createElement('a');
      imageLink.className = 'image-open-link';
      imageLink.href = assetUrl(item);
      imageLink.title = '開啟原圖';
      imageLink.addEventListener('click', (event) => {
        event.preventDefault();
        openImageViewer(assetUrl(item), image.alt);
      });
      imageLink.append(image);
      const caption = document.createElement('figcaption');
      caption.textContent = item.split('/').at(-1) || `附件 ${index + 1}`;
      const link = document.createElement('a');
      link.href = assetUrl(item);
      link.download = mediaFileName(post, item, index);
      link.textContent = '下載圖片';
      const originalLink = document.createElement('a');
      originalLink.href = assetUrl(item);
      originalLink.textContent = '開啟原圖';
      originalLink.addEventListener('click', (event) => {
        event.preventDefault();
        openImageViewer(assetUrl(item), image.alt);
      });
      figure.append(imageLink, caption, link, originalLink);
      return figure;
    }

    if (isVideo(item)) {
      const figure = document.createElement('figure');
      const video = document.createElement('video');
      video.src = assetUrl(item);
      video.controls = true;
      video.preload = 'auto';
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      const caption = document.createElement('figcaption');
      caption.textContent = item.split('/').at(-1) || `附件 ${index + 1}`;
      const link = document.createElement('a');
      link.href = assetUrl(item);
      link.download = mediaFileName(post, item, index);
      link.textContent = '下載影片';
      figure.append(video, caption, link);
      return figure;
    }

    const link = document.createElement('a');
    link.href = assetUrl(item);
    link.textContent = item.split('/').at(-1) || `附件 ${index + 1}`;
    return link;
  }));

  section.append(heading, grid);
  return section;
}

function openImageViewer(src, label) {
  const viewer = document.querySelector('#imageViewer') || createImageViewer();
  const image = viewer.querySelector('img');
  const caption = viewer.querySelector('.image-viewer-caption');
  image.src = src;
  image.alt = label;
  caption.textContent = label;
  viewer.hidden = false;
  document.body.classList.add('has-image-viewer');
  viewer.querySelector('button').focus({ preventScroll: true });
}

function closeImageViewer() {
  const viewer = document.querySelector('#imageViewer');
  if (!viewer) return;
  viewer.hidden = true;
  viewer.querySelector('img').removeAttribute('src');
  document.body.classList.remove('has-image-viewer');
}

function createImageViewer() {
  const viewer = document.createElement('div');
  viewer.id = 'imageViewer';
  viewer.className = 'image-viewer';
  viewer.hidden = true;
  viewer.setAttribute('role', 'dialog');
  viewer.setAttribute('aria-modal', 'true');
  viewer.setAttribute('aria-label', '原圖預覽');

  const panel = document.createElement('div');
  panel.className = 'image-viewer-panel';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'image-viewer-close';
  closeButton.textContent = '關閉';
  closeButton.addEventListener('click', closeImageViewer);

  const image = document.createElement('img');
  image.addEventListener('click', (event) => event.stopPropagation());

  const caption = document.createElement('p');
  caption.className = 'image-viewer-caption';

  panel.append(closeButton, image, caption);
  viewer.append(panel);
  viewer.addEventListener('click', (event) => {
    if (event.target === viewer) closeImageViewer();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !viewer.hidden) closeImageViewer();
  });
  document.body.append(viewer);
  return viewer;
}

function renderTopicTools(matched) {
  if (!topicPackLink) return;
  if (isHuangYuanjiQuery(state.query)) {
    const mediaCount = matched.reduce((sum, post) => sum + (post.media || []).filter(isImage).length, 0);
    topicPackLink.hidden = false;
    topicPackLink.textContent = `下載黃元吉圖片包 ${formatCount(mediaCount)} 張`;
  } else {
    topicPackLink.hidden = true;
  }
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

function isImage(value = '') {
  return /\.(avif|gif|jpe?g|png|webp)$/i.test(value);
}

function isVideo(value = '') {
  return /\.(3gp|avi|m4v|mov|mp4|mpe?g|webm)$/i.test(value);
}

function normalizeVideoLinks(raw) {
  const map = new Map();
  if (!raw || typeof raw !== 'object') return map;
  for (const [postId, value] of Object.entries(raw)) {
    const entries = Array.isArray(value) ? value : Array.isArray(value?.videos) ? value.videos : [];
    const normalized = entries
      .map((entry) => normalizeVideoLinkEntry(entry))
      .filter(Boolean);
    if (normalized.length) map.set(postId, normalized);
  }
  return map;
}

function normalizeVideoLinkEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const youtubeId = youtubeIdFromUrl(entry.youtubeId || entry.youtubeUrl || '');
  return {
    kind: 'youtube',
    source: typeof entry.source === 'string' ? entry.source : '',
    youtubeId,
    youtubeUrl: typeof entry.youtubeUrl === 'string' ? entry.youtubeUrl : '',
    label: typeof entry.label === 'string' ? entry.label : ''
  };
}

function youtubeVideos(post) {
  return (videoLinks.get(post.id) || []).filter((item) => item.youtubeId);
}

function postHasBookVideo(post) {
  return youtubeVideos(post).length > 0;
}

function youtubeEmbedUrl(item) {
  const url = new URL(`https://www.youtube.com/embed/${encodeURIComponent(item.youtubeId)}`);
  url.searchParams.set('playsinline', '1');
  url.searchParams.set('rel', '0');
  url.searchParams.set('modestbranding', '1');
  return url.toString();
}

function youtubeWatchUrl(item) {
  return item.youtubeUrl || `https://www.youtube.com/watch?v=${encodeURIComponent(item.youtubeId)}`;
}

function youtubeThumbnailUrl(item) {
  return `https://i.ytimg.com/vi/${encodeURIComponent(item.youtubeId)}/hqdefault.jpg`;
}

function youtubeIdFromUrl(value = '') {
  const text = String(value).trim();
  if (!text) return '';
  if (/^[\w-]{11}$/.test(text)) return text;
  try {
    const url = new URL(text);
    if (url.hostname.includes('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || '';
    if (url.hostname.includes('youtube.com')) {
      if (url.searchParams.get('v')) return url.searchParams.get('v');
      const parts = url.pathname.split('/').filter(Boolean);
      const embedIndex = parts.findIndex((part) => part === 'embed' || part === 'shorts' || part === 'live');
      if (embedIndex >= 0) return parts[embedIndex + 1] || '';
    }
  } catch {
    return '';
  }
  return '';
}

function isImageOnlyPost(post) {
  return !(post.body || '').trim() && (post.media || []).some(isImage);
}

function displayTitle(post) {
  if (!isImageOnlyPost(post)) return post.title;
  return imageCaption(post)?.title || 'Reels';
}

function displayBody(post) {
  if (!isImageOnlyPost(post)) return post.body;
  return imageCaption(post)?.body || (isAdminMode
    ? '這篇是 Reels，尚未建立標題與介紹。請先點圖片查看原圖，再依實際畫面補寫文案。'
    : 'Reels');
}

function copyTextForPost(post) {
  if (isImageOnlyPost(post)) {
    if (!hasImageCaption(post) && isAdminMode) return '';
    return `${displayTitle(post)}\n\n${displayBody(post)}`;
  }
  return post.body || post.title || '';
}

function shareTextForPost(post) {
  const parts = [
    `【書店的修行｜臻品齋書店】`,
    displayTitle(post),
    shareExcerpt(post),
    `閱讀全文：\n${postShareUrl(post)}`,
    shareTags(post).join(' ')
  ];
  return parts.filter(Boolean).join('\n\n');
}

function shareExcerpt(post) {
  const title = normalizeClipboardText(displayTitle(post));
  let text = normalizeClipboardText(displayBody(post));
  if (title && text.startsWith(title)) {
    text = text.slice(title.length).trim();
  }
  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

function shareTags(post) {
  const tags = ['#臻品齋書店', '#書店的修行'];
  if (post.series) tags.push(`#${post.series.replace(/\s+/g, '')}`);
  return tags;
}

function imageCaption(post) {
  return imageCaptions.get(post.id) || null;
}

function hasImageCaption(post) {
  const caption = imageCaption(post);
  return Boolean(caption?.title && caption?.body);
}

function textLength(value = '') {
  return [...String(value).trim()].length;
}

function assetUrl(value = '') {
  if (/^https?:\/\//i.test(value) || value.startsWith('/')) return value;
  if (isImage(value)) {
    if (value.startsWith('outputs/facebook_posts/_extracted/')) {
      return remoteFacebookMediaUrl(value.replace(/^outputs\/facebook_posts\/_extracted\//, ''));
    }
    if (value.startsWith('your_facebook_activity/')) {
      return remoteFacebookMediaUrl(value);
    }
  }
  if (value.startsWith('your_facebook_activity/')) {
    return `../outputs/facebook_posts/_extracted/${value}`;
  }
  return `../${value}`;
}

function remoteFacebookMediaUrl(value = '') {
  return `${REMOTE_FACEBOOK_MEDIA_BASE_URL}${value.split('/').map(encodeURIComponent).join('/')}`;
}

function downloadPostImages(post) {
  (post.media || []).filter(isImage).forEach((item, index) => {
    setTimeout(() => downloadFile(assetUrl(item), mediaFileName(post, item, index)), index * 180);
  });
}

function downloadPostVideos(post) {
  (post.media || []).filter(isVideo).forEach((item, index) => {
    setTimeout(() => downloadFile(assetUrl(item), mediaFileName(post, item, index)), index * 260);
  });
}

async function copyText(value = '') {
  const text = normalizeClipboardText(value);
  if (!text) return false;

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the selection-based copy method.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.width = '1px';
  textarea.style.height = '1px';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  textarea.remove();
  return copied;
}

function normalizeClipboardText(value = '') {
  return String(value)
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function downloadFile(href, fileName) {
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
}

function mediaFileName(post, item, index) {
  const extension = item.match(/\.[^.?#]+(?=$|[?#])/)?.[0] || '.jpg';
  return `${safeName(post.date)}-${safeName(displayTitle(post))}-${String(index + 1).padStart(2, '0')}${extension}`;
}

function safeName(value = '') {
  return String(value)
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'facebook-post';
}

function paragraphBlocks(value = '') {
  return value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function excerpt(value = '') {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 170 ? `${normalized.slice(0, 170)}...` : normalized;
}

function normalizeSearch(value = '') {
  return String(value).toLowerCase().replace(/年/g, '').replace(/\s+/g, '');
}

function searchTokens(value = '') {
  return String(value)
    .trim()
    .split(/[\s,，、]+/)
    .map(normalizeSearch)
    .filter(Boolean);
}

function tokenMatches(token, haystack, chapters) {
  const chapterToken = token.match(/^第?([一二三四五六七八九十百零〇○\d]+)(?:章|講|篇|條)?$/);
  if (chapterToken && isChapterSearchToken(token, chapterToken[1])) {
    const number = chapterNumberValue(chapterToken[1]);
    return Boolean(number && chapters.has(number));
  }
  return haystack.includes(token);
}

function chapterNumbers(text = '') {
  return new Set(
    [...text.matchAll(/第([一二三四五六七八九十百零〇○\d]+)[章講篇條]/g)]
      .map((match) => chapterNumberValue(match[1]))
      .filter(Boolean)
  );
}

function isChapterSearchToken(token, value) {
  return token.startsWith('第')
    || /[章講篇條]$/.test(token)
    || /^[一二三四五六七八九十百零〇○]+$/.test(value)
    || /^\d{1,2}$/.test(value);
}

function isHuangYuanjiQuery(value = '') {
  const query = normalizeSearch(value);
  return query.includes('黃元吉') || query.includes('元吉');
}

function formatCount(value) {
  return countFormat.format(value || 0);
}
