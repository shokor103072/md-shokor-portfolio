const root = document.documentElement;
const themeButtons = [...document.querySelectorAll('.theme-switch')];
const metaTheme = document.querySelector('meta[name="theme-color"]');

function applyTheme(theme) {
  const dark = theme === 'dark';
  root.classList.toggle('dark', dark);
  themeButtons.forEach((button) => {
    button.classList.toggle('is-dark', dark);
    button.classList.toggle('is-light', !dark);
    button.setAttribute('aria-checked', String(dark));
  });
  if (metaTheme) metaTheme.setAttribute('content', dark ? '#121615' : '#fbfaf7');
}

applyTheme(localStorage.getItem('portfolio-theme') || 'light');
themeButtons.forEach((button) => button.addEventListener('click', () => {
  const next = root.classList.contains('dark') ? 'light' : 'dark';
  localStorage.setItem('portfolio-theme', next);
  applyTheme(next);
}));

const desktopHeader = document.querySelector('.site-header');
if (desktopHeader) addEventListener('scroll', () => desktopHeader.classList.toggle('scrolled', scrollY > 8), { passive: true });

document.querySelectorAll('#year,.current-year').forEach((node) => { node.textContent = new Date().getFullYear(); });

const moreButton = document.querySelector('.more-menu-button');
const moreMenu = document.querySelector('.mobile-more-menu');
if (moreButton && moreMenu) {
  const closeMore = () => {
    moreMenu.hidden = true;
    moreButton.setAttribute('aria-expanded', 'false');
  };
  moreButton.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = moreMenu.hidden;
    moreMenu.hidden = !willOpen;
    moreButton.setAttribute('aria-expanded', String(willOpen));
  });
  document.addEventListener('click', (event) => {
    if (!moreMenu.hidden && !moreMenu.contains(event.target)) closeMore();
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMore(); });
}

document.querySelector('.news-more-btn')?.addEventListener('click', () => { window.location.href = '/md-shokor-portfolio/news/'; });

const searchInput = document.querySelector('#publication-search');
const publicationEntries = [...document.querySelectorAll('.publication-entry')];
const publicationYears = [...document.querySelectorAll('.publication-year')];
const filterButtons = [...document.querySelectorAll('[data-pub-filter]')];
let publicationFilter = 'all';

function updatePublicationResults() {
  const query = (searchInput?.value || '').trim().toLowerCase();
  let visibleCount = 0;
  publicationEntries.forEach((entry) => {
    const typeMatch = publicationFilter === 'all' || entry.dataset.pubType === publicationFilter;
    const searchMatch = !query || entry.textContent.toLowerCase().includes(query);
    const visible = typeMatch && searchMatch;
    entry.classList.toggle('is-filtered', !visible);
    if (visible) visibleCount += 1;
  });
  publicationYears.forEach((group) => {
    group.classList.toggle('is-empty', !group.querySelector('.publication-entry:not(.is-filtered)'));
  });
  const empty = document.querySelector('.empty-search');
  if (empty) empty.hidden = visibleCount !== 0;
}

searchInput?.addEventListener('input', updatePublicationResults);
filterButtons.forEach((button) => button.addEventListener('click', () => {
  publicationFilter = button.dataset.pubFilter;
  filterButtons.forEach((candidate) => candidate.classList.toggle('active', candidate === button));
  updatePublicationResults();
}));
