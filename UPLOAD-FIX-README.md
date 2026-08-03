# Official Reports V3.0.1 Upload Fix

Root cause fixed:
- `prog()` was missing, so Plan/Raw upload stopped before progress could start.
- `toast()`, `log()`, `openM()` and `closeM()` shared runtime functions were also missing.
- The Excel library was no longer loaded synchronously in `index.html`.

Changes:
- Added `js/core/ui-runtime.js`.
- Restored the xlsx-js-style script in `index.html`.
- Rebound Plan and Raw Stock uploads safely.
- Removed startup Excel preflight so the page does not wait on the network before use.
- Added visible runtime/upload error logging.

Deploy the complete extracted package to Official-Reports-Dev and hard refresh.
