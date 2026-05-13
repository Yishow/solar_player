# 13 Playback Settings 播放設定頁

## 頁面目的

提供管理者設定輪播頁面、播放順序、每頁停留時間、自動播放、排程、閒置模式與裝置顯示設定。

## 功能需求

### 輪播流程預覽

- 顯示目前輪播順序：Overview → Solar → Factory Circuit → Images → Sustainability。
- 每頁以縮圖卡呈現。
- 顯示頁碼與英文名稱。

### 設定區塊

1. **Rotation Order**
   - 拖曳排序頁面。
   - 可新增頁面。
   - 可啟用/停用單頁。

2. **Per-page Duration**
   - 每頁秒數可設定。
   - 使用 +/- 控制。
   - 單位為秒。

3. **Playback Control**
   - Autoplay 開關。
   - Loop Mode 開關。
   - Start Page 下拉選單。
   - Transition Type 下拉選單。
   - Transition Speed 下拉選單。

4. **Daily Schedule**
   - Enable Schedule 開關。
   - Start Time / End Time。
   - Repeat weekdays。

5. **Display & Device Settings**
   - Idle Mode。
   - Idle Time。
   - Brightness。
   - Orientation。

## Design Tokens

```json
{
  "color.settings.primary": "#4F7A3F",
  "color.settings.panelBg": "#FFFFFF",
  "color.settings.inputBg": "#FBFAF6",
  "color.settings.disabled": "#D9D9D3",
  "font.size.settingsTitle": "66px",
  "font.size.sectionTitle": "24px",
  "layout.settingsCard.width": "365px",
  "layout.settingsCard.height": "440px",
  "component.toggle.width": "54px",
  "component.toggle.height": "30px",
  "component.input.height": "48px"
}
```

## 驗收條件

- 所有設定需可保存並影響播放行為。
- 拖曳排序後，Slideshow Preview 與實際播放順序同步。
- 排程啟用時，非播放時間需進入 idle mode。
