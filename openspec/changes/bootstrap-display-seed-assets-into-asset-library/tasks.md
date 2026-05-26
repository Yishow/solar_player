## Tasks

- [x] Implement `Current display seed visuals are bootstrapped into managed asset library` with a `Seed Asset Manifest` covering current display backgrounds, main-stage images, card icons, flow/node icons, thumbnails, and ornament fallback visuals.
- [x] Implement `display-seed-asset-library-bootstrap` service that copies or registers manifest files into the managed asset library.
- [x] Implement `Seed asset bootstrap is idempotent and non-destructive` with `Idempotent Bootstrap` behavior so repeated seed/startup runs do not create duplicate catalog rows or overwrite operator uploads.
- [x] Implement `File Ownership` so bootstrapped assets resolve through `/uploads/images/<filename>` and existing health checks.
- [x] Implement `Seed Asset Labeling` in Asset Library metadata display.
- [x] Add server tests for bootstrap row creation, file availability, metadata, and idempotency.
- [x] Add web tests for seed asset visibility and category filtering in Asset Library.
- [x] Run affected server and web tests.
