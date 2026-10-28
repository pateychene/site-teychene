#!/usr/bin/env node
/**
 * Génère le site statique (dossier dist/) à partir des fichiers de content/.
 * Aucune dépendance : seul Node.js est nécessaire. Lancé automatiquement par
 * l'hébergeur à chaque modification (commande : node build.js).
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const missing = new Set();

/* ---------- Lecture des contenus ---------- */
function load(name) {
  const file = path.join(ROOT, 'content', name + '.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`\n✖ Impossible de lire content/${name}.json : ${e.message}`);
    console.error('  (Une virgule ou un guillemet manquant ? Annulez la dernière modification.)\n');
    process.exit(1);
  }
}
const S = load('settings');
const HOME = load('accueil');
const ACTES = load('actes');
const MED = load('medecin');
const CONTACT = load('contact');

/* ---------- Petits outils ---------- */
const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const blank = (v) => v == null || String(v).trim() === '';
const todo = (label) => {
  missing.add(label);
  return `<span class="fill-me">[${esc(label)} à compléter]</span>`;
};
const or = (v, label) => (blank(v) ? todo(label) : esc(v));
const paras = (t) =>
  String(t == null ? '' : t)
    .split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('\n');
const rel = (p) => String(p || '').replace(/^\/+/, '');
const digits = (s) => String(s || '').replace(/\D/g, '');
const list = (a) => (Array.isArray(a) ? a : []);

/* ---------- Données dérivées ---------- */
const numero = blank(S.adresse_numero) ? null : String(S.adresse_numero).trim();
const rueLigne = (numero ? numero + ' ' : '') + S.adresse_rue;
const rueHtml = (numero ? esc(numero) : todo('numéro de rue')) + ' ' + esc(S.adresse_rue);
const villeLigne = `${S.code_postal} ${S.ville}`;
const adresseTexte = `${rueLigne}, ${villeLigne}`;
const tel = digits(S.telephone);
const telHtml = blank(S.telephone)
  ? todo('téléphone')
  : `<a href="tel:${tel}">${esc(S.telephone)}</a>`;
const emailHtml = blank(S.email)
  ? todo('adresse email')
  : `<a href="mailto:${esc(S.email)}">${esc(S.email)}</a>`;
const siteUrl = blank(S.site_url) ? '' : String(S.site_url).trim().replace(/\/+$/, '');
const hasForm = !blank(S.form_endpoint);
const mapQuery = encodeURIComponent(`${numero ? numero + ' ' : ''}${S.adresse_rue}, ${villeLigne}, France`);

/* ---------- Gabarit commun ---------- */
const NAV = [
  ['index.html', 'Accueil'],
  ['actes.html', 'Les actes'],
  ['a-propos.html', 'Le médecin'],
  ['contact.html', 'Contact'],
];

function img(src, alt, cls) {
  return `<img src="${esc(rel(src))}" alt="${esc(alt)}"${cls ? ` class="${cls}"` : ''} loading="lazy">`;
}

function arch(photo, alt, warnLabel) {
  if (!blank(photo)) return `<div class="arch-frame">${img(photo, alt)}</div>`;
  missing.add(warnLabel);
  return `<div class="arch-frame"><span class="monogram" aria-hidden="true">${esc(S.monogramme || '')}</span></div>`;
}

function jsonLd() {
  const o = {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    name: S.nom,
    description: HOME.seo_description,
    medicalSpecialty: 'Médecine esthétique',
    address: {
      '@type': 'PostalAddress',
      addressLocality: S.ville,
      postalCode: S.code_postal,
      addressCountry: 'FR',
    },
  };
  if (numero) o.address.streetAddress = rueLigne;
  else o.address.streetAddress = S.adresse_rue;
  if (!blank(S.telephone)) o.telephone = '+33' + tel.replace(/^0/, '');
  if (!blank(S.email)) o.email = S.email;
  if (siteUrl) o.url = siteUrl;
  if (!blank(S.logo)) o.image = (siteUrl ? siteUrl + '/' : '') + rel(S.logo);
  return `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
}

function layout({ file, title, desc, body, robots }) {
  const nav = NAV.map(
    ([href, label]) => `<a href="${href}"${href === file ? ' class="active" aria-current="page"' : ''}>${label}</a>`
  ).join('\n      ');
  const logoImg = blank(S.logo) ? '' : `<img class="logo-img" src="${esc(rel(S.logo))}" alt="">`;
  const canonical = siteUrl ? `<link rel="canonical" href="${siteUrl}/${file === 'index.html' ? '' : file}">` : '';
  const og = `<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:locale" content="fr_FR">${siteUrl ? `\n<meta property="og:url" content="${siteUrl}/${file === 'index.html' ? '' : file}">` : ''}`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#16242C">
${robots ? `<meta name="robots" content="${robots}">\n` : ''}${canonical}
${og}
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="css/style.css">
${file === 'index.html' ? jsonLd() : ''}
</head>
<body>

<a class="skip-link" href="#contenu">Aller au contenu</a>

<header class="site">
  <div class="container nav">
    <a href="index.html" class="logo">${logoImg}<span class="logo-text">${esc(S.nom)}<small>${esc(S.sous_titre)}</small></span></a>
    <nav class="links" id="menu-principal" aria-label="Navigation principale">
      ${nav}
    </nav>
    <button class="nav-toggle" aria-label="Ouvrir le menu" aria-controls="menu-principal"><span></span><span></span><span></span></button>
    <div class="nav-scrim"></div>
  </div>
</header>

<main id="contenu">
${body}
</main>

<footer class="site">
  <div class="container">
    <div class="footer-grid">
      <div>
        <h4>Cabinet</h4>
        <p>${esc(S.nom)} — Médecine esthétique<br>${rueHtml}, ${esc(villeLigne)}</p>
        <p>Consultations sur rendez-vous.</p>
      </div>
      <div>
        <h4>Navigation</h4>
        <ul>
          ${NAV.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join('\n          ')}
        </ul>
      </div>
      <div>
        <h4>Informations</h4>
        <ul>
          <li><a href="mentions-legales.html">Mentions légales</a></li>
          <li><a href="confidentialite.html">Confidentialité</a></li>
          <li>${telHtml}</li>
          <li>${emailHtml}</li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} ${esc(S.nom)} — Tous droits réservés</span>
      <span>Site à visée informative — ne remplace pas une consultation médicale</span>
    </div>
  </div>
</footer>

<script src="js/main.js"></script>
</body>
</html>
`;
}

/* ---------- Blocs réutilisables ---------- */
const banner = (b) => `<div class="page-banner">
  <div class="container">
    <span class="eyebrow">${esc(b.eyebrow)}</span>
    <h1>${esc(b.titre)}</h1>
    <p>${esc(b.texte)}</p>
  </div>
</div>`;

const card = (c, featured) => `<div class="card${featured ? ' featured' : ''}">
        ${blank(c.etiquette) ? '' : `<span class="num">${esc(c.etiquette)}</span>`}
        <h3>${esc(c.titre)}</h3>
        <p>${esc(c.texte)}</p>
      </div>`;

const notice = (n) => `<div class="notice">
      <h4>${esc(n.titre)}</h4>
      ${paras(n.texte)}
    </div>`;

const cta = (c, alt) => `<section${alt ? ' class="section-alt"' : ''}>
  <div class="container text-center">
    <h2>${esc(c.titre)}</h2>
    ${blank(c.texte) ? '' : `<p class="section-head center">${esc(c.texte)}</p>`}
    <a href="contact.html" class="btn btn-primary">${esc(c.bouton)}</a>
  </div>
</section>`;

/* ---------- Pages ---------- */
const pages = {};

pages['index.html'] = () => {
  const h = HOME.hero;
  return layout({
    file: 'index.html',
    title: HOME.seo_titre,
    desc: HOME.seo_description,
    body: `
<section class="hero">
  <div class="container grid">
    <div>
      <span class="eyebrow">${esc(h.eyebrow)}</span>
      <h1>${esc(h.titre)}</h1>
      <p class="lead">${esc(h.intro)}</p>
      <div class="cta-row">
        <a href="contact.html" class="btn btn-primary">${esc(h.bouton_principal)}</a>
        <a href="actes.html" class="btn btn-outline">${esc(h.bouton_secondaire)}</a>
      </div>
      <div class="meta-row">
        <div><strong>${esc(h.mention_1_titre)}</strong>${esc(h.mention_1_texte)}</div>
        <div><strong>${rueHtml}</strong>${esc(villeLigne)}</div>
        <div><strong>${blank(S.telephone) ? todo('téléphone') : esc(S.telephone)}</strong>${esc(S.horaires)}</div>
      </div>
    </div>
    ${arch(h.photo, S.nom, 'photo du médecin (page d\'accueil)')}
  </div>
</section>

<div class="trust-strip">
  <div class="container">
    ${list(HOME.bandeau).map((t) => `<span>${esc(t)}</span>`).join('\n    ')}
  </div>
</div>

<section>
  <div class="container">
    <div class="section-head">
      <span class="eyebrow">${esc(HOME.soins.eyebrow)}</span>
      <h2>${esc(HOME.soins.titre)}</h2>
      <p>${esc(HOME.soins.intro)}</p>
    </div>
    <div class="cards">
      ${list(HOME.soins.cartes).map((c) => card(c, c.mise_en_avant === true)).join('\n      ')}
    </div>
    <p class="mt-2"><a href="actes.html" class="btn btn-outline">${esc(HOME.soins.bouton)}</a></p>
  </div>
</section>

<section class="section-alt">
  <div class="container">
    <div class="section-head center">
      <span class="eyebrow">${esc(HOME.etapes.eyebrow)}</span>
      <h2>${esc(HOME.etapes.titre)}</h2>
    </div>
    <div class="process">
      ${list(HOME.etapes.items).map((e, i) => `<div class="step">
        <span class="idx">${i + 1}</span>
        <h3>${esc(e.titre)}</h3>
        <p>${esc(e.texte)}</p>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>

<section>
  <div class="container about-block">
    ${arch(HOME.medecin.photo, S.nom, 'photo du médecin (bloc « Le médecin » de l\'accueil)')}
    <div>
      <span class="eyebrow">${esc(HOME.medecin.eyebrow)}</span>
      <h2>${esc(HOME.medecin.titre)}</h2>
      ${paras(HOME.medecin.texte)}
      <a href="a-propos.html" class="btn btn-outline">${esc(HOME.medecin.bouton)}</a>
    </div>
  </div>
</section>

<section class="section-alt">
  <div class="container">
    ${notice(HOME.notice)}
  </div>
</section>

${cta(HOME.cta, false)}`,
  });
};

pages['actes.html'] = () =>
  layout({
    file: 'actes.html',
    title: ACTES.seo_titre,
    desc: ACTES.seo_description,
    body: `
${banner(ACTES.banniere)}

${list(ACTES.groupes).map((g, i) => `<section${i % 2 === 1 ? ' class="section-alt"' : ''}>
  <div class="container">
    <div class="section-head">
      <span class="eyebrow">${esc(g.eyebrow)}</span>
      <h2>${esc(g.titre)}</h2>
      <p>${esc(g.intro)}</p>
    </div>
    <div class="cards">
      ${list(g.cartes).map((c) => card(c, false)).join('\n      ')}
    </div>
  </div>
</section>`).join('\n\n')}

<section${list(ACTES.groupes).length % 2 === 1 ? ' class="section-alt"' : ''}>
  <div class="container">
    ${notice(ACTES.notice)}
  </div>
</section>

${cta(ACTES.cta, list(ACTES.groupes).length % 2 === 0)}`,
  });

pages['a-propos.html'] = () =>
  layout({
    file: 'a-propos.html',
    title: MED.seo_titre,
    desc: MED.seo_description,
    body: `
${banner(MED.banniere)}

<section>
  <div class="container about-block">
    ${arch(MED.parcours.photo, S.nom, 'photo du médecin (page « Le médecin »)')}
    <div>
      <span class="eyebrow">${esc(MED.parcours.eyebrow)}</span>
      <h2>${esc(MED.parcours.titre)}</h2>
      ${paras(MED.parcours.texte)}
    </div>
  </div>
</section>

<section class="section-alt">
  <div class="container">
    <div class="section-head center">
      <span class="eyebrow">${esc(MED.principes.eyebrow)}</span>
      <h2>${esc(MED.principes.titre)}</h2>
    </div>
    <div class="cards">
      ${list(MED.principes.cartes).map((c) => card(c, false)).join('\n      ')}
    </div>
  </div>
</section>

<section>
  <div class="container">
    <div class="notice">
      <h4>${esc(MED.infos_pro.titre)}</h4>
      <p>${esc(MED.infos_pro.texte)}<br>
      ${esc(S.ordre)}.<br>
      Numéro RPPS : ${or(S.rpps, 'numéro RPPS')}<br>
      Cabinet situé ${rueHtml}, ${esc(villeLigne)}.</p>
    </div>
  </div>
</section>

${cta(MED.cta, true)}`,
  });

pages['contact.html'] = () => {
  const formBlock = hasForm
    ? `<form class="contact-form" action="${esc(S.form_endpoint)}" method="POST">
        <h3>${esc(CONTACT.formulaire_titre)}</h3>
        ${blank(S.form_access_key) ? '' : `<input type="hidden" name="access_key" value="${esc(S.form_access_key)}">`}
        <input type="text" name="_gotcha" tabindex="-1" autocomplete="off" style="display:none" aria-hidden="true">
        <div class="field">
          <label for="nom">Nom et prénom</label>
          <input type="text" id="nom" name="nom" required autocomplete="name">
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required autocomplete="email">
        </div>
        <div class="field">
          <label for="telephone">Téléphone</label>
          <input type="tel" id="telephone" name="telephone" autocomplete="tel">
        </div>
        <div class="field">
          <label for="message">Votre message</label>
          <textarea id="message" name="message" rows="5" required></textarea>
        </div>
        <p class="consent">${esc(CONTACT.formulaire_consentement)} Voir la <a href="confidentialite.html">politique de confidentialité</a>.</p>
        <button type="submit" class="btn btn-primary">Envoyer le message</button>
      </form>`
    : `<div class="contact-form contact-box">
        <h3>${esc(CONTACT.sans_formulaire_titre)}</h3>
        <p>${esc(CONTACT.sans_formulaire_texte)}</p>
        <div class="cta-stack">
          ${blank(S.telephone) ? '' : `<a class="btn btn-primary" href="tel:${tel}">Appeler le ${esc(S.telephone)}</a>`}
          ${blank(S.email) ? '' : `<a class="btn btn-outline" href="mailto:${esc(S.email)}">Écrire un email</a>`}
        </div>
      </div>`;

  return layout({
    file: 'contact.html',
    title: CONTACT.seo_titre,
    desc: CONTACT.seo_description,
    body: `
${banner(CONTACT.banniere)}

<section>
  <div class="container contact-grid">
    <div>
      <ul class="info-list">
        <li><strong>Adresse</strong> <span>${rueHtml}, ${esc(villeLigne)}</span></li>
        <li><strong>Téléphone</strong> <span>${telHtml}</span></li>
        <li><strong>Email</strong> <span>${emailHtml}</span></li>
        <li><strong>Horaires</strong> <span>${esc(S.horaires)}</span></li>
      </ul>
      <div class="map-embed" data-map-src="https://www.google.com/maps?q=${mapQuery}&amp;output=embed">
        <div class="map-consent">
          <p>La carte est fournie par Google Maps et ne se charge qu'à votre demande.</p>
          <button type="button" class="btn btn-outline" data-load-map>Afficher la carte</button>
          <a class="map-link" href="https://www.google.com/maps/search/?api=1&amp;query=${mapQuery}" target="_blank" rel="noopener">Ouvrir dans Google Maps</a>
        </div>
      </div>
    </div>
    <div>
      ${formBlock}
    </div>
  </div>
</section>`,
  });
};

pages['mentions-legales.html'] = () =>
  layout({
    file: 'mentions-legales.html',
    title: `Mentions légales — ${S.nom}`,
    desc: `Mentions légales du site du ${S.nom}, médecin à ${S.ville}.`,
    body: `
<div class="page-banner">
  <div class="container">
    <span class="eyebrow">Informations légales</span>
    <h1>Mentions légales</h1>
  </div>
</div>

<section>
  <div class="container legal">
    <h3>Éditeur du site</h3>
    <p>
      ${esc(S.nom)}, médecin, exerçant à titre individuel.<br>
      Adresse du cabinet : ${rueHtml}, ${esc(villeLigne)}.<br>
      Téléphone : ${telHtml}<br>
      Email : ${emailHtml}<br>
      Numéro RPPS : ${or(S.rpps, 'numéro RPPS')}<br>
      ${esc(S.ordre)}.
    </p>

    <h3>Directeur de la publication</h3>
    <p>${esc(S.nom)}.</p>

    <h3>Hébergement</h3>
    <p>Ce site est hébergé par : ${or(S.hebergeur, 'nom et adresse de l\'hébergeur')}.</p>

    <h3>Propriété intellectuelle</h3>
    <p>L'ensemble des contenus (textes, mise en page, graphisme) présents sur ce site est protégé. Toute reproduction sans autorisation est interdite.</p>

    <h3>Nature du site</h3>
    <p>Ce site a une vocation informative, conformément aux règles de communication de l'Ordre des médecins. Il ne constitue ni une publicité commerciale, ni un acte de télémédecine. Aucune décision de soin n'est prise sur la seule base de son contenu.</p>

    <h3>Responsabilité</h3>
    <p>Les informations fournies le sont à titre général. Elles ne remplacent pas une consultation médicale individuelle, seule apte à évaluer une situation personnelle.</p>
  </div>
</section>`,
  });

pages['confidentialite.html'] = () =>
  layout({
    file: 'confidentialite.html',
    title: `Politique de confidentialité — ${S.nom}`,
    desc: `Politique de confidentialité du site du ${S.nom}.`,
    body: `
<div class="page-banner">
  <div class="container">
    <span class="eyebrow">Vie privée</span>
    <h1>Politique de confidentialité</h1>
  </div>
</div>

<section>
  <div class="container legal">
    <h3>Données collectées</h3>
    ${hasForm
      ? `<p>Le formulaire de contact recueille votre nom, votre email, votre téléphone (facultatif) et le message que vous rédigez. Ces informations sont utilisées uniquement pour répondre à votre demande. Elles transitent par un service tiers d'envoi de formulaires, qui les transmet au cabinet.</p>`
      : `<p>Ce site ne collecte aucune donnée via un formulaire. Si vous téléphonez ou écrivez par email, ces échanges sont utilisés uniquement pour répondre à votre demande.</p>`}

    <h3>Destinataire des données</h3>
    <p>Seul ${esc(S.nom)}, responsable du traitement, a accès aux informations que vous lui communiquez.</p>

    <h3>Durée de conservation</h3>
    <p>Les messages sont conservés le temps nécessaire au traitement de votre demande, puis supprimés ou archivés conformément aux obligations applicables au secteur médical.</p>

    <h3>Vos droits</h3>
    <p>Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Pour l'exercer, contactez : ${emailHtml}.</p>

    <h3>Cookies et services tiers</h3>
    <p>Ce site ne dépose aucun cookie de mesure d'audience ou publicitaire. La carte de la page Contact est fournie par Google Maps : elle n'est chargée qu'à votre demande, en cliquant sur « Afficher la carte ». À ce moment, Google peut déposer ses propres cookies, selon sa politique de confidentialité.</p>
  </div>
</section>`,
  });

pages['404.html'] = () =>
  layout({
    file: '404.html',
    title: `Page introuvable — ${S.nom}`,
    desc: 'Cette page n\'existe pas.',
    robots: 'noindex',
    body: `
<section>
  <div class="container text-center">
    <span class="eyebrow">Erreur 404</span>
    <h1>Cette page n'existe pas</h1>
    <p class="section-head center">Le lien est peut-être ancien ou incorrect.</p>
    <a href="index.html" class="btn btn-primary">Retour à l'accueil</a>
  </div>
</section>`,
  });

/* ---------- Écriture ---------- */
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (e.name !== '.gitkeep') fs.copyFileSync(s, d);
  }
}

fs.rmSync(DIST, { recursive: true, force: true });
copyDir(path.join(ROOT, 'static'), DIST);

for (const [file, render] of Object.entries(pages)) {
  fs.writeFileSync(path.join(DIST, file), render());
}

if (siteUrl) {
  const urls = Object.keys(pages).filter((f) => f !== '404.html');
  fs.writeFileSync(
    path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((f) => `  <url><loc>${siteUrl}/${f === 'index.html' ? '' : f}</loc></url>`).join('\n') +
      `\n</urlset>\n`
  );
  fs.writeFileSync(
    path.join(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${siteUrl}/sitemap.xml\n`
  );
} else {
  fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\n`);
}

console.log(`✔ Site généré : ${Object.keys(pages).length} pages dans dist/`);
if (missing.size) {
  console.log('\nÀ compléter dans l\'espace d\'administration (Réglages du cabinet) :');
  for (const m of missing) console.log('  • ' + m);
}
