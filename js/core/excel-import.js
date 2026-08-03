const ExcelImport = (() => {
  const STORAGE_KEY = 'official_reports_dev_column_mappings_v1';

  function cleanHeader(value) {
    return N(value).replace(/[\r\n]+/g, ' ');
  }

  function headerKey(value) {
    return cleanHeader(value).toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function readSavedMappings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  function saveMapping(profile, mapping) {
    const all = readSavedMappings();
    all[profile] = mapping;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  function getSavedMapping(profile) {
    return readSavedMappings()[profile] || {};
  }

  function readWorkbook(file, onProgress) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = event => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.max(5, Math.round((event.loaded / event.total) * 30)));
        }
      };
      reader.onerror = () => reject(new Error('File read nahi hui'));
      reader.onload = event => {
        try {
          resolve(XLSX.read(new Uint8Array(event.target.result), {
            type: 'array',
            cellDates: false,
            cellFormula: false,
            cellText: false,
            cellStyles: true
          }));
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function sheetInfo(workbook, sheetName) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false
    });
    const headers = (rows[0] || []).map(cleanHeader);
    return {
      name: sheetName,
      rowCount: Math.max(rows.length - 1, 0),
      headers,
      sampleRows: rows.slice(1, 4)
    };
  }

  function chooseSheet(workbook, filename) {
    return new Promise((resolve, reject) => {
      const infos = workbook.SheetNames.map(name => sheetInfo(workbook, name));
      $('mTitle').textContent = `Select Excel Sheet — ${filename}`;
      $('mBody').innerHTML = '';

      const intro = document.createElement('p');
      intro.className = 'modal-help';
      intro.textContent = 'Is upload ke liye kaunsi sheet use karni hai, select karein.';
      $('mBody').appendChild(intro);

      const list = document.createElement('div');
      list.className = 'sheet-choice-list';

      infos.forEach((info, index) => {
        const label = document.createElement('label');
        label.className = 'sheet-choice';
        const preview = info.headers.filter(Boolean).slice(0, 6).join(', ') || 'No headers';
        label.innerHTML = `
          <input type="radio" name="sheetChoice" value="${index}" ${index === 0 ? 'checked' : ''}>
          <span class="sheet-choice-body">
            <strong>${escapeHtml(info.name)}</strong>
            <small>${info.rowCount.toLocaleString('en-IN')} data rows</small>
            <em>${escapeHtml(preview)}</em>
          </span>`;
        list.appendChild(label);
      });

      $('mBody').appendChild(list);
      $('mSave').textContent = 'Load Selected Sheet';
      $('mSave').onclick = () => {
        const selected = document.querySelector('input[name="sheetChoice"]:checked');
        if (!selected) {
          toast('Sheet select karein');
          return;
        }
        const info = infos[Number(selected.value)];
        closeM();
        $('mSave').textContent = 'Save';
        resolve(info.name);
      };
      $('mCancel').onclick = () => {
        closeM();
        $('mSave').textContent = 'Save';
        reject(new Error('Upload cancelled'));
      };
      $('mX').onclick = $('mCancel').onclick;
      openM();
    });
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function automaticMapping(requiredColumns, sourceHeaders, savedMapping) {
    const sourceByKey = new Map(sourceHeaders.map(header => [headerKey(header), header]));
    const mapping = {};
    const missing = [];

    requiredColumns.forEach(required => {
      const saved = savedMapping[required];
      if (saved && sourceHeaders.includes(saved)) {
        mapping[required] = saved;
        return;
      }
      const exact = sourceByKey.get(headerKey(required));
      if (exact) {
        mapping[required] = exact;
      } else {
        missing.push(required);
      }
    });

    return { mapping, missing };
  }

  function askColumnMapping(profile, requiredColumns, sourceHeaders, currentMapping, missing) {
    return new Promise((resolve, reject) => {
      $('mTitle').textContent = 'Column Mapping Required';
      $('mBody').innerHTML = '';

      const help = document.createElement('p');
      help.className = 'modal-help';
      help.textContent = 'Excel dekhkar har required field ke saamne sahi Excel column select karein.';
      $('mBody').appendChild(help);

      const grid = document.createElement('div');
      grid.className = 'mapping-grid';

      requiredColumns.forEach(required => {
        const row = document.createElement('div');
        row.className = `mapping-row ${missing.includes(required) ? 'mapping-missing' : ''}`;
        const label = document.createElement('label');
        label.textContent = required;
        const select = document.createElement('select');
        select.dataset.required = required;

        const blank = document.createElement('option');
        blank.value = '';
        blank.textContent = 'Select Excel Column';
        select.appendChild(blank);

        sourceHeaders.forEach(header => {
          const option = document.createElement('option');
          option.value = header;
          option.textContent = header;
          if (currentMapping[required] === header) option.selected = true;
          select.appendChild(option);
        });

        row.append(label, select);
        grid.appendChild(row);
      });

      $('mBody').appendChild(grid);

      const remember = document.createElement('label');
      remember.className = 'remember-mapping';
      remember.innerHTML = '<input id="rememberColumnMapping" type="checkbox"> Is mapping ko permanently save karna hai';
      $('mBody').appendChild(remember);

      $('mSave').textContent = 'Use Mapping';
      $('mSave').onclick = () => {
        const mapping = {};
        let incomplete = false;
        grid.querySelectorAll('select').forEach(select => {
          mapping[select.dataset.required] = select.value;
          if (!select.value) incomplete = true;
        });
        if (incomplete) {
          toast('Sabhi required columns map karein');
          return;
        }
        if ($('rememberColumnMapping').checked) saveMapping(profile, mapping);
        closeM();
        $('mSave').textContent = 'Save';
        resolve(mapping);
      };
      $('mCancel').onclick = () => {
        closeM();
        $('mSave').textContent = 'Save';
        reject(new Error('Upload cancelled'));
      };
      $('mX').onclick = $('mCancel').onclick;
      openM();
    });
  }

  async function importMapped(file, profile, requiredColumns, onProgress) {
    await ExcelLibrary.ensure();
    const workbook = await readWorkbook(file, onProgress);
    const sheetName = await chooseSheet(workbook, file.name);
    const worksheet = workbook.Sheets[sheetName];
    const sourceRows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: true });
    const originalHeaders = sourceRows.length ? Object.keys(sourceRows[0]).filter(key => key !== '__rowNum__') : [];
    const originalByCleanHeader = new Map();
    originalHeaders.forEach(original => {
      const cleaned = cleanHeader(original);
      if (cleaned && !originalByCleanHeader.has(cleaned)) originalByCleanHeader.set(cleaned, original);
    });
    const sourceHeaders = [...originalByCleanHeader.keys()];

    if (!sourceRows.length || !sourceHeaders.length) {
      throw new Error('Selected sheet empty hai');
    }

    const saved = getSavedMapping(profile);
    const detected = automaticMapping(requiredColumns, sourceHeaders, saved);
    let mapping = detected.mapping;

    if (detected.missing.length) {
      mapping = await askColumnMapping(
        profile,
        requiredColumns,
        sourceHeaders,
        mapping,
        detected.missing
      );
    }

    const rows = sourceRows.map(sourceRow => {
      const output = {};
      requiredColumns.forEach(required => {
        const originalHeader = originalByCleanHeader.get(mapping[required]) || mapping[required];
        output[required] = sourceRow[originalHeader] ?? '';
      });
      return output;
    });

    return { rows, sheetName, mapping, workbook };
  }

  async function importAnySheet(file, onProgress) {
    const workbook = await readWorkbook(file, onProgress);
    const sheetName = await chooseSheet(workbook, file.name);
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: true });
    const headers = rows.length ? Object.keys(rows[0]).map(cleanHeader) : [];
    return { rows, headers, sheetName };
  }

  return { importMapped, importAnySheet };
})();
