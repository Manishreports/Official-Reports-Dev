/* OFFICIAL REPORTS DEV - SMOOTH ACCORDION SIDEBAR 2.7 */
(() => {
  'use strict';

  function activatePage(button) {
    const pageId = button.dataset.p;
    const page = pageId ? document.getElementById(pageId) : null;
    if (!page) return;

    document.querySelectorAll('.page').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.nav').forEach(item => item.classList.remove('active'));
    page.classList.add('active');
    button.classList.add('active');

    const title = document.getElementById('title');
    const sub = document.getElementById('sub');
    if (title) title.textContent = button.textContent.trim();
    if (sub) sub.textContent = 'HO reporting workspace';
    if (typeof window.refresh === 'function') window.refresh();
  }

  function bindNavButtons(root = document) {
    root.querySelectorAll('.nav').forEach(button => {
      if (button.dataset.navigationBound === '1') return;
      button.dataset.navigationBound = '1';
      button.addEventListener('click', () => activatePage(button));
    });
  }

  function setSectionOpen(section, open) {
    const title = section.querySelector(':scope > .nav-section-title');
    const items = section.querySelector(':scope > .nav-section-items');
    section.classList.toggle('open', open);
    if (title) title.setAttribute('aria-expanded', String(open));
    if (items) items.setAttribute('aria-hidden', String(!open));
  }

  function closeOtherSections(sidebar, current) {
    sidebar.querySelectorAll(':scope > .nav-section.open').forEach(section => {
      if (section !== current) setSectionOpen(section, false);
    });
  }

  function createSectionFromLabel(sidebar, label) {
    const section = document.createElement('div');
    section.className = 'nav-section';

    const title = document.createElement('button');
    title.type = 'button';
    title.className = 'nav-section-title';
    title.innerHTML = `<span>${label.textContent.trim()}</span><span class="nav-chevron" aria-hidden="true">⌄</span>`;
    title.setAttribute('aria-expanded', 'false');

    const items = document.createElement('div');
    items.className = 'nav-section-items';
    items.setAttribute('aria-hidden', 'true');

    let node = label.nextElementSibling;
    while (node && !node.classList.contains('label') && !node.classList.contains('nav-section')) {
      const next = node.nextElementSibling;
      if (node.classList.contains('nav')) items.appendChild(node);
      node = next;
    }

    label.replaceWith(section);
    section.append(title, items);

    title.addEventListener('click', event => {
      event.preventDefault();
      const shouldOpen = !section.classList.contains('open');
      closeOtherSections(sidebar, section);
      setSectionOpen(section, shouldOpen);
    });
  }

  function openActiveSection(sidebar) {
    const active = sidebar.querySelector('.nav.active');
    const section = active ? active.closest('.nav-section') : sidebar.querySelector('.nav-section');
    if (section) setSectionOpen(section, true);
  }

  function buildSidebarAccordion() {
    const sidebar = document.querySelector('.side');
    if (!sidebar) return;

    [...sidebar.querySelectorAll(':scope > .label')].forEach(label => createSectionFromLabel(sidebar, label));
    bindNavButtons(sidebar);
    openActiveSection(sidebar);
  }

  window.rebuildSidebarAccordion = buildSidebarAccordion;
  window.bindSidebarNavigation = bindNavButtons;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildSidebarAccordion, { once: true });
  } else {
    buildSidebarAccordion();
  }
})();
