/* Official Reports V3.0 - ERP sidebar navigation */
(() => {
  'use strict';
  const sidebar = document.querySelector('.side');
  if (!sidebar) return;
  const brand = sidebar.querySelector('.brand');
  if (brand && !brand.querySelector('.sidebar-toggle')) {
    const toggle = document.createElement('button');
    toggle.type = 'button'; toggle.className = 'sidebar-toggle'; toggle.title = 'Collapse sidebar'; toggle.textContent = '≡';
    toggle.addEventListener('click', () => { sidebar.classList.toggle('collapsed'); localStorage.setItem('official_reports_sidebar_collapsed', sidebar.classList.contains('collapsed') ? '1' : '0'); });
    brand.appendChild(toggle);
  }
  if (localStorage.getItem('official_reports_sidebar_collapsed') === '1') sidebar.classList.add('collapsed');

  function activatePage(button) {
    const id = button.dataset.p;
    const page = id && document.getElementById(id);
    if (!page) return;
    document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.nav').forEach(x => x.classList.remove('active'));
    page.classList.add('active');
    button.classList.add('active');
    const title = document.getElementById('title');
    const sub = document.getElementById('sub');
    if (title) title.textContent = button.textContent.trim();
    if (sub) sub.textContent = 'Official Reports workspace';
    const section = button.closest('.nav-section');
    if (section) openSection(section);
    const main = document.querySelector('.main');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
    if (typeof window.refresh === 'function') window.refresh();
  }

  function bindButtons(root = sidebar) {
    root.querySelectorAll('.nav').forEach(button => {
      if (button.dataset.v3Bound) return;
      button.dataset.v3Bound = '1';
      button.addEventListener('click', () => activatePage(button));
    });
  }

  function setOpen(section, open) {
    const body = section.querySelector(':scope > .nav-section-items');
    const title = section.querySelector(':scope > .nav-section-title');
    section.classList.toggle('open', open);
    if (title) title.setAttribute('aria-expanded', String(open));
    if (body) body.style.maxHeight = open ? `${body.scrollHeight}px` : '0px';
  }

  function openSection(section) {
    sidebar.querySelectorAll(':scope > .nav-section').forEach(s => setOpen(s, s === section));
  }

  function makeSection(label) {
    if (!label || label.closest('.nav-section')) return;
    const section = document.createElement('div');
    section.className = 'nav-section';
    const title = document.createElement('button');
    title.type = 'button';
    title.className = 'nav-section-title';
    title.innerHTML = `<span class="section-dot"></span><span class="section-name">${label.textContent.trim()}</span><span class="nav-chevron">›</span>`;
    title.setAttribute('aria-expanded', 'false');
    const items = document.createElement('div');
    items.className = 'nav-section-items';
    let next = label.nextElementSibling;
    while (next && !next.classList.contains('label') && !next.classList.contains('nav-section')) {
      const current = next;
      next = next.nextElementSibling;
      if (current.classList.contains('nav')) items.appendChild(current);
    }
    label.replaceWith(section);
    section.append(title, items);
    title.addEventListener('click', () => setOpen(section, !section.classList.contains('open')));
  }

  function rebuild() {
    [...sidebar.querySelectorAll(':scope > .label')].forEach(makeSection);
    bindButtons();
    const active = sidebar.querySelector('.nav.active');
    const activeSection = active && active.closest('.nav-section');
    if (activeSection) openSection(activeSection);
    else {
      const first = sidebar.querySelector('.nav-section');
      if (first) setOpen(first, true);
    }
  }

  const observer = new MutationObserver(() => requestAnimationFrame(rebuild));
  observer.observe(sidebar, { childList: true });
  window.rebuildSidebarAccordion = rebuild;
  window.bindSidebarNavigation = bindButtons;
  rebuild();
})();
