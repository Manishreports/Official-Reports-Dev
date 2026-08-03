# Official Reports V3.0

Development build rebuilt from the last clean V2.2 base, with Total Stock 2.1 and Supply 2.4 restored.

## V3.0 fixes

- Resilient Excel engine loader with multiple CDN fallbacks.
- Upload handlers retained for Plan, Raw Stock, Total Stock and Supply.
- Sheet selection and temporary/permanent column mapping retained.
- Header cleaning now maps back to the original Excel header, including spaces and line breaks.
- Corrupted Total Stock source replaced with the clean module.
- ERP-style dark sidebar with smooth click accordion and collapse control.
- Supply Report remains an independent sidebar section.
- One shared professional table style across the application.
- Center-aligned headers and data, compact fixed rows, content-sized editable inputs.
- Horizontal scrolling for long text or wide reports.
- No oversized Manual Material Action rows.
- Existing Core Pending, HO Stock, Planning, Total Stock and Supply calculations retained.

## Deployment

Upload the contents of this folder to the root of `Official-Reports-Dev`.
Do not upload the outer folder or ZIP itself.

After GitHub Pages finishes deployment, press `Ctrl + Shift + R` once.

## Important

The Excel library is loaded from free public CDNs. The application shows `Excel Engine Offline` if all Excel-library sources are blocked by the network.
