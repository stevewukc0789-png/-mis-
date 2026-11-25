# 無界塾 MIS 問卷自動填寫

這是一個適用於 [Tampermonkey](https://www.tampermonkey.net/) (串改猴 / 油猴) 的使用者脚本，可自動將無界塾 MIS 問卷全部勾選「非常同意」。

## 直接安裝到串改猴

> **推薦方式**：點擊下方連結，會自動呼叫 Tampermonkey 安裝視窗。

### [➡️ 點此安裝脚本](https://raw.githubusercontent.com/stevewukc0789-png/-mis-/main/mis-auto-fill.user.js)

若點擊後沒有出現安裝視窗，請確認已安裝 [Tampermonkey](https://www.tampermonkey.net/)。

---

## 手動安裝步驟

1. 安裝瀏覽器擴充：[Tampermonkey](https://www.tampermonkey.net/)
2. 點擊上方的「點此安裝脚本」連結
3. 在彈出的視窗中按「安裝」
4. 開啟 [MIS 網站](https://mis.btsflip.org/)，點開任一份問卷
5. 畫面右下角會出現蓋色按鈕：**⚡ 一鍵全選非常同意**
6. 點一下就會開始自動填寫

## 功能特點

- 自動偵測並等待「正在存檔」狀態，避免重複點擊導致卡死
- 支援同源 iframe 內的問卷
- 可隨時按按鈕停止
- 填寫完成後會提示確認最後一題並填寫質性回饋

## 使用說明

1. 先點開一份問卷，確認題目已顯示
2. 點擊右下角的蓋色按鈕開始
3. 執行中按鈕會變紅並顯示進度，可點擊停止
4. 完成後請棄必確認最後一題，並手動填寫下方質性回饋與學生自評

## 注意事項

- 僅适用於 `https://mis.btsflip.org/`
- 建議在穩定網路下使用
- 若出現逾時，請重新裝載頁面再試一次

---

Made by Stevewung
