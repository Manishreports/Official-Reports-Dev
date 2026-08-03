/* Official Reports V3.0 - resilient Excel engine loader */
const ExcelLibrary = (() => {
  let loadingPromise = null;
  const sources = [
    'lib/xlsx.bundle.js',
    'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js',
    'https://unpkg.com/xlsx-js-style@1.2.0/dist/xlsx.bundle.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => typeof XLSX !== 'undefined' ? resolve() : reject(new Error('Excel library loaded but XLSX missing'));
      script.onerror = () => reject(new Error(`Unable to load ${src}`));
      document.head.appendChild(script);
    });
  }

  async function ensure() {
    if (typeof XLSX !== 'undefined') return XLSX;
    if (loadingPromise) return loadingPromise;
    loadingPromise = (async () => {
      for (const source of sources) {
        try {
          await loadScript(source);
          if (typeof XLSX !== 'undefined') return XLSX;
        } catch (error) {
          console.warn(error.message);
        }
      }
      throw new Error('Excel engine load nahi hui. Internet connection check karke page refresh karein.');
    })();
    try { return await loadingPromise; }
    catch (error) { loadingPromise = null; throw error; }
  }

  return { ensure };
})();
