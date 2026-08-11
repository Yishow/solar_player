## 1. Persisted image hash metadata

- [ ] 1.1 新增 image asset content hash/identity migration與 serialization types。
- [ ] 1.2 upload/import/seed 在已持有 bytes 時一次計算並保存 SHA-256。
- [ ] 1.3 建立 bounded legacy hash backfill/dirty detection，不把 full-file hashing 放進 runtime read。
- [ ] 1.4 改 `readImagePlaylist()` 只使用 stored hash，新增 repeated-read I/O counter test。

## 2. Bulk duration validation

- [ ] 2.1 route/service 僅接受有限正整數 duration，invalid request 回 400。
- [ ] 2.2 更新既有 0→1 test 為 zero-mutation rejection，補 missing/string/fractional cases。

## 3. Transaction-safe image deletion

- [ ] 3.1 建立 uploads 外的 private tombstone/trash helper 與 startup cleanup。
- [ ] 3.2 delete flow 改為 stage file → DB transaction → final unlink；DB failure 時 restore。
- [ ] 3.3 加 file-stage、DB-delete、final-unlink failure injection tests並驗證 public URL 行為。

## 4. Verification

- [ ] 4.1 跑 images/image-playlist/display asset governance targeted tests與 offline asset hash tests。
- [ ] 4.2 跑 browser critical journey 涉及 Image Management/Images playback。
- [ ] 4.3 跑 root `pnpm test`、`pnpm build` 與 `pnpm verify`。
