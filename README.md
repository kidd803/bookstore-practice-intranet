# 書店的修行（臻品齋書店）

這是「書店的修行」Facebook 文章內網整理版，主題為臻品齋書店第45年的舊書、經典、宗教與哲學閱讀紀錄。

## 內容

- `site/`：可直接瀏覽的靜態網站
- `site/serial/unbroken-line/`：《一條沒有斷掉的線》（〈道炁重生〉）長篇小說連載
- `site/data/posts.js`：網站讀取的文章資料
- `outputs/facebook_posts/posts.json`：整理後文章資料
- `outputs/facebook_posts/_extracted/`：文章圖片附件
- `outputs/facebook_posts/duplicate-report.md`：重複文章合併報告
- `facebook-archive/categories.json`：分類與系列規則

## 說明

影片檔未放入此專案；GitHub 版保留文章、分類、系列與圖片。若要在本機瀏覽，可在專案根目錄啟動靜態伺服器，然後打開 `/site/`。

```bash
python3 -m http.server 4174
```

瀏覽：

```text
http://127.0.0.1:4174/site/
```
