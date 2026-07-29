# Official Reports Dev UI Module 2.6

Replace these files in `Official-Reports-Dev`:

- `index.html`
- `css/theme.css`
- `js/ui/navigation.js`
- `js/ui/table-layout.js` (new file)
- `js/total-stock/total-stock.js`
- `js/total-stock/supply-module.js`

## Fixed in 2.6

- Sidebar is a real accordion: initially only WORKSPACE, CORE PENDING, HO STOCK, TOTAL STOCK WORKING and SUPPLY REPORT headings are visible.
- Existing accordion groups are no longer destroyed when Supply navigation is inserted.
- SUPPLY REPORT is outside TOTAL STOCK WORKING and contains:
  - Allowed Supply Locations
  - Supply Report
  - Supply Upload
- Manual Material Add no longer stretches Plant, Storage Location and Material columns across the page.
- Editable table inputs resize from their actual value/header length.
- Rows stay compact; long values and extra columns use horizontal scrolling instead of increasing row height.
- All headings and cell data remain center aligned.
- Total Stock Upload fix from 2.5 is retained.

After commit and GitHub Pages deployment, perform a hard refresh (`Ctrl + Shift + R`).
