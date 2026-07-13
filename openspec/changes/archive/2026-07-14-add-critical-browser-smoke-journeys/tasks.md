## 1. 建立隔離 harness

- [x] 1.1 依「One isolated Chromium harness」實作 `scripts/run-browser-smoke.mjs`、`playwright.config.ts`與 `tests/browser/fixtures/runtime.ts`，交付「Browser smoke runtime is isolated from production state」；驗證：runner self-check證明unique temp DB/uploads、HOST=127.0.0.1、PORT=3310、mock mode與finally cleanup，且port collision在spawn前nonzero。
- [x] 1.2 在 `.gitignore`隔離browser artifacts並新增root browser:smoke script；驗證：成功run不留下temp runtime，failure artifacts不進git status。

## 2. 四條 observable journeys

- [x] 2.1 依「Four observable-contract journeys」實作「Draft conflict and publish refresh journey is verified」：兩contexts製造409、reload latest、publish並讓playback透過real Socket/display sync更新；驗證：單獨執行該Playwright test通過。
- [x] 2.2 實作「Image governance and fallback journey is verified」：上傳valid PNG、加入playlist、確認Images顯示，再移除isolated file並確認fallback；驗證：單獨執行該test通過且沒有broken/blank stage。
- [x] 2.3 實作「Data-mode readiness and live refresh journey is verified」：切mock mode、檢查readiness/rotation，再觀察live metric；驗證：單獨執行該test通過且只斷言observable states。
- [x] 2.4 實作「Playback survives reload and socket reconnect」：reload並中斷一次Socket transport，shell保持可見且reconnect後live更新；驗證：單獨執行該test通過且沒有application restart。

## 3. Failure evidence 與穩定性

- [x] 3.1 依「Evidence is retained only on failure」收集screenshot、console、network summary、server log，交付「Failed journeys retain bounded evidence」；驗證：故意破壞assertion時command nonzero並印含四類evidence的run-id directory。
- [x] 3.2 連續fresh執行兩次pnpm browser:smoke；驗證：四journeys兩次皆通過、temp paths不同、成功run不保留failure artifacts、production DB/uploads hash不變。
