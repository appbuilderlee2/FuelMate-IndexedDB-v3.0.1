# FuelMate IndexedDB v3.0.1

> v3.0.1 keeps the existing IndexedDB data format while moving the application into maintainable source modules, removing runtime CDN dependencies, and hardening the PWA build and deployment flow.

一個 **本地優先（Local-first）** 的車輛油耗與開支管理 PWA：所有資料預設只存喺你部機（IndexedDB），支援離線使用、備份/匯入、提醒中心、輪胎更換/換位追蹤同埋基礎分析。

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
