# Cinny & Lucas 家教打卡器

公開網站：https://tedus-ai.github.io/cinny-lucas-tutor-checkin/

- docs/：GitHub Pages 前端。
- worker/：Cloudflare Workers 同步 API 與 D1 初始化 SQL。

家用存取碼由 Cloudflare Secret TUTOR_KEY_HASH 驗證；APP 啟動時會要求存取碼並檢查 Cloudflare D1 連線。D1 綁定名稱為 DB。紀錄可從網站下載 JSON 備份。

