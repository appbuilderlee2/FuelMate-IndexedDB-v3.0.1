# FuelMate IndexedDB v3.6.1

> v3.6.1 keeps a manual reload control permanently available at the bottom of Settings.

一個 **本地優先（Local-first）** 的車輛油耗與開支管理 PWA：所有資料預設只存喺你部機（IndexedDB），支援離線使用、備份/匯入、提醒中心、輪胎更換/換位追蹤同埋基礎分析。

## v3.6.1 更新內容

- 設定頁最底部長期顯示「重新載入」按鈕，無需等待系統偵測到新版本亦可手動重新載入App。
- 按鈕使用集中delegated UI event，直接呼叫瀏覽器reload，不改動或清除任何IndexedDB資料。
- 新增架構測試，確保設定頁保留重新載入按鈕及其UI action。
- App、package、設定頁、About及README同步升級至v3.6.1；Service Worker cache更新至`fuelmate-cache-v15`。

## v3.6.0 更新內容

### 提醒中心 UI 升級

- 新增「已逾期／即將到期／稍後」摘要及分組，重要提醒更容易識別，點擊摘要可快速篩選。
- 新增全部、輪胎、保養、證件及備份分類篩選，並保留待辦、已延後、已完成狀態分頁。
- 提醒卡顯示車輛、類別、到期資訊及延後日期；詳情頁集中顯示里程／日期條件、來源記錄、重複規則及相關操作。
- 待辦提醒支援多選，可一次批量延後 7 天或標記完成；操作後會清空選取狀態，避免重複處理。

### 邏輯、舊資料及測試

- 輪胎、保養、證件及備份提醒加入一致的類別與優先級資料；同時有里程及日期條件的保養提醒會保留兩項條件。
- 沿用現有 IndexedDB schema及`settings.reminderCenter`資料，毋須migration；舊版輪胎位置型提醒ID的Snooze／Done狀態仍會映射到新版穩定ID。
- 批量操作會同步清理同一提醒的舊ID狀態，避免舊狀態在日後重新出現；無效或缺少的舊狀態欄位會安全初始化。
- 新增提醒分類／優先級、舊Done狀態相容及瀏覽器篩選／詳情／批量完成流程測試。
- App、package、設定頁、About及README同步升級至v3.6.0；Service Worker cache更新至`fuelmate-cache-v14`。

## v3.5.1 更新內容

### 即時離線啟動

- 頁面navigation由Network First改為Cache First＋背景更新；沒有網絡時直接顯示已快取App Shell，不再等待連線逾時。
- 有網絡時會在背景以`no-store`取得最新首頁並更新cache，不阻塞目前畫面。
- 背景偵測到App Shell已更新時，畫面會顯示「新版本已準備好」及重新載入按鈕。
- 新增離線模式及網絡恢復提示，清楚表示目前正在使用本機IndexedDB資料。
- Service Worker cache更新至`fuelmate-cache-v13`，App、package、設定頁、About及README同步升級至v3.5.1。

### 測試

- 新增Service Worker隔離測試，以永不回應的network promise驗證離線navigation仍可立即返回cache。
- 新增Playwright離線reload流程，驗證車輛資料、App Shell及離線狀態提示在斷網後仍正常顯示。
- IndexedDB schema及現有資料格式維持不變，毋須migration。

## v3.5.0 更新內容

### 輪胎換位及壽命追蹤

- 輪胎提醒改用實體輪胎的更換記錄作穩定ID；輪胎換位後原有Snooze／Done狀態不會失效。
- 保留舊版位置型提醒ID的相容讀取，使用者第一次操作新提醒時會清理相關舊狀態。
- FWD、RWD及AWD建議換位改用同時執行的方向映射，FWD與RWD不再錯誤產生相同結果。
- 自訂成對交換仍保留，舊有`tireSwaps`及單組`tireSwapA/B`記錄可繼續讀取；新方向換位使用附加`tireMoves`欄位，毋須IndexedDB migration。
- 輪胎事件改為先按日期、同日再按里程重播，避免日期與里程不一致時套用錯誤換位次序。
- 部分輪胎未設定時，Dashboard會持續顯示下一個輪胎設定操作，不再被另一條遠期輪胎遮蓋。

### 提醒週期及資料可靠性

- 備份提醒ID加入30日到期週期；標記Done只會完成當期提醒，下一期會再次出現，並改為全備份共用而非綁定車輛。
- 輪胎的遠期預告與臨近到期提醒共用同一穩定ID，避免提醒跨門檻後突然解除Snooze。
- 無效的舊Snooze日期會當作未延後處理，不會令提醒永久消失；JSON匯入會拒絕無效Snooze、Done、備份日期及輪胎換位映射。
- 提醒中心的「Active／進行中」改稱「Pending／待辦」，準確表示當中亦包含遠期項目。
- 同時存在里程及時間保養條件時，使用各自提醒門檻的比例判斷較接近的一項，不再直接比較公里與日數。

### 保養基準、版本及測試

- 車輛首次啟用定期保養里程／時間時會保存當下里程及日期作基準；舊車不再由0公里起計而立即誤報逾期。
- 尚無保養記錄亦無已保存基準的舊資料不會產生錯誤逾期；下一次更新間距會建立基準。
- 新增輪胎未設定、換位後穩定ID、日期排序、FWD／RWD映射、備份週期、無效Snooze、保養基準及匯入驗證測試。
- App、package、設定頁、About及README同步升級至v3.5.0；Service Worker cache更新至`fuelmate-cache-v12`。
- IndexedDB schema維持不變，現有車輛、記錄、提醒及輪胎資料可直接沿用。

## v3.4.0 更新內容

### 集中 UI Event Architecture

- 新增 `src/ui/events.js` 作為集中delegated event controller，一次監聽document的click、change、input及focusout事件。
- 核心template改用 `data-action`、`data-ui-method`及安全編碼參數，不再直接執行長段inline JavaScript。
- 已遷移底部navigation、Modal背景關閉、搜尋／日期篩選、Full／Partial chips、車輛新增／編輯／選擇、入油表單及設定頁操作。
- 設定寫入集中到具欄位白名單的UI methods，避免template直接任意修改store object。
- async delegated actions統一捕捉及記錄錯誤，降低未處理Promise rejection。
- 保留既有 `ui.*` public API，維修、提醒、calendar及圖表的複雜互動會在後續版本逐步遷移。

### 版本、PWA及測試

- App、package、設定頁、About及README同步升級至v3.4.0。
- Service Worker cache更新至 `fuelmate-cache-v11`，並precache新的event controller。
- 架構測試會檢查event controller載入次序、production copy、離線precache及核心UI檔案不再包含inline events。
- Playwright既有車輛、navigation、設定版本、入油計算、儲存及reload流程繼續作為event重構回歸保護。
- CI瀏覽器安裝加入10分鐘timeout並避免每次重裝runner系統dependencies，減少PR長時間卡在安裝步驟。
- IndexedDB schema及現有資料格式不變，毋須migration。

## v3.3.0 更新內容

### UI 架構拆分

- 將原本約2,800行、包含67個方法的 `src/ui.js` 拆成輕量registry及10個聚焦模組。
- `src/ui/base.js` 負責生命週期、共用renderer、navigation、Modal及驗證。
- `src/ui/pages/` 分開Dashboard／提醒、記錄頁及設定頁rendering。
- `src/ui/actions/` 分開車輛、入油、維修、記錄、匯入匯出及dialog操作。
- 保留原有 `ui.*` public API及inline event handlers，避免影響現有功能或IndexedDB資料。
- Production複製流程、HTML載入次序及Service Worker App Shell已同步包含全部UI模組。

### 瀏覽器 E2E 測試

- 新增Playwright設定，以Chromium測試桌面及iPhone 13 mobile layout。
- 新增「建立車輛 → 設定頁版本同步」瀏覽器流程。
- 新增「建立車輛 → 新增入油記錄 → reload後IndexedDB資料仍存在」瀏覽器流程。
- 關鍵互動加入穩定 `data-testid`，測試不依賴語言文字或Tailwind class。
- GitHub Actions會在PR及main部署前安裝Chromium並執行E2E；PR只驗證、不會部署，瀏覽器流程失敗時亦不會更新Pages。

### 版本、PWA及維護規則

- App、package、設定頁、About及README版本同步升級至v3.3.0。
- Service Worker cache更新至 `fuelmate-cache-v10`，確保已安裝PWA取得拆分後的UI模組。
- 新增架構守護測試，限制UI registry保持輕量，個別UI模組維持少於600行。
- 保留v3.2.0版本同步規則；往後每次更改仍須同步更新設定頁版本號。

## v3.2.0 更新內容

### 版本同步及設定頁

- 新增 `src/core/version.js` 作為瀏覽器runtime的單一版本來源，現時版本為v3.2.0。
- 設定頁底部直接顯示目前版本，修正舊有硬編碼 `v4.0` 與實際package版本不一致。
- About視窗改為讀取同一runtime版本來源，毋須在UI多處手動修改版本字串。
- 新增自動測試，強制package、runtime、設定頁、About及README版本保持同步。
- 更新 `AGENTS.md`：每次程式或release更改都必須同步確認或更新設定頁版本號及所有版本來源。
- 將version runtime script加入production複製流程及離線App Shell precache。
- Service Worker cache更新至 `fuelmate-cache-v9`，確保已安裝PWA取得v3.2.0。
- 目前共31項自動測試。

### 包含的可靠性更新

- 完整包含v3.1.1的Full／Partial油耗趨勢統一、單一里程修正、原子JSON匯入、IndexedDB寫入一致性及CSV公式安全改善。
- 保留既有IndexedDB schema，毋須資料遷移或重新輸入資料。

## v3.1.1 更新內容

### 統計一致性

- Dashboard、加油記錄詳情及 Analytics 趨勢圖共用同一套 Full／Partial Tank 區間算法。
- Analytics 趨勢圖會把兩次 Full 之間的 Partial 油量合併到區間，避免油耗偏低。
- 修正只有一個有效里程點時，系統錯把 odometer 當成已行駛距離；距離及每公里成本現在會顯示未能計算。
- 修正趨勢圖只有一個月份資料點時可能產生 `NaN` SVG座標。

### IndexedDB 資料可靠性

- JSON匯入改用涵蓋 vehicles、logs及settings的單一IndexedDB transaction。
- 匯入中途失敗會自動rollback，原有記憶體資料保持不變，bulk import狀態亦會在 `finally` 重設。
- 新增、更新及刪除車輛／記錄改為IndexedDB成功後才更新記憶體狀態。
- 清除車輛記錄會等待IndexedDB cursor transaction完成後才更新畫面。
- 非覆蓋式匯入按ID合併資料，避免記憶體出現重複vehicle/log項目。
- 保留既有IndexedDB schema，毋須資料遷移。

### 匯出安全、PWA及測試

- CSV匯出會中和以 `=`, `+`, `-`, `@` 開頭的試算表公式內容，降低formula injection風險。
- Service Worker cache更新至 `fuelmate-cache-v8`，確保已安裝PWA取得v3.1.1。
- 新增Partial趨勢、單筆里程、原子匯入成功／rollback及CSV公式安全測試。
- 目前共30項自動測試。

## v3.1.0 更新內容

### 數據輸入邏輯修正

- 加油、維修、泊車、車輛及輪胎表單新增日期、必填值及非負數驗證，錯誤內容不再寫入 IndexedDB。
- 油量／電量必須大於零；里程、金額、胎紋、胎壓及剩餘壽命會按欄位用途驗證。
- 修正 `Full → Partial → Full` 情況下總覽油耗顯示 `--`；現在會把兩次 Full 之間的 Partial 油量合併計算。
- 修正 TRIP 模式失焦後可能重複累加里程；轉換一次後會自動返回 ODO 模式。
- 編輯或刪除最高里程記錄時，如車輛目前里程原本由該記錄推導，會同步修正；手動設定的較新里程則保留。
- JSON 匯入新增日期、負數、記錄類型、重複 vehicle/log ID、設定格式及必要 fuel/parking 欄位驗證。
- 保留既有 IndexedDB schema及記錄欄位格式，毋須資料遷移。

### 輸入及匯入安全

- 新增共用 `src/core/security.js`安全模組。
- 車款、型號、年份、地點、備註、輪胎品牌及提醒文字顯示前統一HTML escape。
- 表單value及其他HTML attributes統一attribute escape。
- 外部Google Maps連結加入 `noopener noreferrer`保護。
- JSON匯入會拒絕包含不安全vehicle/log ID的資料，降低inline event及attribute injection風險。
- 保留使用者原始文字於IndexedDB；escape只在畫面輸出時套用，避免破壞備份內容。

### PWA及離線可靠性

- Service Worker cache更新至 `fuelmate-cache-v7`，確保已安裝 PWA 取得本次輸入邏輯修正。
- 將security、calculations、translations、store、utils、UI及main全部runtime scripts加入App Shell預先cache。
- 修正首次正常載入後立即離線時，部分JavaScript可能尚未進入cache的問題。

### 版本及介面

- Package版本由3.0.1升級至3.1.0。
- App內「關於 FuelMate」版本同步更新至3.1.0。
- 保留原有IndexedDB schema及所有現有功能，無需重新輸入或轉換資料。

### 測試

- 新增HTML內容escape測試。
- 新增attribute及backtick escape測試。
- 新增安全ID接受／拒絕測試。
- 新增Service Worker完整runtime scripts precache測試。
- 新增 Partial Tank、表單邊界值、TRIP 單次轉換、匯入驗證及里程同步回歸測試。
- 目前共25項自動測試。

### README更新規則

- 新增 `AGENTS.md` repository規則。
- 由3.1.0開始，每次功能修改、bug fix、重構或部署變更，都必須同步更新README changelog。

## v3.0.1 更新內容

### 架構與維護性

- 將原本約 4,500 行、集中於單一 `index.html` 的程式拆分成獨立模組：
  - `src/store.js`：IndexedDB、資料狀態及儲存邏輯
  - `src/utils.js`：格式化、篩選、分析、提醒及匯入/匯出
  - `src/ui.js`：畫面、表單及 Modal
  - `src/translations.js`：英文及繁體中文翻譯
  - `src/main.js`：Router、事件、圖表及 Service Worker註冊
  - `src/core/calculations.js`：油耗及輪胎氣壓計算
- 移除未使用的空白 `index.tsx`。
- 保留原有 IndexedDB schema及資料格式，避免升級後遺失舊資料。

### PWA及離線使用

- 修正 GitHub Pages子目錄下 Service Worker錯誤讀取 `/index.html` 的問題。
- Service Worker改用目前安裝 scope定位 App Shell。
- 更新 cache版本，確保使用者取得最新資源。
- 將應用程式JavaScript正確複製到 production build，修正 Pages空白畫面。
- 移除Google Fonts及Tailwind runtime CDN依賴，核心介面資源改為本地載入。

### 介面及CSS

- 更新 Tailwind 4 build入口及source設定。
- Tailwind會掃描拆分後的 `src/**/*.js` UI templates。
- 修正production build遺漏大量CSS，導致版面、圓角、顏色及陰影消失的問題。
- 加入自動safelist生成，保留runtime templates使用的動態class。

### 安全性

- 移除將 `GEMINI_API_KEY`注入瀏覽器bundle的設定，避免日後API key外洩。
- 精簡GitHub Actions權限，移除未使用的 `pages: write`權限。

### 測試及部署

- 新增油耗計算測試，包括 L/100 km及MPG。
- 新增輪胎氣壓 kPa、psi及bar轉換測試。
- 新增PWA路徑、CDN依賴、API key及模組載入順序測試。
- 新增production scripts及Tailwind source完整性測試。
- GitHub Actions改用 `npm ci`，並於部署前執行test、typecheck及build。
- Vite base path更新為 `/FuelMate-IndexedDB-v3.0.1/`。

### 驗證結果

- 10項自動測試全部通過。
- 所有拆分後JavaScript通過語法檢查。
- GitHub Pages production build已確認包含runtime scripts及完整Tailwind CSS。

## 1) 核心功能與價值
- 車輛管理：多車切換、里程（odometer）維護、基本車輛資料（含驅動方式）
- 加油記錄：單價/金額/升數互算、Full/Partial（影響油耗計算）、地點/備註
- 維修保養：常用項目、費用、備註、類型多選篩選
- 停車/罰單/證件：支出記錄、到期日（證件）與提醒
- 輪胎模組：四條胎獨立追蹤、更換記錄、換位（Rotation）記錄、每條胎 timeline
- 提醒中心：輪胎/證件/定期保養整合，支援 Snooze（1/7/30 日）與 Done 狀態
- 匯出/匯入：JSON 備份、CSV 匯出、匯入前自動備份 + 匯入摘要（避免誤覆蓋）
- 分頁/懶載入：長列表先顯示最近 100 條，可「Load more」逐步加載
- PWA/離線：可安裝到主畫面，離線仍可查看/新增記錄；核心介面資源已全部本地化

## 2) 解決嘅問題
- 記錄散落：油費、維修、停車、罰單、證件到期分散喺唔同地方，難以統計
- 易遺漏：定期保養、證件到期、輪胎更換時間/里程容易忘記
- 資料風險：手機/瀏覽器清理、誤匯入覆蓋等導致資料遺失
- 長期成本難看清：唔容易知道最近半年/月平均開支、油耗趨勢同成本/距離

## 3) 主要使用流程（簡潔步驟）
- 第一次打開 → 新增車輛（車款/里程/單位/驅動方式等）
- 日常使用
  - 加油：輸入其中兩個（單價/金額/升數）→ 自動算第三個 → 儲存
  - 維修/保養：選類型 → 填費用/里程/備註 → 儲存
  - 輪胎：更換某位置輪胎，或使用換位模板快速記錄 rotation
- 查看
  - 首頁：總支出/總里程/油耗表現 + 「下次換胎」四格狀態卡
  - 分頁：Fuel / Maintenance / Parking 進一步搜尋、篩選、日期範圍
  - 提醒中心：查看到期項目 → Snooze / Done / 直接跳轉到對應編輯
- 備份
  - 設定頁：定期匯出 JSON；匯入時會先自動下載一份現有資料作備份

## 4) 使用者角度優點與賣點
- 私隱友好：資料預設只喺本地，唔需要登入/雲端先用到
- 夠安全：匯入前自動備份 + 匯入摘要，減少「一按就覆蓋冇得返轉」
- 夠實用：提醒中心 + Snooze/Done，唔再靠腦記
- 夠直觀：搜尋/篩選 UX 統一；長列表「Load more」唔會卡死手機
- 夠細緻：輪胎四條分開追蹤，換位亦會反映到各胎 timeline
- 夠可攜：PWA 可安裝，離線照用；備份檔一個 JSON 帶走

## 5) App 介紹文（一般使用者）
FuelMate 係一個「本地優先」嘅車輛開支管理 PWA，幫你用同一個地方記低加油、維修、停車、罰單同證件到期，並用提醒中心同輪胎追蹤，令你更安心同更易掌握長期成本。你可以離線使用，亦可以隨時匯出備份，唔怕資料唔見。

---

# App 使用邏輯（像產品說明書）

## 1) 使用者旅程（User Journey）
- Onboarding：新增車輛 → 設定單位/貨幣/提醒規則
- Capture：日常新增加油/維修/停車/罰單/證件到期/輪胎事件
- Understand：透過首頁卡片、月/年/全部篩選、搜尋、分析圖表了解趨勢
- Prevent：提醒中心集中處理到期（Snooze / Done / 直接跳轉修正）
- Protect：定期匯出 JSON；匯入時自動先備份現有資料

## 2) App 內部流程（輸入 → 處理 → 輸出）
- 輸入：表單（加油/維修/輪胎/證件…）+ 搜尋/篩選條件
- 處理：
  - 寫入 IndexedDB（vehicles/logs/settings）
  - 計算：油耗、成本/距離、月度統計、輪胎到期（里程/時間取先到者）、提醒項整理
  - 列表：先顯示最近 N 條，按 Load more 逐步加載
- 輸出：
  - UI：首頁卡片、列表、分析圖
  - 匯出：JSON/CSV、日曆（ICS，部分提醒）

## 3) 模組如何互相連接
- Vehicles：決定 activeVehicleId → 所有 logs 篩選都以此為主
- Logs（Fuel/Maint/Parking/Docs/Tires…）：用統一資料結構存入 → UI 同一套卡片渲染
- Settings：控制單位、貨幣、提醒規則、氣壓單位、提醒中心狀態（snoozed/done）
- Reminders Center：從 logs + settings 計算提醒項 → 點擊直接開啟相關編輯表單
- Tires：由 tire_replace + tire_rotation 事件「回放」計算四條胎當前位置與到期狀態 → 首頁卡片 + 維修頁 timeline

## 4) Flowchart（Mermaid）
```mermaid
flowchart TD
  A[User Input\n(Add Fuel / Service / Tire / Doc)] --> B[Validate + Normalize]
  B --> C[Store\nIndexedDB: vehicles/logs/settings]
  C --> D[Compute\nStats / Tire status / Reminders]
  D --> E[Render UI\nDashboard / Lists / Analytics]
  E --> F[Search/Filter/Load more]
  F --> E
  C --> G[Export\nJSON/CSV/ICS]
  G --> H[Backup File]
  H --> I[Import]
  I --> J[Auto-backup current]
  J --> C
```

---

# App Store 風格介紹文

## Tagline
- 「一個 App 管晒你架車嘅日常開支同提醒。」

## 產品賣點
- 本地優先：唔洗登入，資料只存喺你部機
- 離線可用：裝到主畫面，冇網都照記錄
- 提醒中心：輪胎/證件/保養集中管理，Snooze/Done 一鍵搞掂
- 輪胎追蹤：四條胎獨立 timeline，換位一樣記得清清楚楚

## 為咩人而設
- 想認真管理油耗與開支嘅車主/司機
- 經常忘記保養或證件到期嘅用戶
- 想要私隱、唔想用雲端記錄嘅人

## 主要功能
- 加油：單價/金額/升數互算、Full/Partial 油耗邏輯
- 維修保養：常用項目 + 搜尋/多選篩選 + 日期範圍
- 輪胎：更換/換位/到期狀態、首頁「下次換胎」卡片
- 提醒中心：整合提醒 + Snooze（1/7/30 日）+ 直接跳轉編輯
- 備份：JSON 匯出/匯入（匯入前自動備份）

## 使用場景示例
- 加完油即刻記低：輸入兩個數 → 自動算第三個 → 一分鐘完成
- 做完保養：記低費用同里程 → 下次保養提醒自動計
- 換胎/換位：揀模板快速記錄 → 首頁即刻見到四條胎狀態
- 想搬機/防丟資料：匯出 JSON 做備份，匯入前仲會自動再備份一次

---

## Development

**Prerequisites:** Node.js

1. Install deps: `npm install`
2. Run dev: `npm run dev`
3. Build: `npm run build`
4. Test: `npm test`
5. Type check: `npm run typecheck`

### Source layout

- `src/store.js` — IndexedDB persistence and application state
- `src/core/calculations.js` — tested fuel-efficiency and tyre-pressure calculations
- `src/utils.js` — formatting, filtering, analytics, import/export, and reminders
- `src/ui.js` — screens, forms, modals, and rendering
- `src/translations.js` — English and Traditional Chinese strings
- `src/main.js` — routing, event bindings, charts, and service-worker registration

Vite does not bundle these ordered classic scripts. `npm run prepare:static` copies them into `public/src` before development and production builds so GitHub Pages receives every runtime file.

Tailwind scans both `index.html` and `src/**/*.js`; the generated safelist preserves classes used inside runtime UI templates.
