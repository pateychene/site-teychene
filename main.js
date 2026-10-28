document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('nav.links');
  var scrim = document.querySelector('.nav-scrim');

  function closeMenu() {
    if (links) links.classList.remove('open');
    if (toggle) { toggle.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
    if (scrim) scrim.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function openMenu() {
    if (links) links.classList.add('open');
    if (toggle) { toggle.classList.add('is-open'); toggle.setAttribute('aria-expanded', 'true'); }
    if (scrim) scrim.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  if (toggle && links) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', function () {
      var isOpen = links.classList.contains('open');
      if (isOpen) { closeMenu(); } else { openMenu(); }
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
  }

  if (scrim) {
    scrim.addEventListener('click', closeMenu);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  // Si on repasse en affichage desktop, on referme proprement le menu mobile
  window.addEventListener('resize', function () {
    if (window.innerWidth > 860) closeMenu();
  });

  var year = document.querySelector('[data-year]');
  if (year) { year.textContent = new Date().getFullYear(); }

  // Carte : chargée seulement à la demande du visiteur (respect de la vie privée)
  document.querySelectorAll('[data-map-src]').forEach(function (box) {
    var btn = box.querySelector('[data-load-map]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = box.getAttribute('data-map-src');
      f.title = 'Carte : localisation du cabinet';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      box.innerHTML = '';
      box.appendChild(f);
    });
  });
});
