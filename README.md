# FuelMate IndexedDB v4.4.9

## v4.4.9 更新內容（目前版本）

- 新增加油 ODO 留空，避免補錄時沿用目前車輛里數。同日補錄可勾選「補錄較早的加油」，禁止 TRIP；過往日期及編輯亦只接受 ODO。
- TRIP 改為手動輸入歸零時的 ODO，並確認該起點；不再取用目前儲存里數。未知歸零起點時請使用實際 ODO。
- 儲存時檢查與其他日期紀錄的里數矛盾；相同日期、ODO、油量及金額會要求確認是否獨立交易，取消即不寫入。同日事件仍按 ODO 排序。
- 刪除加油先選原因：移除真實加油會將漏記標記傳給下一筆；未有下一筆時在車輛保存待承接缺漏。刪除錯誤／重複資料不新增缺漏，但不能抹除原有漏記標記。刪除、標記及車輛更新在同一 IndexedDB 交易完成。
- 移除真實加油不會降低車輛已知實際里數；刪除錯誤紀錄則沿用修正衍生最高里數的邏輯。
- 待承接缺漏使用可選 `pendingFuelGapOdometer` 車輛欄位，達到該里數的下一筆加油自動承接；補錄較低里數不會提前消耗標記。JSON 備份保存欄位，匯入驗證非負數，公里／英里轉換同步換算。舊備份相容，不更改 IndexedDB schema。
- 加油表單儲存／刪除在寫入交易內檢查資料快照；其他視窗改過紀錄、車輛或距離單位時停止寫入並保留表單，提示抄下內容、重新載入後核對。TRIP 起點不受其他視窗目前里數影響。
- 統計分清「所選紀錄支出／ODO 跨度」與完整週期油費，說明跨月起點、隱藏加油、起點油費排除及單筆沒有里程跨度。加滿程度以一致油位判定，介面提示比較多個週期。
- 取消漏記標記仍需逐張核對、確認整段補齊；App 無法證明實際漏記次數或量度油缸油位，不能自動修補未知資料。
- PWA 回到前景時檢查新版（節流一分鐘）並保留更新提示，不強制重新載入未儲存表單。完全離線時無法取得新版，更新仍需連線。
- 版本 4.4.9、離線 cache v38；新增補錄、明確 TRIP 起點、重複、日期矛盾、刪除缺漏及雙視窗回歸測試。

## v4.4.8 更新內容

- 補錄過往日期及編輯紀錄只可輸入實際 ODO；TRIP 只供新增今日紀錄，顯示並固定換算起點。TRIP 途中改到舊日期會清空距離，要求重新輸入當日總里數。
- 取消既有漏記標記前，必須另行確認已核對所有單據並補齊整段。補一筆不等於補齊；App 不能自動核實實際漏記次數，不確定時請保留標記。
- 加油平均油耗、燃油每公里成本及趨勢統一採用「所選紀錄結束的完整加滿週期」，可參照日期／搜尋／Full 篩選外的起點及中間紀錄。只選到一筆完成週期的紀錄亦能與卡片一致。
- 漏記區間不參與完整週期計算，其後正常週期恢復顯示燃油每公里成本，不再因舊漏記永久顯示「--」。整體車務成本跨越缺漏時仍不估算；畫面補充原因、週期數、計算距離與篩選範圍說明。
- 支出仍只合計可見紀錄，列表里程與完整週期計算距離可能不同。例如漏記後 100,800 km 加滿，101,300 km 加滿 40 L／A$80，後一完整週期顯示 8.0 L/100 km、A$0.16/km，不代表漏記區間的成本。
- IndexedDB schema 不變，既有紀錄及漏記標記保留。版本 4.4.8，離線 cache v37。

## v4.4.7 更新內容

- 新增「中間有漏記加油」：保留實際總里數及已記錄支出，中斷跨越漏記的油耗週期。今次加滿即建立新起點；未加滿則等下一次加滿建立起點，之後才恢復計算。
- 首頁、加油、分析及紀錄卡共用完整週期計算；即使搜尋或「加滿」篩選令中間紀錄在列表中不可見，統計仍會參照所選里程範圍內的紀錄，避免跨過漏記位置。缺漏範圍顯示資料不完整及已記錄支出，整體每公里成本顯示「--」。
- 可補錄舊資料，再編輯原漏記標記紀錄取消勾選；不會自動猜測是否已補齊。JSON 備份保存標記，CSV 亦顯示漏記狀態；舊備份沒有標記時保持原有行為，IndexedDB schema 不變。
- App 版本 4.4.7，離線 cache v36；新增漏記、未加滿、多次中斷、補錄、篩選及瀏覽器回歸測試。

### 加油紀錄、漏記與油耗（v4.4.7 歷史操作；最新差異見上方 v4.4.8）

1. 每次加油輸入日期、儀錶板實際**總里數（ODO）**、油量和金額。單價、油量、金額輸入其中兩項可算出第三項。里數旁可切換 TRIP 輸入今次行駛距離；儲存時會換算成總里數。
2. 「未加滿（Partial）」表示今次油缸未加滿；**它不等於漏記**。正常情況下，App 以一次加滿為起點，累加其後的未加滿油量，再於下一次加滿時以「累計油量 ÷ 兩次加滿的里程差」計算該完整週期油耗；公里及公升模式以 L/100 km 顯示。
3. 若**今次之前中間曾加油但忘記記錄**，在漏記之後第一筆新紀錄勾選「中間有漏記加油」，並填當刻實際總里數。App 不會自動偵測漏記，也不會估算漏掉的油量、費用或里數。標記會中斷舊週期；跨越漏記的距離不會被當成今次油量的油耗。
4. 如果這筆已標記紀錄**加滿**，它的總里數即成為新起點，待下一次加滿後恢復計算。如果這筆**未加滿**，要等之後第一次加滿才建立新起點，再到下一次加滿才有完整週期可計算。
5. 在包含漏記標記的統計範圍，實際里數照樣保留，支出只合計已輸入的金額並標為「已記錄支出」；平均油耗只計沒有跨越漏記的完整週期，整體每公里成本顯示「--」。單筆加油卡片的油耗及每公里成本，只有該筆結束了一段完整週期才顯示數值；分析油耗趨勢亦只採用完整週期。日期、搜尋或 Full／Partial 篩選不會令統計跳過所選里程範圍內的中間漏記標記。
6. 之後如找到單據，可按原日期、實際總里數、油量與金額**補錄**漏掉的加油。確定整段都補齊後，再編輯當初勾選的紀錄，取消「中間有漏記加油」並儲存；App 才會重新按里數排序計算。單純補錄不會自動取消標記。

例子：100,000 km 加滿有記錄；中途一次加油漏記；100,800 km 加滿 35 L，勾選漏記；101,300 km 再加滿 40 L。100,000 → 100,800 km 的油耗會顯示資料不足；100,800 → 101,300 km 是完整週期，油耗為 **8.0 L/100 km**。總里程仍按真實記錄顯示；因中途油費不齊，包含該漏記位置的整體每公里成本不提供數字。

標記會保留在 IndexedDB 和 JSON 備份，CSV 匯出詳情亦標示漏記。舊紀錄沒有這個標記時按原有 Full／Partial 邏輯處理；不需要資料遷移。

## v4.4.6 更新內容

- 修正提醒詳情轉開來源紀錄後，新編輯視窗被上一個視窗的關閉動畫隱藏；快速連續開關視窗亦不再殘留舊計時器。
- 加油 TRIP 里程只在切回 ODO 或儲存時換算，避免失焦事件先換算再重設輸入；新增實際點按與儲存回歸測試。
- 輪胎剩餘月數改按日曆月計算（包括跨年、月尾及閏年），保留精確月數與相容日數；舊版由表單存成 30 日倍數的紀錄會在讀取時按月數顯示，不修改 IndexedDB 資料。
- 匯入備份會拒絕格式錯誤的提醒設定；對已存在的無效提醒設定，開關與提前通知操作會自動回復可用狀態。
- 停車紀錄沒有里程時不再只顯示單位；未填輪胎品牌的已設定輪胎不再顯示「未設定」；加油篩選、搜尋提示、車輛／應用設定標題及油耗趨勢跟隨語言切換。
- IndexedDB schema 不變，既有紀錄保留。App 版本 4.4.6，離線 cache v35；增加提醒來源、TRIP、輪胎月份、匯入與介面回歸測試。

## v4.4.5 更新內容

- 日期紀錄按儲存的日曆日顯示及篩選，修正美西等時區月初紀錄被歸入上月；自訂起訖日期亦直接按日曆日比較。
- 保養月份到期日於月尾夾到目標月份最後一日；輪胎及文件提醒採用當地日曆日，畫面、提醒識別及匯出日曆使用一致日期。
- AI 帳單無法辨認的里程、總額及明細不再變成 0；未知日期與里程需在核對頁手動輸入，無效日期不會通過解析。
- 同日同里程輪胎事件以穩定次序重播；新輪胎事件記錄建立時間，重新開啟後不因 IndexedDB 排序改變輪胎位置。舊紀錄未有時間戳時，先更換後換位。
- 匯入備份時，若紀錄找不到對應車輛會停止覆蓋並顯示數量；下載備份後要由使用者確認檔案已儲存，才標記完成或繼續覆蓋匯入。
- IndexedDB schema 不變，保留現有紀錄。App 版本 4.4.5，離線 cache v34；新增時區、月尾、帳單空值、輪胎重播、孤兒紀錄及備份確認回歸測試。

## v4.4.4 更新內容

- 編輯車輛保留既有保養起算日期、里數及額外欄位；新車啟用定期保養間隔時會建立起算點，避免提醒消失。
- 公里／英里切換以單一 IndexedDB 交易轉換所有車輛及紀錄的里數、保養／輪胎距離設定；燃料單位仍按每架車的 Fuel/Energy 設定，交易失敗不會部分更新。
- 分析頁每月支出與油耗趨勢跟隨目前日期及搜尋篩選，六個月圖表以所選年月／自訂結束月份作終點。
- 編輯泊車紀錄保留原屬車輛與額外資料，避免由其他車輛開啟時移錯紀錄。
- IndexedDB schema 不變。App 版本 4.4.4，離線 cache v33；新增資料轉換、原子失敗、圖表及編輯回歸測試，CI 保存分析頁篩選截圖。

## v4.4.3 更新內容

- 依照車輛照片參考色，首頁 Mazda 2 2012 車圖改為深酒紅，Honda CR-V 2018 車圖改為亮面黑色；保留車型、透明背景與切換方式。
- IndexedDB schema 不變。App 版本 4.4.3，離線 cache v32 會重新取得兩張車圖。

## v4.4.2 更新內容

- 修正首頁切換車輛後仍顯示同一張掀背車圖：2012 Mazda 2 與 2018 Honda CR-V 現各自顯示對應車圖。新 CR-V 圖為透明背景、經壓縮的獨立素材。
- 未備有對應素材的年份或車型顯示車種圖示，不會誤用 Mazda 2 或 Honda CR-V 照片；切換車輛不修改既有 IndexedDB 紀錄。
- 切車後首頁返回頂部，確保標題及車圖主卡唔會因前一頁捲動位置而消失。
- IndexedDB schema 不變。App 版本 4.4.2，離線 cache v31 包含兩張車圖。

## v4.4.1 更新內容

- Apple Fluid 首頁主按鈕直接開啟新增加油；首頁顯示已儲存車輛的廠牌、型號及年份，可直接切換或新增車輛（例如 Mazda 2 2012、Honda CR-V 2018），不會自動建立假車輛。
- 加油、停車、車務紀錄及分析共用日期篩選器改為月份／年份／全部／自訂四種互斥模式；月份及年份選擇獨立成行，自訂日期在手機上逐行排列，解決 iPhone 原生日期框重疊。
- 自訂日期可只設單邊；若起訖反轉，自動把另一端調到新日期。切回預設期間會清除自訂區間，避免年份及日期交叉篩選令紀錄消失。
- IndexedDB schema 不變。App 版本 4.4.1，離線 cache v30。

## v4.4.0 更新內容

- Apple Fluid 首頁按已確認設計圖重整：車輛主卡、真實里數、油耗與當月支出、最接近的提醒、兩筆最近紀錄及六入口浮動導航；支援淺色、深色及跟隨系統。
- 車輛圖為獨立透明裝飾素材，並非使用者車輛照片；沒有記錄時顯示真實空狀態，不會填入示意數字。
- 「新增紀錄」可選加油、車務及停車；最近紀錄可開啟原有編輯頁，查看全部可檢視跨類別紀錄；提醒可開詳細資料。舊有輪胎狀態、總計及捷徑保留於首頁「更多車輛資料」，下方保留提醒中心快捷延後操作。
- IndexedDB schema 不變。App 版本 4.4.0，離線 cache v29 包含新素材。
- 切換頁面時重設捲動位置，避免由長設定頁返回首頁落在中段；PWA 更新提示移至底部導航上方，不再遮住首頁標題。


## v4.3.1 更新內容

- 整理 Apple Fluid 淺色、深色及跟隨系統外觀：分層玻璃卡片、較清晰的深色表面及浮動底部六入口導覽。
- 表單及彈出頁採用一致的半透明材質；iPhone 表單字體至少 16px，避免輸入時自動放大。
- 預先載入圖示字體，並限制圖示佔用寬度；Service Worker 可從已驗證的版本快取讀取標頭不同的字體請求，手機截圖測試等字體繪製完成後檢查不出現橫向捲動。
- 「減少透明度」亦適用於 Apple Fluid，並在裝置要求減少透明度或不支援背景模糊時使用實色表面。
- IndexedDB 記錄、六個導覽入口及其他 iOS 外觀維持相容；App 版本 4.3.1，cache v28。

## v4.3.0 更新內容

- 更換輪胎表單支援一次選擇前兩條、後兩條、四條或任意多個位置。
- 同一批更換只建立一筆事件，日期、里程、車房、輪胎資料及總額共用，避免費用重複計算。
- 新增 `tirePositions[]` 及 `tireIds{}` 的兼容資料欄位；舊有 `tirePosition/tireId` 記錄仍可讀取及編輯，毋須 IndexedDB migration。
- 每個輪胎保留獨立身份及提醒狀態；輪胎換位後仍會按實體輪胎繼續追蹤。
- 快速設定全輪亦改為單一原子更換事件；取消所有位置或選擇無效位置時不會寫入資料。
- App 版本 4.3.0，cache v27；新增位置選擇及多輪胎狀態測試。
- 修正 GitHub Pages E2E 的硬編碼舊版本斷言，往後會直接核對 runtime 版本，避免版本升級阻塞部署。
- 驗證：76 項 Node 測試、14 項 Chromium 桌面／手機尺寸 E2E、typecheck 及 production build。

## v4.2.0 更新內容

- AI 設定新增「連接並載入模型」：直接使用使用者輸入的 API Key 向所選供應商取得模型清單，成功後以選單取代手動輸入。
- 支援 OpenAI、Google AI Studio、Groq、DeepSeek、OpenRouter、NVIDIA 及自訂 OpenAI-compatible API 的模型清單格式；Google 的 `models/` 前綴會自動整理。
- 模型清單只保留於目前頁面，不寫入 IndexedDB 或備份；API Key 亦不會因載入模型而自動保存。
- 保留手動模型 ID 模式，處理供應商沒有模型清單、模型清單權限受限或瀏覽器 CORS 阻擋的情況。
- App 版本 4.2.0，cache v26；IndexedDB schema 不變，毋須資料遷移。
- 驗證：72 項 Node 測試、14 項 Chromium 桌面／手機尺寸 E2E、typecheck 及 production build。

## v4.1.0 更新內容

- AI 帳單識別新增 Groq、DeepSeek、OpenRouter 及 NVIDIA API Key，原有 Google Gemini 選項改名為 Google AI Studio；OpenAI及自訂 OpenAI-compatible API 繼續保留。
- 每個供應商使用獨立 API Key、官方固定 API endpoint 及使用者自行輸入的模型 ID；切換供應商不會將 Key 寫入 IndexedDB 或備份。
- OpenAI、Google AI Studio 及 OpenRouter 可上載相片或 PDF；Groq、DeepSeek、NVIDIA 及自訂相容服務在 FuelMate 只接受相片，並須選用支援圖片的模型。
- 內置供應商 endpoint 不接受設定或匯入資料覆寫，避免 API Key 被錯誤傳送到非官方網址；只有自訂 OpenAI-compatible API 可以輸入 HTTPS Base URL。
- App 版本 4.1.0，cache v25；IndexedDB schema 不變，毋須資料遷移。
- 驗證：70 項 Node 測試、14 項 Chromium 桌面／手機尺寸 E2E、typecheck 及 production build 通過。

## v4.0.0 更新內容

- 新增可關閉的 AI 帳單識別：車務表單可選擇 JPG、PNG、WebP 或 PDF，識別結果必須經使用者逐項核對後才儲存。
- 支援 OpenAI、Google Gemini 及自訂 OpenAI-compatible API；使用者自行輸入 API Key、模型 ID，並可測試連接。
- 完全無後端：帳單由裝置直接傳送到所選供應商。API Key 預設只留到分頁關閉；選擇「記住於此裝置」才保存在此瀏覽器。
- API Key 不寫入 IndexedDB、JSON 備份、匯出檔、程式碼或 Git；匯入備份後 AI 功能一律重新關閉，避免外部請求被備份自動啟用。
- AI 區分 invoice、receipt、quote、已完成及建議項目；報價單不預選任何完成項目，模糊欄位留待使用者確認。
- 每張帳單只建立一筆開支，明細、稅項及 invoice metadata 附於同一記錄，避免總額與各項目重複計算；檔案 SHA-256 及 invoice 編號用作重複提示。
- 只保存帳單檔名及抽取結果，不保存原相片/PDF；保留手動輸入、原有資料 schema、Apple Fluid、iOS 原生及 iOS 玻璃風格。
- App 版本 4.0.0，cache v24；AI runtime 納入整套 SHA-256 離線資源驗證。AI 識別本身需要網絡，已儲存資料仍可離線使用。
- 驗證：69 項 Node 測試、14 項 Chromium 桌面／手機尺寸 E2E、typecheck 及 production build 通過；AI E2E 使用模擬供應商回應，未使用或保存真實 API Key。真實供應商仍受個別模型、帳戶權限、費用及 CORS 設定影響。

## v3.9.0 更新內容

- 設定 → 外觀新增「iOS 原生」及「iOS 玻璃」，各支援淺色、深色及跟隨系統；保留 Apple Fluid 三個原有選項及預設值。
- iOS 風格使用系統灰底、藍色操作、分組總覽、清晰實色記錄及表單；玻璃版增加浮動磨砂導覽列及半透明表單外層。
- 新增「減少透明度」，並尊重系統減少透明度偏好；不支援背景模糊時使用實色底。
- 風格選擇儲存至 IndexedDB，重新開啟及備份匯入保留；不變更記錄 schema 或移除現有功能。
- 保留原有六個功能導覽入口及完整資料欄位，使用現有圖示；本次新增 PWA 外觀，並非轉換為 SwiftUI App。
- App 版本 3.9.0，cache v23；新增樣式納入整套 SHA-256 離線資源驗證。
- 驗證：65 項 Node 測試、12 項 Chromium 桌面／手機尺寸 E2E、typecheck 及 build 通過；已檢查切換、重開保留設定、系統日夜、入油備註及離線重開。尚未做 iPhone Safari 實機測試。

## v3.8.3 更新內容

- 記錄寫入使用佇列，避免並行儲存覆蓋記憶體；失敗不阻塞下一筆。
- 入油編輯保留備註、車輛及既有附加欄位，新增備註輸入及防重複提交。
- Production build產生SHA-256資源清單，Service Worker驗證整套資源後才完成安裝。
- 已啟用版本只讀自己的快取，不單獨刷新首頁；缺失資源不回傳HTML或其他版本資源。
- 新版本等待所有舊視窗關閉後才啟用，提示先儲存再關閉重開，避免中途接管表單。首次由舊版更新時仍受舊Service Worker行為影響。
- IndexedDB schema不變；App版本3.8.3，cache v22。

> v3.8.2 fixes local dates, import preview safety, atomic log writes, database startup failures and cache isolation.

## v3.8.2 更新內容

- 日期及月度圖表使用本地年月日，修正Adelaide時區顯示昨日或上月的問題；提醒既有穩定ID不變。
- 匯入設定驗證單位、語言、胎壓單位及安全幣別文字，預覽檔名及設定統一HTML escape；保留舊有幣別代碼。
- 新增、編輯及刪除記錄連同車輛里程使用單一IndexedDB transaction，成功後才更新記憶體及快取。
- 資料庫載入失敗會正確reject並關閉連線，提供不清除資料的重新載入入口；處理blocked及versionchange。
- Service Worker僅清除FuelMate舊版cache，不刪除同網域其他App快取；cache升級至fuelmate-cache-v21。
- 新增本地時區、匯入驗證、寫入失敗及初始化失敗回歸測試。IndexedDB schema及資料格式不變，毋須migration。
- 驗證：59項Node測試通過，typecheck及production build通過；未執行瀏覽器E2E或iPhone實機驗證。

一個 **本地優先（Local-first）** 的車輛油耗與開支管理 PWA：所有資料預設只存喺你部機（IndexedDB），支援離線使用、備份/匯入、提醒中心、輪胎更換/換位追蹤同埋基礎分析。

## v3.8.1 更新內容

- 將Apple Fluid外觀選擇由設定頁頂部移至「App Settings」區塊最底部，排列在語言設定之後。
- 深色、淺色及跟隨系統的功能、即時預覽、保存資料及舊資料相容邏輯維持不變。
- 新增設定頁排序測試；App、package、設定頁、About及README同步升級至v3.8.1，Service Worker cache更新至`fuelmate-cache-v20`。

## v3.8.0 更新內容

- 設定頁新增「Apple Fluid 淺色」、「Apple Fluid 深色」及「Apple Fluid 跟隨系統」三個外觀選項，附有即時預覽及清晰選取狀態。
- 跟隨系統模式會監聽裝置日夜外觀變更並即時切換；固定深色／淺色模式不再受瀏覽器`prefers-color-scheme`覆蓋。
- 全App加入Apple Fluid材質系統：半透明卡片、背景模糊、柔和光影、平台系統字體、即時按壓回饋及一致的流體底部導覽。
- 加入`prefers-reduced-motion`及`prefers-reduced-transparency`支援；使用者要求減少動態或透明效果時會自動使用更穩定、清晰的替代顯示。
- 外觀設定保存於原有IndexedDB settings，並以安全的localStorage鏡像避免啟動時閃現錯誤主題；舊資料缺少外觀欄位時會自動使用「跟隨系統」，毋須schema migration。
- 新增深／淺／系統切換、重新載入後保存及主題結構測試；App、package、設定頁、About及README同步升級至v3.8.0，Service Worker cache更新至`fuelmate-cache-v19`。

## v3.7.0 更新內容

- 提醒中心新增「所有車輛」檢視，集中顯示全部車輛的輪胎、保養、證件及備份提醒，並在每張提醒卡清楚標示所屬車輛。
- 新增橫向車輛選擇器，可切換至單一車輛檢視；摘要、待辦／已延後／已完成、分類及緊急程度篩選會同步套用至所選範圍。
- 修正證件及定期保養提醒暗中使用目前車輛記錄的問題；每項提醒現會以自己的`vehicleId`查詢，避免多車資料互相混合。
- 從多車提醒開啟來源記錄或設定時，App會先安全切換至該提醒所屬車輛，確保編輯結果寫入正確車輛。
- 備份提醒維持全資料共用並在多車檢視自動去重；原有Snooze／Done ID、`settings.reminderCenter`及IndexedDB schema完全保留，毋須migration。
- 新增多車聚合、單車隔離、跨車證件查詢及車輛選擇器測試；App、package、設定頁、About及README同步升級至v3.7.0，Service Worker cache更新至`fuelmate-cache-v18`。

## v3.6.3 更新內容

- 新版本及離線提示改為按`safe-area-inset-top`定位，避開iPhone狀態列、Dynamic Island及瀏海範圍。
- 提示層保留最高顯示層級及`pointer-events`，確保「重新載入」按鈕可正常點擊。
- 提示最大闊度按手機畫面縮窄，避免左右貼邊或小屏幕內容被裁切。
- 新增安全區及互動狀態測試；App、package、設定頁、About及README同步升級至v3.6.3，Service Worker cache更新至`fuelmate-cache-v17`。
- IndexedDB schema及現有資料格式維持不變，毋須migration。

## v3.6.2 更新內容

- 修正手機版提醒中心E2E測試同時匹配「已完成」分頁及批量完成按鈕，導致GitHub Actions停止部署的問題。
- 提醒中心狀態分頁加入穩定`data-testid`，測試不再依賴可能重複的翻譯文字。
- App、package、設定頁、About及README同步升級至v3.6.2；Service Worker cache更新至`fuelmate-cache-v16`。
- IndexedDB schema及現有資料格式維持不變，毋須migration。

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
- 加油記錄：單價/金額/升數互算、Full/Partial 完整週期、漏記加油中斷與補錄、地點/備註
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
  - 加油：輸入其中兩個（單價/金額/升數）→ 自動算第三個 → 記下實際總里數；如中間有漏記，於漏記後第一筆紀錄勾選「中間有漏記加油」→ 儲存
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
- 加油：單價/金額/升數互算、Full/Partial 完整週期、漏記標記及補錄後恢復計算
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
