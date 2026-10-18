/* =====================================================================
 *  CTEFA-CLASSIC Web — ecole.js (règles de gestion, sans interface)
 *  Élèves, classes, notes par composition, moyennes, rangs, décisions.
 *
 *  Règles de calcul :
 *   - Élémentaire et Majaalis (notes sur 10) : moyenne d'une langue =
 *     somme des notes / somme des barèmes × 10 ; moyenne générale =
 *     moyenne des langues présentes (français, arabe, langue nationale).
 *   - Moyen et secondaire (notes sur 20) : note d'une matière =
 *     (moyenne des devoirs + composition) / 2 ; moyenne = Σ(note × coef) / Σcoef.
 *   - Une rubrique sans note n'entre pas dans le calcul.
 *   - Rang : ex aequo partagent le rang (1er, 2e ex, 2e ex, 4e…).
 * ===================================================================== */
(function (global) {
  'use strict';

  var NIV = global.CTEFA_NIVEAUX, ORDRE = global.CTEFA_ORDRE_NIVEAUX;
  var VERSION = 1;
  var LANGUES = { FR: 'Français', AR: 'Arabe', LN: 'Langue nationale' };
  var STATUTS = { ACTIF: 'Actif', INACTIF: 'Inactif', ABANDON: 'Abandon', TRANSFERT: 'Transféré' };
  var REGIMES = { EXTERNE: 'Externe', DEMI_PENSION: 'Demi-pension', INTERNE: 'Interne', CAS_SOCIAL: 'Cas social' };

  function Erreur(msg) { this.message = msg; }
  Erreur.prototype = Object.create(Error.prototype);

  function aujourdhui() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function anneeScolaire() { var d = new Date(), a = d.getFullYear(); return d.getMonth() >= 8 ? a + '-' + (a + 1) : (a - 1) + '-' + a; }

  function etatVide() {
    return {
      version: VERSION,
      ecole: { nom: 'MON ÉCOLE', nom_ar: '', ia: '', ief: '', code: '', telephone: '', adresse: '', ville: '', annee: anneeScolaire(),
               directeur: '', statut: 'PUBLIQUE' },
      seq: { classes: 0, eleves: 0, decisions: 0 },
      classes: [], eleves: [], notes: {}, decisions: [], appreciations: {}
    };
  }

  function Ecole(etat, sauver) { this.d = Ecole.valider(etat || etatVide()); this.sauver = sauver || function () {}; }
  Ecole.valider = function (d) {
    if (!d || !Array.isArray(d.eleves) || !Array.isArray(d.classes)) throw new Erreur('Ce fichier n\'est pas une sauvegarde CTEFA-CLASSIC.');
    var v = etatVide();
    Object.keys(v).forEach(function (k) { if (d[k] === undefined) d[k] = v[k]; });
    d.ecole = Object.assign(v.ecole, d.ecole);
    return d;
  };
  Ecole.idsUniques = false;
  var dernierUid = 0;
  Ecole.prototype._id = function (t) {
    if (Ecole.idsUniques) { var n = Date.now() * 1000 + Math.floor(Math.random() * 1000); if (n <= dernierUid) n = dernierUid + 1; dernierUid = n; return n; }
    return ++this.d.seq[t];
  };
  Ecole.prototype._commit = function () { this.sauver(this.d); };

  /* ---------- école ---------- */
  Ecole.prototype.setEcole = function (info) {
    var e = this.d.ecole;
    ['nom', 'nom_ar', 'ia', 'ief', 'code', 'telephone', 'adresse', 'ville', 'annee', 'directeur', 'statut'].forEach(function (k) {
      if (info[k] !== undefined) e[k] = String(info[k]).trim();
    });
    if (!e.nom) throw new Erreur('Le nom de l\'école est obligatoire.');
    this._commit();
  };

  /* ---------- classes ---------- */
  Ecole.prototype.classe = function (id) { return this.d.classes.find(function (c) { return c.id === id; }) || null; };
  Ecole.prototype.niveau = function (code) { return NIV[code] || null; };
  Ecole.prototype.classesTriees = function () {
    return this.d.classes.slice().sort(function (a, b) { return ORDRE.indexOf(a.niveau) - ORDRE.indexOf(b.niveau) || a.nom.localeCompare(b.nom); });
  };
  Ecole.prototype.enregistrerClasse = function (info, id) {
    var nom = String(info.nom || '').trim();
    if (!nom) throw new Erreur('Donnez un nom à la classe (ex. CM2 A).');
    if (!NIV[info.niveau]) throw new Erreur('Choisissez le niveau de la classe.');
    var dbl = this.d.classes.find(function (c) { return c.nom.toLowerCase() === nom.toLowerCase() && c.id !== id; });
    if (dbl) throw new Erreur('La classe ' + nom + ' existe déjà.');
    var c = id ? this.classe(id) : null;
    if (id && !c) throw new Erreur('Classe introuvable.');
    if (c && c.niveau !== info.niveau && this.eleves({ classe: id }).length &&
        this._aDesNotes(id)) throw new Erreur('Cette classe a déjà des notes : son niveau ne peut plus changer.');
    var f = { nom: nom, niveau: info.niveau, salle: String(info.salle || '').trim(), titulaire_fr: String(info.titulaire_fr || '').trim(),
              titulaire_ar: String(info.titulaire_ar || '').trim(), effectif_max: parseInt(info.effectif_max, 10) || 50 };
    if (c) Object.assign(c, f); else { c = Object.assign({ id: this._id('classes') }, f); this.d.classes.push(c); }
    this._commit();
    return c.id;
  };
  Ecole.prototype._aDesNotes = function (classeId) {
    var self = this;
    return this.d.eleves.some(function (e) { return e.classe_id === classeId && self.d.notes[e.id]; });
  };
  Ecole.prototype.supprimerClasse = function (id) {
    if (this.d.eleves.some(function (e) { return e.classe_id === id; })) throw new Erreur('Cette classe a des élèves : déplacez-les d\'abord.');
    this.d.classes = this.d.classes.filter(function (c) { return c.id !== id; });
    this._commit();
  };
  /** Crée d'un coup les classes d'un cycle (une classe par niveau) */
  Ecole.prototype.creerClassesTypes = function (niveaux) {
    var self = this, n = 0;
    niveaux.forEach(function (k) {
      if (!self.d.classes.some(function (c) { return c.niveau === k; })) {
        self.d.classes.push({ id: self._id('classes'), nom: NIV[k].nom, niveau: k, salle: '', titulaire_fr: '', titulaire_ar: '', effectif_max: 50 }); n++;
      }
    });
    this._commit();
    return n;
  };

  /* ---------- élèves ---------- */
  Ecole.prototype.eleve = function (id) { return this.d.eleves.find(function (e) { return e.id === id; }) || null; };
  Ecole.prototype.eleves = function (f) {
    f = f || {};
    var q = String(f.recherche || '').trim().toLowerCase();
    return this.d.eleves.filter(function (e) {
      if (f.classe && e.classe_id !== f.classe) return false;
      if (f.statut && f.statut !== 'TOUS' && e.statut !== f.statut) return false;
      if (!f.statut && e.statut !== 'ACTIF') return false;
      return !q || [e.matricule, e.prenom, e.nom, e.telephone, e.parent].join(' ').toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom); });
  };
  Ecole.prototype._matricule = function (classeId) {
    var c = this.classe(classeId), an = String(this.d.ecole.annee || anneeScolaire()).slice(0, 4);
    var n = this.d.eleves.length + 1, m;
    do { m = an + String(n).padStart(3, '0') + (c ? c.niveau.replace(/[^A-Z0-9]/g, '') : ''); n++; }
    while (this.d.eleves.some(function (e) { return e.matricule === m; }));
    return m;
  };
  Ecole.prototype.enregistrerEleve = function (info, id) {
    var f = {
      prenom: String(info.prenom || '').trim().replace(/\s+/g, ' ').toLowerCase().replace(/(^|[\s-])\S/g, function (c) { return c.toUpperCase(); }),
      nom: String(info.nom || '').trim().toUpperCase(),
      sexe: info.sexe === 'F' ? 'F' : 'M',
      date_naiss: String(info.date_naiss || '').slice(0, 10), lieu_naiss: String(info.lieu_naiss || '').trim(),
      classe_id: Number(info.classe_id) || null,
      parent: String(info.parent || '').trim(), telephone: String(info.telephone || '').replace(/[^\d+ ]/g, '').trim(),
      adresse: String(info.adresse || '').trim(), regime: REGIMES[info.regime] ? info.regime : 'EXTERNE',
      statut: STATUTS[info.statut] ? info.statut : 'ACTIF', observations: String(info.observations || '').trim()
    };
    if (!f.prenom || !f.nom) throw new Erreur('Prénom et nom sont obligatoires.');
    if (!this.classe(f.classe_id)) throw new Erreur('Choisissez la classe de l\'élève.');
    var e = id ? this.eleve(id) : null;
    if (id && !e) throw new Erreur('Élève introuvable.');
    var mat = String(info.matricule || '').trim().toUpperCase();
    if (mat && this.d.eleves.some(function (x) { return x.matricule === mat && x.id !== id; })) throw new Erreur('Le matricule ' + mat + ' est déjà utilisé.');
    if (e) {
      if (e.classe_id !== f.classe_id && this.d.notes[e.id] &&
          this.classe(e.classe_id).niveau !== this.classe(f.classe_id).niveau) f.notes_autre_niveau = true;
      Object.assign(e, f); if (mat) e.matricule = mat;
    } else {
      e = Object.assign({ id: this._id('eleves'), matricule: mat || this._matricule(f.classe_id), date_inscription: aujourdhui() }, f);
      this.d.eleves.push(e);
    }
    this._commit();
    return e.id;
  };
  Ecole.prototype.supprimerEleve = function (id) {
    this.d.eleves = this.d.eleves.filter(function (e) { return e.id !== id; });
    delete this.d.notes[id];
    this.d.decisions = this.d.decisions.filter(function (x) { return x.eleve_id !== id; });
    this._commit();
  };
  /** Import de lignes collées depuis Excel : Prénom ; Nom ; Sexe ; Date de naissance ; Lieu ; Parent ; Téléphone */
  Ecole.prototype.importerEleves = function (texte, classeId) {
    if (!this.classe(classeId)) throw new Erreur('Choisissez la classe.');
    var self = this, ok = 0, erreurs = [];
    var lignes = String(texte || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var vieux = Ecole.prototype._commit; this._commit = function () {};
    try {
      lignes.forEach(function (l, i) {
        var c = l.split(/\t|;/).map(function (x) { return x.trim(); });
        if (i === 0 && /pr[ée]nom/i.test(c[0])) return;
        try {
          var dn = c[3] || '', m = dn.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
          if (m) dn = m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
          self.enregistrerEleve({ prenom: c[0], nom: c[1], sexe: /^f/i.test(c[2] || '') ? 'F' : 'M', date_naiss: dn, lieu_naiss: c[4],
                                  parent: c[5], telephone: c[6], classe_id: classeId });
          ok++;
        } catch (err) { erreurs.push('Ligne ' + (i + 1) + ' : ' + err.message); }
      });
    } finally { this._commit = vieux; }
    this._commit();
    return { ok: ok, erreurs: erreurs };
  };

  /* ---------- notes ---------- */
  Ecole.prototype.rubriques = function (classeId) { var c = this.classe(classeId); return c ? NIV[c.niveau].rubriques : []; };
  Ecole.prototype.note = function (eleveId, compo, rubId) {
    var n = this.d.notes[eleveId]; n = n && n[compo]; return n && n[rubId] !== undefined ? n[rubId] : null;
  };
  /** valeur : nombre, '' ou null pour effacer */
  Ecole.prototype.setNote = function (eleveId, compo, rubId, valeur, sansSauver) {
    var e = this.eleve(eleveId);
    if (!e) throw new Erreur('Élève introuvable.');
    var r = NIV[this.classe(e.classe_id).niveau].rubriques.find(function (x) { return x.id === rubId; });
    if (!r) throw new Erreur('Rubrique introuvable.');
    var bar = r.baremes[compo - 1];
    if (valeur === '' || valeur === null || valeur === undefined) {
      if (this.d.notes[eleveId] && this.d.notes[eleveId][compo]) delete this.d.notes[eleveId][compo][rubId];
    } else {
      var v = Number(String(valeur).replace(',', '.'));
      if (!isFinite(v) || v < 0 || v > bar) throw new Erreur('Note invalide : entre 0 et ' + bar + ' pour ' + r.rubrique + '.');
      v = Math.round(v * 100) / 100;
      this.d.notes[eleveId] = this.d.notes[eleveId] || {};
      this.d.notes[eleveId][compo] = this.d.notes[eleveId][compo] || {};
      this.d.notes[eleveId][compo][rubId] = v;
    }
    if (!sansSauver) this._commit();
  };

  function arrondi(x, n) { var p = Math.pow(10, n || 2); return Math.round(x * p) / p; }

  /** Calcule les moyennes d'un élève pour une composition */
  Ecole.prototype.moyennes = function (eleveId, compo) {
    var e = this.eleve(eleveId), c = this.classe(e.classe_id), niv = NIV[c.niveau], self = this;
    var notes = (this.d.notes[eleveId] || {})[compo] || {};
    var res = { langues: {}, matieres: [], generale: null, nb_notes: 0, nb_rubriques: niv.rubriques.length };
    // regroupe par matière
    var mats = [];
    niv.rubriques.forEach(function (r) {
      var m = mats.find(function (x) { return x.matiere === r.matiere && x.langue === r.langue; });
      if (!m) { m = { matiere: r.matiere, langue: r.langue, coef: r.coef, rubriques: [] }; mats.push(m); }
      m.rubriques.push({ id: r.id, rubrique: r.rubrique, bareme: r.baremes[compo - 1], note: notes[r.id] !== undefined ? notes[r.id] : null });
      if (notes[r.id] !== undefined) res.nb_notes++;
    });
    mats.forEach(function (m) {
      var notees = m.rubriques.filter(function (r) { return r.note !== null; });
      if (!notees.length) { m.note = null; return; }
      if (niv.base === 20) {
        var dev = notees.filter(function (r) { return /^devoir/i.test(r.rubrique); }), comp = notees.find(function (r) { return /^composition/i.test(r.rubrique); });
        var md = dev.length ? dev.reduce(function (s, r) { return s + r.note / r.bareme * 20; }, 0) / dev.length : null;
        var mc = comp ? comp.note / comp.bareme * 20 : null;
        m.note = arrondi(md !== null && mc !== null ? (md + mc) / 2 : (mc !== null ? mc : md));
      } else {
        m.note = arrondi(notees.reduce(function (s, r) { return s + r.note; }, 0) / notees.reduce(function (s, r) { return s + r.bareme; }, 0) * 10);
        m.total = arrondi(notees.reduce(function (s, r) { return s + r.note; }, 0));
        m.bareme = notees.reduce(function (s, r) { return s + r.bareme; }, 0);
      }
    });
    res.matieres = mats;
    Object.keys(LANGUES).forEach(function (lg) {
      var ms = mats.filter(function (m) { return m.langue === lg && m.note !== null; });
      if (!ms.length) return;
      if (niv.base === 20) {
        res.langues[lg] = arrondi(ms.reduce(function (s, m) { return s + m.note * m.coef; }, 0) / ms.reduce(function (s, m) { return s + m.coef; }, 0));
      } else {
        var rubs = []; ms.forEach(function (m) { m.rubriques.forEach(function (r) { if (r.note !== null) rubs.push(r); }); });
        res.langues[lg] = arrondi(rubs.reduce(function (s, r) { return s + r.note; }, 0) / rubs.reduce(function (s, r) { return s + r.bareme; }, 0) * 10);
      }
    });
    var lgs = Object.keys(res.langues);
    if (lgs.length) {
      if (niv.base === 20) {
        var ms2 = mats.filter(function (m) { return m.note !== null; });
        res.generale = arrondi(ms2.reduce(function (s, m) { return s + m.note * m.coef; }, 0) / ms2.reduce(function (s, m) { return s + m.coef; }, 0));
      } else res.generale = arrondi(lgs.reduce(function (s, k) { return s + res.langues[k]; }, 0) / lgs.length);
    }
    res.base = niv.base;
    void self;
    return res;
  };

  function rangs(liste, cle) {
    var tri = liste.filter(function (x) { return x[cle] !== null && x[cle] !== undefined; }).sort(function (a, b) { return b[cle] - a[cle]; });
    tri.forEach(function (x, i) {
      var r = i > 0 && tri[i - 1][cle] === x[cle] ? tri[i - 1]['rang_' + cle] : i + 1;
      x['rang_' + cle] = r;
    });
    tri.forEach(function (x) { x['exaequo_' + cle] = tri.filter(function (y) { return y[cle] === x[cle]; }).length > 1; });
  }

  /** Résultats d'une classe pour une composition (1, 2, 3) ou l'année ('A') */
  Ecole.prototype.resultats = function (classeId, compo) {
    var self = this, c = this.classe(classeId), niv = NIV[c.niveau];
    var lignes = this.eleves({ classe: classeId }).map(function (e) {
      var l = { eleve: e, langues: {}, generale: null };
      if (compo === 'A') {
        var ms = [1, 2, 3].map(function (k) { return self.moyennes(e.id, k); }).filter(function (m) { return m.generale !== null; });
        l.compos = [1, 2, 3].map(function (k) { return self.moyennes(e.id, k).generale; });
        if (ms.length) {
          Object.keys(LANGUES).forEach(function (lg) {
            var v = ms.filter(function (m) { return m.langues[lg] !== undefined; });
            if (v.length) l.langues[lg] = arrondi(v.reduce(function (s, m) { return s + m.langues[lg]; }, 0) / v.length);
          });
          l.generale = arrondi(ms.reduce(function (s, m) { return s + m.generale; }, 0) / ms.length);
        }
      } else {
        var m = self.moyennes(e.id, compo);
        l.langues = m.langues; l.generale = m.generale; l.detail = m;
      }
      Object.keys(LANGUES).forEach(function (lg) { l['m_' + lg] = l.langues[lg] !== undefined ? l.langues[lg] : null; });
      l.g = l.generale;
      return l;
    });
    rangs(lignes, 'g'); Object.keys(LANGUES).forEach(function (lg) { rangs(lignes, 'm_' + lg); });
    lignes.sort(function (a, b) { return (a.rang_g || 9999) - (b.rang_g || 9999) || a.eleve.nom.localeCompare(b.eleve.nom); });
    var notes = lignes.filter(function (l) { return l.g !== null; });
    var stats = {
      effectif: lignes.length, classes: notes.length, base: niv.base, seuil: niv.seuil,
      garcons: lignes.filter(function (l) { return l.eleve.sexe === 'M'; }).length,
      filles: lignes.filter(function (l) { return l.eleve.sexe === 'F'; }).length,
      moyenne: notes.length ? arrondi(notes.reduce(function (s, l) { return s + l.g; }, 0) / notes.length) : null,
      max: notes.length ? Math.max.apply(null, notes.map(function (l) { return l.g; })) : null,
      min: notes.length ? Math.min.apply(null, notes.map(function (l) { return l.g; })) : null,
      admis: notes.filter(function (l) { return l.g >= niv.seuil; }).length,
      admis_f: notes.filter(function (l) { return l.g >= niv.seuil && l.eleve.sexe === 'F'; }).length
    };
    stats.taux = notes.length ? Math.round(1000 * stats.admis / notes.length) / 10 : null;
    return { classe: c, niveau: niv, compo: compo, lignes: lignes, stats: stats };
  };

  /** Appréciation selon la moyenne ramenée sur 10 */
  function appreciation(moy, base) {
    if (moy === null || moy === undefined) return '';
    var x = moy / base * 10;
    return x >= 9 ? 'Excellent' : x >= 8 ? 'Très bien' : x >= 7 ? 'Bien' : x >= 6 ? 'Assez bien' : x >= 5 ? 'Passable' : x >= 3 ? 'Insuffisant' : 'Très insuffisant';
  }
  function appreciationAr(moy, base) {
    if (moy === null || moy === undefined) return '';
    var x = moy / base * 10;
    return x >= 9 ? 'ممتاز' : x >= 8 ? 'جيد جدا' : x >= 7 ? 'جيد' : x >= 6 ? 'مستحسن' : x >= 5 ? 'مقبول' : x >= 3 ? 'ضعيف' : 'ضعيف جدا';
  }
  function rangTexte(r, ex, sexe) {
    if (!r) return '';
    return r + (r === 1 ? (sexe === 'F' ? 're' : 'er') : 'e') + (ex ? ' ex' : '');
  }

  /* ---------- appréciations du maître (par élève et composition) ---------- */
  Ecole.prototype.setAppreciation = function (eleveId, compo, texte) {
    this.d.appreciations[eleveId + '|' + compo] = String(texte || '').trim();
    this._commit();
  };
  Ecole.prototype.appreciationMaitre = function (eleveId, compo) { return this.d.appreciations[eleveId + '|' + compo] || ''; };

  /* ---------- décisions de fin d'année ---------- */
  Ecole.prototype.propositions = function (classeId) {
    var self = this, r = this.resultats(classeId, 'A'), niv = r.niveau;
    return r.lignes.map(function (l) {
      var dec = self.d.decisions.find(function (x) { return x.eleve_id === l.eleve.id && x.annee === self.d.ecole.annee; });
      var prop = l.g === null ? 'SANS_NOTE' : l.g >= niv.seuil ? (niv.suivant ? 'PASSAGE' : 'FIN_CYCLE') : 'REDOUBLEMENT';
      return { ligne: l, proposition: prop, decision: dec ? dec.decision : null, niveau_suivant: niv.suivant, decision_obj: dec || null };
    });
  };
  Ecole.prototype.setDecision = function (eleveId, decision, observation) {
    var DEC = { PASSAGE: 1, REDOUBLEMENT: 1, FIN_CYCLE: 1, EXCLUSION: 1, ABANDON: 1 };
    if (!DEC[decision]) throw new Erreur('Décision inconnue.');
    var an = this.d.ecole.annee, d = this.d.decisions.find(function (x) { return x.eleve_id === eleveId && x.annee === an; });
    if (!d) { d = { id: this._id('decisions'), eleve_id: eleveId, annee: an }; this.d.decisions.push(d); }
    d.decision = decision; d.date = aujourdhui(); d.observation = String(observation || '').trim();
    this._commit();
  };
  /** Nouvelle année : applique les décisions (passage → classe du niveau suivant), vide les notes */
  Ecole.prototype.nouvelleAnnee = function (nouvelleAnnee, correspondance) {
    var self = this, an = this.d.ecole.annee, bilan = { passes: 0, redoublants: 0, sortis: 0, sans: 0 };
    this.d.eleves.forEach(function (e) {
      if (e.statut !== 'ACTIF') return;
      var d = self.d.decisions.find(function (x) { return x.eleve_id === e.id && x.annee === an; });
      if (!d) { bilan.sans++; return; }
      if (d.decision === 'PASSAGE') {
        var cible = correspondance[e.classe_id];
        if (cible) { e.classe_id = cible; bilan.passes++; } else bilan.sans++;
      } else if (d.decision === 'REDOUBLEMENT') bilan.redoublants++;
      else { e.statut = d.decision === 'ABANDON' ? 'ABANDON' : 'INACTIF'; bilan.sortis++; }
    });
    this.d.archives = this.d.archives || [];
    this.d.archives.push({ annee: an, notes: this.d.notes, appreciations: this.d.appreciations });
    this.d.notes = {}; this.d.appreciations = {};
    this.d.ecole.annee = nouvelleAnnee;
    this._commit();
    return bilan;
  };

  Ecole.prototype.exporter = function () { return JSON.stringify(this.d, null, 1); };

  global.CtefaEcole = {
    Ecole: Ecole, Erreur: Erreur, etatVide: etatVide, NIVEAUX: NIV, ORDRE: ORDRE, LANGUES: LANGUES, STATUTS: STATUTS, REGIMES: REGIMES,
    appreciation: appreciation, appreciationAr: appreciationAr, rangTexte: rangTexte, aujourdhui: aujourdhui, arrondi: arrondi,
    DECISIONS: { PASSAGE: 'Admis(e) en classe supérieure', REDOUBLEMENT: 'Redouble', FIN_CYCLE: 'Fin de cycle', EXCLUSION: 'Exclu(e)', ABANDON: 'Abandon', SANS_NOTE: 'Sans note' }
  };
})(this);
