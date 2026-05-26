# FHD Surface Split Guide

日期：2026-05-27

這份 guide 用來先切 scope，再開始碰 FHD 前端。

## Core Rule

先決定 `witness batch`，再決定 `surface family`。如果一個 diff 同時跨兩個高風險 family，就該 split 成 separate changes 或至少 separate evidence bundles。

## Surface Families

- `playback`
  - 1920x1080 review surfaces such as `/overview`, `/solar`, `/factory-circuit`, `/images`, `/sustainability`
- `management`
  - 管理與 settings surfaces，但仍在 FHD witness 集內
- `editor`
  - `/display-pages/editor` 與其 integrated workspace styling
- `launch audit`
  - launch readiness、manual witness rerun、verification-pack closeout

## How To Choose A Witness Batch

- 同一個視覺故事、同一套 protected attributes、同一個 reviewer 可以一起判讀，才放進同一個 witness batch。
- 如果一個 batch 同時需要改 playback composition 和 runtime/data rewiring，先拆。
- 如果一個 batch 同時需要改 shared chrome 和 editor workspace，先拆。

## Split Triggers

看到以下任一情況，就應該 split：

- 同一個 change 既碰 `playback` 又碰 `management`
- 既碰 `editor` workspace styling 又碰 runtime rewiring
- 既碰 geometry movement 又碰 launch audit closeout
- reviewer 無法一句話說出這個 batch 的 protected attributes

## Recommended Pattern

1. 選一個 `surface family`
2. 列出 `witness batch`
3. 建立 `evidence bundle`
4. 若有偏離，填 `exception ledger`
5. 列出 `verification pack`

## Anti-Patterns

- 用一個大 diff 混合 playback polishing、management density、editor restyle、launch audit
- 沒有 witness batch 只寫「frontend cleanup」
- 沒有 surface family 只寫「FHD related」
- 把 exception ledger 留在聊天室，不寫進 repo
