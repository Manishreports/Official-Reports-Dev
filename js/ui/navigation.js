/* OFFICIAL REPORTS DEV - ACCORDION SIDEBAR 2.5 */
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
    if (typeof refresh === 'function') refresh();
  }

  function bindNavButtons(root = document) {
    root.querySelectorAll('.nav').forEach(button => {
      if (button.dataset.navigationBound === '1') return;
      button.dataset.navigationBound = '1';
      button.addEventListener('click', () => activatePage(button));
    });
  }

  function buildSidebarAccordion() {
    const sidebar = document.querySelector('.side');
    if (!sidebar) return;

    sidebar.querySelectorAll('.nav-section').forEach(section => {
      const title = section.querySelector(':scope > .nav-section-title');
      const items = section.querySelector(':scope > .nav-section-items');
      if (!title || !items) return;
      while (items.firstChild) section.parentNode.insertBefore(items.firstChild, section);
      section.remove();
    });

    const labels = [...sidebar.querySelectorAll(':scope > .label')];
    labels.forEach(label => {
      const section = document.createElement('div');
      section.className = 'nav-section';

      const title = document.createElement('button');
      title.type = 'button';
      title.className = 'nav-section-title';
      title.innerHTML = `<span>${label.textContent.trim()}</span><span class="nav-chevron">›</span>`;
      title.setAttribute('aria-expanded', 'false');

      const items = document.createElement('div');
      items.className = 'nav-section-items';

      let node = label.nextElementSibling;
      while (node && !node.classList.contains('label')) {
        const next = node.nextElementSibling;
        if (node.classList.contains('nav')) items.appendChild(node);
        node = next;
      }

      label.replaceWith(section);
      section.append(title, items);

      title.addEventListener('click', () => {
        const shouldOpen = !section.classList.contains('open');
        sidebar.querySelectorAll('.nav-section.open').forEach(other => {
          if (other !== section) {
            other.classList.remove('open');
            const otherTitle = other.querySelector(':scope > .nav-section-title');
            if (otherTitle) otherTitle.setAttribute('aria-expanded', 'false');
          }
        });
        section.classList.toggle('open', shouldOpen);
        title.setAttribute('aria-expanded', String(shouldOpen));
      });
    });

    bindNavButtons(sidebar);
  }

  window.rebuildSidebarAccordion = buildSidebarAccordion;
  window.bindSidebarNavigation = bindNavButtons;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildSidebarAccordion, { once: true });
  } else {
    buildSidebarAccordion();
  }
})();
