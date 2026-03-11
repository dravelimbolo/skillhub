/**
 * SkillHub - Application JavaScript principale
 * Auteur : Candidat EC01 - 2025-2026
 *
 * Fonctionnalités :
 * 1. Menu mobile burger (ouverture / fermeture)
 * 2. Chargement dynamique des formations via fetch() (AJAX)
 * 3. Filtrage des formations par niveau
 * 4. Animation d'apparition des éléments au scroll (IntersectionObserver)
 * 5. Bouton retour en haut de page
 * 6. Ombre du header au scroll + animation des barres de progression
 */

/* ── Sélecteurs DOM ───────────────────────────────────────── */
const header       = document.getElementById('header');
const burgerBtn    = document.getElementById('burger-btn');
const mobileMenu   = document.getElementById('mobile-menu');
const mobileLinks  = mobileMenu?.querySelectorAll('a');
const formationsGrid = document.getElementById('formations-grid');
const filterButtons  = document.querySelectorAll('.filter-btn');
const backToTopBtn   = document.getElementById('back-to-top');

/* ── État de l'application ────────────────────────────────── */
let allFormations = [];     // Données brutes chargées depuis le JSON
let activeFilter  = 'tous'; // Filtre actif sur les formations

/* ============================================================
   1. MENU MOBILE
   ============================================================ */

/**
 * Bascule l'état ouvert/fermé du menu mobile.
 */
function toggleMobileMenu() {
  const isOpen = mobileMenu.classList.toggle('open');
  burgerBtn.setAttribute('aria-expanded', String(isOpen));

  // Empêche le scroll du body quand le menu est ouvert
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

/**
 * Ferme le menu mobile.
 */
function closeMobileMenu() {
  mobileMenu.classList.remove('open');
  burgerBtn.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

// Événement clic sur le burger
burgerBtn?.addEventListener('click', toggleMobileMenu);

// Fermeture au clic sur un lien du menu mobile
mobileLinks?.forEach(link => {
  link.addEventListener('click', closeMobileMenu);
});

// Fermeture au clic en dehors du menu
document.addEventListener('click', (event) => {
  if (
    mobileMenu?.classList.contains('open') &&
    !mobileMenu.contains(event.target) &&
    !burgerBtn.contains(event.target)
  ) {
    closeMobileMenu();
  }
});

// Fermeture avec la touche Escape
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mobileMenu?.classList.contains('open')) {
    closeMobileMenu();
    burgerBtn?.focus();
  }
});

/* ============================================================
   2. CHARGEMENT DES FORMATIONS (AJAX / fetch)
   ============================================================ */

/**
 * Détermine la classe CSS pour le badge de niveau.
 * @param {string} level - Niveau de la formation
 * @returns {string} Classe CSS correspondante
 */
function getLevelClass(level) {
  const normalized = level.toLowerCase().replace(/é/g, 'e').replace(/\s+/g, '');
  if (normalized.includes('debutant'))       return 'level-debutant';
  if (normalized.includes('intermediaire'))  return 'level-intermediaire';
  if (normalized.includes('avance'))         return 'level-avance';
  return 'level-debutant';
}

/**
 * Génère le HTML d'une carte de formation.
 * @param {Object} formation - Objet formation { title, category, duration, level }
 * @param {number} index     - Index pour l'animation décalée
 * @returns {HTMLElement} L'élément article créé
 */
function createFormationCard(formation, index) {
  const article = document.createElement('article');
  article.className = 'formation-card';
  article.setAttribute('role', 'listitem');
  article.style.animationDelay = `${index * 60}ms`;

  const levelClass = getLevelClass(formation.level);

  article.innerHTML = `
    <div class="card-top" aria-hidden="true"></div>
    <div class="card-body">
      <div class="card-meta">
        <span class="card-category">${escapeHtml(formation.category)}</span>
        <span class="card-level ${levelClass}">${escapeHtml(formation.level)}</span>
      </div>
      <h3 class="card-title">${escapeHtml(formation.title)}</h3>
      <div class="card-footer">
        <span class="card-duration" aria-label="Durée : ${escapeHtml(formation.duration)}">
          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          ${escapeHtml(formation.duration)}
        </span>
        <button class="card-btn" aria-label="Voir la formation ${escapeHtml(formation.title)}">
          Voir la formation
        </button>
      </div>
    </div>
  `;

  return article;
}

/**
 * Échappe les caractères HTML pour éviter les injections XSS.
 * @param {string} str - Chaîne à échapper
 * @returns {string} Chaîne sécurisée
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/**
 * Affiche les formations dans la grille en fonction du filtre actif.
 * @param {Array} formations - Tableau de formations à afficher
 */
function renderFormations(formations) {
  if (!formationsGrid) return;

  // Vide la grille
  formationsGrid.innerHTML = '';

  if (formations.length === 0) {
    // Aucun résultat
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.setAttribute('role', 'status');
    empty.innerHTML = `
      <p>Aucune formation trouvée pour ce filtre.</p>
    `;
    formationsGrid.appendChild(empty);
    return;
  }

  // Crée et ajoute chaque carte
  formations.forEach((formation, index) => {
    const card = createFormationCard(formation, index);
    formationsGrid.appendChild(card);
  });
}

/**
 * Charge les formations depuis le fichier JSON via fetch (AJAX).
 */
async function loadFormations() {
  if (!formationsGrid) return;

  // Affiche le loader pendant le chargement
  formationsGrid.innerHTML = `
    <div class="loader" role="status" aria-live="polite">
      <div class="loader-spinner" aria-hidden="true"></div>
      <p>Chargement des formations…</p>
    </div>
  `;

  try {
    const response = await fetch('./data/formations.json');

    if (!response.ok) {
      throw new Error(`Erreur HTTP : ${response.status}`);
    }

    const data = await response.json();
    allFormations = data.formations ?? [];

    // Construit les boutons de filtre dynamiquement
    buildFilterButtons();

    // Affiche toutes les formations
    renderFormations(allFormations);

  } catch (error) {
    console.error('Erreur lors du chargement des formations :', error);
    formationsGrid.innerHTML = `
      <div class="empty-state" role="alert">
        <p>Impossible de charger les formations. Veuillez réessayer ultérieurement.</p>
      </div>
    `;
  }
}

/* ============================================================
   3. FILTRAGE DES FORMATIONS
   ============================================================ */

/**
 * Construit les boutons de filtre par niveau de manière dynamique.
 */
function buildFilterButtons() {
  const container = document.querySelector('.formations-controls');
  if (!container) return;

  // Récupère les niveaux uniques depuis les données
  const levels = [...new Set(allFormations.map(f => f.level))];

  // Vide les boutons existants (sauf le bouton "Tous")
  container.innerHTML = '';

  // Bouton "Tous"
  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn active';
  allBtn.setAttribute('aria-pressed', 'true');
  allBtn.dataset.filter = 'tous';
  allBtn.textContent = 'Tous';
  container.appendChild(allBtn);

  // Boutons par niveau
  levels.forEach(level => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.setAttribute('aria-pressed', 'false');
    btn.dataset.filter = level;
    btn.textContent = level;
    container.appendChild(btn);
  });

  // Attache les événements
  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', handleFilterClick);
  });
}

/**
 * Gère le clic sur un bouton de filtre.
 * @param {MouseEvent} event
 */
function handleFilterClick(event) {
  const clickedBtn = event.currentTarget;
  const filter = clickedBtn.dataset.filter;

  if (filter === activeFilter) return; // Pas de changement si même filtre

  activeFilter = filter;

  // Met à jour l'état aria et les classes
  document.querySelectorAll('.filter-btn').forEach(btn => {
    const isActive = btn.dataset.filter === filter;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });

  // Filtre les formations
  const filtered = activeFilter === 'tous'
    ? allFormations
    : allFormations.filter(f => f.level === activeFilter);

  renderFormations(filtered);
}

/* ============================================================
   4. ANIMATION AU SCROLL (IntersectionObserver)
   ============================================================ */

/**
 * Observe les éléments avec la classe .fade-in et les rend
 * visibles lorsqu'ils entrent dans le viewport.
 */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.fade-in');

  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // Observe une seule fois
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    }
  );

  elements.forEach(el => observer.observe(el));
}

/**
 * Anime les barres de progression dans la section hero.
 */
function animateProgressBars() {
  const fills = document.querySelectorAll('.progress-fill');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target;
          const targetWidth = target.dataset.width || '0%';
          target.style.width = targetWidth;
          observer.unobserve(target);
        }
      });
    },
    { threshold: 0.3 }
  );

  fills.forEach(fill => observer.observe(fill));
}

/* ============================================================
   5. BOUTON RETOUR EN HAUT DE PAGE
   ============================================================ */

/**
 * Fait défiler la page vers le haut.
 */
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

backToTopBtn?.addEventListener('click', scrollToTop);

/* ============================================================
   6. OMBRE DU HEADER AU SCROLL
   ============================================================ */

/**
 * Met à jour l'état du header et du bouton retour-en-haut
 * en fonction de la position de scroll.
 */
function handleScroll() {
  const scrollY = window.scrollY;

  // Ombre du header
  header?.classList.toggle('scrolled', scrollY > 10);

  // Bouton retour en haut
  backToTopBtn?.classList.toggle('visible', scrollY > 400);
}

// Écouteur de scroll avec optimisation (passive)
window.addEventListener('scroll', handleScroll, { passive: true });

/* ============================================================
   INITIALISATION
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  loadFormations();
  initScrollAnimations();
  animateProgressBars();
  handleScroll(); // État initial
});

/* ============================================================
   FORMULAIRE DE CONTACT - Validation et soumission
   ============================================================ */

/**
 * Initialise la gestion complète du formulaire de contact :
 * - Validation en temps réel (blur)
 * - Compteur de caractères pour le textarea
 * - Soumission simulée avec feedback
 */
function initContactForm() {
  const form        = document.getElementById('contact-form');
  const successBox  = document.getElementById('form-success');
  const submitBtn   = document.getElementById('submit-btn');

  if (!form) return; // La section contact n'existe pas

  /* ── Règles de validation ─────────────────────────────── */
  /**
   * Chaque règle possède :
   * - selector : sélecteur CSS de l'input
   * - errorId  : ID du span d'erreur associé
   * - valider  : fonction qui retourne null (ok) ou un message d'erreur
   */
  const reglesValidation = [
    {
      selector: '#contact-prenom',
      errorId:  'prenom-error',
      valider:  (val) => {
        if (!val.trim())     return 'Le prénom est obligatoire.';
        if (val.trim().length < 2) return 'Le prénom doit contenir au moins 2 caractères.';
        return null;
      }
    },
    {
      selector: '#contact-nom',
      errorId:  'nom-error',
      valider:  (val) => {
        if (!val.trim())     return 'Le nom est obligatoire.';
        if (val.trim().length < 2) return 'Le nom doit contenir au moins 2 caractères.';
        return null;
      }
    },
    {
      selector: '#contact-email',
      errorId:  'email-error',
      valider:  (val) => {
        if (!val.trim())     return 'L\'adresse email est obligatoire.';
        // Regex de validation email simple mais efficace
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regexEmail.test(val)) return 'Veuillez saisir une adresse email valide.';
        return null;
      }
    },
    {
      selector: '#contact-sujet',
      errorId:  'sujet-error',
      valider:  (val) => {
        if (!val) return 'Veuillez choisir un sujet.';
        return null;
      }
    },
    {
      selector: '#contact-message',
      errorId:  'message-error',
      valider:  (val) => {
        if (!val.trim())       return 'Le message est obligatoire.';
        if (val.trim().length < 10) return 'Le message doit contenir au moins 10 caractères.';
        return null;
      }
    }
  ];

  /* ── Afficher / effacer l'état d'un champ ─────────────── */
  /**
   * Met à jour visuellement et sémantiquement l'état d'un champ.
   * @param {HTMLElement} input         - L'input à mettre à jour
   * @param {string|null} messageErreur - Message d'erreur ou null si valide
   * @param {string}      errorId       - ID du span d'erreur
   */
  function setEtatChamp(input, messageErreur, errorId) {
    const spanErreur = document.getElementById(errorId);

    // Toujours nettoyer les deux états avant d'appliquer le bon
    input.classList.remove('input-error', 'input-success');

    if (messageErreur) {
      // ─ État ERREUR ─
      input.classList.add('input-error');
      input.setAttribute('aria-invalid', 'true');
      if (spanErreur) spanErreur.textContent = messageErreur;
    } else {
      // ─ État SUCCÈS ─
      input.classList.add('input-success');
      input.setAttribute('aria-invalid', 'false');
      if (spanErreur) spanErreur.textContent = '';
    }
  }

  /* ── Validation au blur (quitter le champ) ─────────────── */
  reglesValidation.forEach(({ selector, errorId, valider }) => {
    const input = form.querySelector(selector);
    if (!input) return;

    input.addEventListener('blur', () => {
      const erreur = valider(input.value);
      setEtatChamp(input, erreur, errorId);
    });

    // Effacer l'erreur dès que l'utilisateur retape (meilleure UX)
    input.addEventListener('input', () => {
      if (input.classList.contains('input-error')) {
        const erreur = valider(input.value);
        // On efface seulement si le champ devient valide
        if (!erreur) setEtatChamp(input, null, errorId);
      }
    });
  });

  /* ── Validation de la checkbox RGPD ────────────────────── */
  function validerRgpd() {
    const checkbox   = document.getElementById('contact-rgpd');
    const spanErreur = document.getElementById('rgpd-error');
    if (!checkbox) return null;

    if (!checkbox.checked) {
      checkbox.classList.add('input-error');
      if (spanErreur) spanErreur.textContent = 'Vous devez accepter la politique de confidentialité.';
      return 'Consentement RGPD manquant.';
    } else {
      checkbox.classList.remove('input-error');
      if (spanErreur) spanErreur.textContent = '';
      return null;
    }
  }

  /* ── Compteur de caractères pour le textarea ────────────── */
  const textarea     = form.querySelector('#contact-message');
  const compteur     = document.getElementById('message-count');
  const maxChars     = 500;

  textarea?.addEventListener('input', () => {
    const longueur = textarea.value.length;

    if (compteur) {
      compteur.textContent = `${longueur} / ${maxChars} caractères`;

      // Alerte visuelle si on approche de la limite
      compteur.style.color = longueur > maxChars * 0.9
        ? '#e53e3e'
        : 'var(--color-text-muted)';
    }
  });

  /* ── Soumission du formulaire ───────────────────────────── */
  form.addEventListener('submit', async (event) => {
    // Empêche le rechargement natif de la page
    event.preventDefault();

    // 1. Valider tous les champs
    let formulaireValide = true;
    const erreursChamps = [];

    reglesValidation.forEach(({ selector, errorId, valider }) => {
      const input  = form.querySelector(selector);
      if (!input) return;
      const erreur = valider(input.value);
      setEtatChamp(input, erreur, errorId);
      if (erreur) {
        formulaireValide = false;
        erreursChamps.push(input);
      }
    });

    // Vérifier RGPD
    const erreurRgpd = validerRgpd();
    if (erreurRgpd) formulaireValide = false;

    // 2. Si erreurs : focus sur le premier champ invalide
    if (!formulaireValide) {
      erreursChamps[0]?.focus();
      return;
    }

    // 3. Simuler l'envoi (état de chargement)
    const btnText    = submitBtn?.querySelector('.btn-text');
    const btnSpinner = submitBtn?.querySelector('.btn-spinner');

    if (submitBtn) submitBtn.disabled = true;
    if (btnText)    btnText.textContent = 'Envoi en cours…';
    if (btnSpinner) btnSpinner.hidden = false;

    // Simulation d'une requête réseau (1.5 secondes)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 4. Afficher le message de succès
    if (successBox) successBox.hidden = false;

    // 5. Réinitialiser le formulaire
    form.reset();

    // Nettoyer les classes de validation
    form.querySelectorAll('.input-success, .input-error')
        .forEach(el => el.classList.remove('input-success', 'input-error'));

    // Réinitialiser le compteur
    if (compteur) compteur.textContent = `0 / ${maxChars} caractères`;

    // Réactiver le bouton
    if (submitBtn) submitBtn.disabled = false;
    if (btnText)    btnText.textContent = 'Envoyer le message';
    if (btnSpinner) btnSpinner.hidden = true;

    // 6. Scroll vers le message de succès
    successBox?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // 7. Cacher le message après 8 secondes
    setTimeout(() => {
      if (successBox) successBox.hidden = true;
    }, 8000);
  });
}

// Initialiser le formulaire au chargement du DOM
document.addEventListener('DOMContentLoaded', initContactForm);
