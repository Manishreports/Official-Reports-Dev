# Official Reports Dev - UI Module 2.5

## Replace these files

- `index.html`
- `css/theme.css`
- `js/ui/navigation.js`
- `js/total-stock/total-stock.js`
- `js/total-stock/supply-module.js`

## Changes

- All table headings and data are center aligned.
- Table rows stay compact and fixed-height; long text does not increase row height.
- Long text and extra columns are available through left-right horizontal scrolling.
- Manual Material Add matches the compact Core Pending table style.
- Delete/Action buttons no longer increase row height.
- Sidebar now shows only section headings by default; click or hover reveals options.
- Only one clicked sidebar section remains expanded.
- Supply Report is a separate top-level sidebar section, outside Total Stock Working.
- Separate Supply section order: Allowed Supply Locations, Supply Report, Supply Upload.
- Total Stock Upload button binding is repaired and made defensive.

## After upload

Commit the files, wait for GitHub Pages deployment, then press `Ctrl + Shift + R`.
