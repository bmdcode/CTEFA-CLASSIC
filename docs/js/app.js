/* =====================================================================
 *  CTEFA-CLASSIC Web — app.js (interface)
 *  Vues : tableau, eleves, classes, notes, resultats, bulletins,
 *  decisions, parametres. Navigation par #ancre.
 * ===================================================================== */
(function () {
  'use strict';

  var C = window.CtefaEcole, NIV = C.NIVEAUX;
  var CLE = 'ctefa.donnees.v1', CLE_ENVOI = 'ctefa.dernier_envoi';

  /* ---------- stockage ---------- */
  var stockageOk = true;
  function charger() {
    try { var b = localStorage.getItem(CLE); return b ? C.Ecole.valider(JSON.parse(b)) : null; }
    catch (x) { stockageOk = false; return null; }
  }
  function enregistrer(d, depuisReseau) {
    if (!depuisReseau && window.CtefaSync) CtefaSync.pousser(d);
    try { localStorage.setItem(CLE, JSON.stringify(d)); }
    catch (x) { stockageOk = false; toast('Impossible d\'enregistrer dans ce navigateur : exportez une sauvegarde tout de suite.', 'erreur'); }
  }
  var E = new C.Ecole(charger(), enregistrer);

  var ui = { classe: null, compo: 1, recherche: '', statut: 'ACTIF', editionEleve: null, editionClasse: null, rapCompo: 1, bulEleve: null };

  /* ---------- outils ---------- */
  function e(v) { return String(v === null || v === undefined ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function dateFr(iso) { if (!iso) return ''; var p = String(iso).slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; }
  function nb(x) { return x === null || x === undefined ? '—' : String(x).replace('.', ','); }
  function toast(msg, type) {
    var t = document.createElement('div'); t.className = 'toast ' + (type || ''); t.textContent = msg;
    var z = $('#toasts'); while (z.children.length >= 3) z.firstChild.remove(); z.appendChild(t);
    setTimeout(function () { t.remove(); }, type === 'erreur' ? 6000 : 3500);
  }
  function agir(fn, succes) {
    try { var r = fn(); if (succes) toast(typeof succes === 'function' ? succes(r) : succes, 'succes'); rendre(); return r; }
    catch (err) { if (err instanceof C.Erreur) toast(err.message, 'erreur'); else { console.error(err); toast('Erreur inattendue : ' + err.message, 'erreur'); } }
  }
  function telecharger(contenu, nom, type) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([contenu], { type: type })); a.download = nom;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function selectClasses(nom, choisi, vide) {
    var h = '<select name="' + nom + '"' + (nom === 'classe-choix' ? ' id="classe-choix"' : '') + '>' + (vide ? '<option value="">' + vide + '</option>' : '');
    E.classesTriees().forEach(function (c) { h += '<option value="' + c.id + '"' + (c.id === choisi ? ' selected' : '') + '>' + e(c.nom) + '</option>'; });
    return h + '</select>';
  }
  function selectNiveaux(choisi) {
    var h = '<select name="niveau" required><option value="">— niveau —</option>', cyc = '';
    C.ORDRE.forEach(function (k) {
      if (NIV[k].cycle !== cyc) { if (cyc) h += '</optgroup>'; cyc = NIV[k].cycle; h += '<optgroup label="' + { ELEMENTAIRE: 'Élémentaire et Majaalis', MOYEN: 'Moyen', SECONDAIRE: 'Secondaire' }[cyc] + '">'; }
      h += '<option value="' + k + '"' + (k === choisi ? ' selected' : '') + '>' + e(NIV[k].nom) + '</option>';
    });
    return h + '</optgroup></select>';
  }
  function selectObj(nom, obj, choisi) {
    return '<select name="' + nom + '">' + Object.keys(obj).map(function (k) { return '<option value="' + k + '"' + (k === choisi ? ' selected' : '') + '>' + e(obj[k]) + '</option>'; }).join('') + '</select>';
  }
  function classeCourante() {
    if (!E.classe(ui.classe)) { var c = E.classesTriees()[0]; ui.classe = c ? c.id : null; }
    return E.classe(ui.classe);
  }
  function carte(titre, corps, pied) {
    return '<div class="carte"><div class="carte-tete"><h3>' + titre + '</h3></div><div class="carte-corps">' + corps + '</div>' + (pied ? '<div class="carte-pied no-print">' + pied + '</div>' : '') + '</div>';
  }
  function chiffre(lib, val, cls) { return '<div class="chiffre"><div class="lib">' + e(lib) + '</div><div class="val ' + (cls || '') + '">' + e(val) + '</div></div>'; }
  function choixCompo(nom, val, avecAnnee) {
    return '<div class="onglets-compo" data-groupe="' + nom + '">' + [1, 2, 3].concat(avecAnnee ? ['A'] : []).map(function (k) {
      return '<button type="button" class="btn petit' + (String(val) === String(k) ? ' plein' : '') + '" data-action="compo" data-cible="' + nom + '" data-val="' + k + '">' +
             (k === 'A' ? 'Année' : k + (k === 1 ? 're' : 'e') + ' compo') + '</button>';
    }).join('') + '</div>';
  }
  function pasDeClasse() {
    return carte('Commencez par créer les classes', '<p>Aucune classe pour l\'instant. Créez-les dans <a href="#classes">Classes</a> : une par une, ou toutes celles d\'un cycle en un geste.</p>');
  }

  /* =================================================================
   *  TABLEAU DE BORD
   * ================================================================= */
  function vueTableau() {
    var el = E.eleves(), cl = E.classesTriees();
    var f = el.filter(function (x) { return x.sexe === 'F'; }).length;
    var h = '<h2 class="titre-vue">Tableau de bord</h2>' + rappelSauvegarde() +
      '<div class="chiffres">' + chiffre('Élèves actifs', el.length) + chiffre('Filles', f) + chiffre('Garçons', el.length - f) + chiffre('Classes', cl.length) + '</div>';
    if (!cl.length) return h + pasDeClasse();
    var lignes = cl.map(function (c) {
      var ee = E.eleves({ classe: c.id }), r = [1, 2, 3].map(function (k) { return E.resultats(c.id, k).stats; });
      return '<tr><td><a href="#notes" data-action="ouvrir-classe" data-id="' + c.id + '">' + e(c.nom) + '</a></td><td class="c">' + ee.length +
        '</td><td class="c">' + ee.filter(function (x) { return x.sexe === 'F'; }).length + '</td>' +
        r.map(function (s) { return '<td class="c">' + (s.moyenne === null ? '—' : nb(s.moyenne) + '<br><span class="aide">' + nb(s.taux) + ' %</span>') + '</td>'; }).join('') + '</tr>';
    }).join('');
    return h + carte('Effectifs et résultats par classe',
      '<div class="table-defil"><table class="tableau"><thead><tr><th>Classe</th><th>Effectif</th><th>Filles</th><th>1re compo</th><th>2e compo</th><th>3e compo</th></tr></thead><tbody>' +
      lignes + '</tbody></table></div><p class="aide">Moyenne de la classe et taux de réussite (élèves ayant au moins la moyenne).</p>');
  }
  function rappelSauvegarde() {
    if (!stockageOk) return '<div class="alerte attention">Ce navigateur bloque l\'enregistrement : vos données seront perdues à la fermeture. Exportez-les dans Paramètres.</div>';
    if (!E.d.eleves.length) return '';
    var der = Number(localStorage.getItem(CLE_ENVOI)) || 0;
    if (Date.now() - der < 7 * 86400000) return '';
    return '<div class="alerte attention no-print">' + (der ? 'Dernière sauvegarde exportée le ' + new Date(der).toLocaleDateString('fr-FR') + '.' : 'Aucune sauvegarde exportée.') +
      ' <button class="btn petit plein" data-action="exporter">⬇ Exporter la sauvegarde</button></div>';
  }

  /* =================================================================
   *  ÉLÈVES
   * ================================================================= */
  function formEleve(x) {
    x = x || { classe_id: ui.classe, sexe: 'M', regime: 'EXTERNE', statut: 'ACTIF' };
    return '<form data-form="eleve"' + (x.id ? ' data-id="' + x.id + '"' : '') + ' class="grille-2">' +
      '<div class="champ"><label>Prénom</label><input name="prenom" required value="' + e(x.prenom) + '"></div>' +
      '<div class="champ"><label>Nom</label><input name="nom" required value="' + e(x.nom) + '"></div>' +
      '<div class="champ"><label>Sexe</label>' + selectObj('sexe', { M: 'Garçon', F: 'Fille' }, x.sexe) + '</div>' +
      '<div class="champ"><label>Classe</label>' + selectClasses('classe_id', x.classe_id) + '</div>' +
      '<div class="champ"><label>Date de naissance</label><input type="date" name="date_naiss" value="' + e(x.date_naiss) + '"></div>' +
      '<div class="champ"><label>Lieu de naissance</label><input name="lieu_naiss" value="' + e(x.lieu_naiss) + '"></div>' +
      '<div class="champ"><label>Parent / tuteur</label><input name="parent" value="' + e(x.parent) + '"></div>' +
      '<div class="champ"><label>Téléphone du parent</label><input name="telephone" inputmode="tel" value="' + e(x.telephone) + '"></div>' +
      '<div class="champ"><label>Adresse</label><input name="adresse" value="' + e(x.adresse) + '"></div>' +
      '<div class="champ"><label>Régime</label>' + selectObj('regime', C.REGIMES, x.regime) + '</div>' +
      (x.id ? '<div class="champ"><label>Statut</label>' + selectObj('statut', C.STATUTS, x.statut) + '</div>' +
              '<div class="champ"><label>Matricule</label><input name="matricule" value="' + e(x.matricule) + '"></div>' : '') +
      '<div class="champ" style="grid-column:1/-1"><label>Observations</label><input name="observations" value="' + e(x.observations) + '"></div>' +
      '<div style="grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap"><button class="btn plein">' + (x.id ? 'Enregistrer les modifications' : 'Inscrire l\'élève') + '</button>' +
      (x.id ? '<button type="button" class="btn" data-action="fermer-eleve">Annuler</button><button type="button" class="btn danger" data-action="suppr-eleve" data-id="' + x.id + '">Supprimer</button>' : '') +
      '</div></form>';
  }
  function vueEleves() {
    var h = '<h2 class="titre-vue">Élèves</h2>';
    if (!E.d.classes.length) return h + pasDeClasse();
    var cc = classeCourante();
    if (ui.editionEleve) h += carte('Modifier la fiche de ' + e(E.eleve(ui.editionEleve).prenom + ' ' + E.eleve(ui.editionEleve).nom), formEleve(E.eleve(ui.editionEleve)));
    else h += '<details class="carte"' + (E.d.eleves.length ? '' : ' open') + '><summary class="carte-tete"><h3>➕ Inscrire un élève</h3></summary><div class="carte-corps">' + formEleve() + '</div></details>';
    h += '<details class="carte"><summary class="carte-tete"><h3>📋 Importer une liste depuis Excel</h3></summary><div class="carte-corps">' +
      '<form data-form="import"><p class="aide" style="margin-top:0">Copiez les colonnes dans Excel puis collez-les ici, une ligne par élève, dans cet ordre : ' +
      '<strong>Prénom · Nom · Sexe (G/F) · Date de naissance · Lieu · Parent · Téléphone</strong>. Seuls le prénom et le nom sont obligatoires.</p>' +
      '<div class="champ"><label>Classe</label>' + selectClasses('classe_id', ui.classe) + '</div>' +
      '<textarea name="texte" rows="6" style="width:100%;font:inherit" placeholder="Awa&#9;DIOP&#9;F&#9;12/03/2015&#9;Touba"></textarea>' +
      '<button class="btn plein" style="margin-top:8px">Importer</button></form></div></details>';
    var liste = E.eleves({ classe: ui.classe === 'TOUTES' ? null : cc.id, recherche: ui.recherche, statut: ui.statut });
    var corps = '<div class="ligne-champs no-print"><div style="flex:1 1 140px"><label>Classe</label><select id="filtre-classe"><option value="TOUTES"' + (ui.classe === 'TOUTES' ? ' selected' : '') + '>Toutes</option>' +
      E.classesTriees().map(function (c) { return '<option value="' + c.id + '"' + (c.id === ui.classe ? ' selected' : '') + '>' + e(c.nom) + '</option>'; }).join('') + '</select></div>' +
      '<div style="flex:1 1 120px"><label>Statut</label><select id="filtre-statut">' + ['ACTIF', 'TOUS', 'INACTIF', 'ABANDON', 'TRANSFERT'].map(function (k) {
        return '<option value="' + k + '"' + (k === ui.statut ? ' selected' : '') + '>' + (k === 'TOUS' ? 'Tous' : C.STATUTS[k]) + '</option>'; }).join('') + '</select></div>' +
      '<div style="flex:2 1 180px"><label>Recherche</label><input type="search" id="recherche" placeholder="Nom, prénom, matricule, téléphone" value="' + e(ui.recherche) + '"></div></div>' +
      '<div class="table-defil"><table class="tableau"><thead><tr><th>N°</th><th>Matricule</th><th>Prénom et nom</th><th>Sexe</th><th class="mm">Né(e) le</th><th>Classe</th><th class="mm">Parent · téléphone</th><th class="no-print"></th></tr></thead><tbody>' +
      (liste.length ? liste.map(function (x, i) {
        return '<tr><td class="c">' + (i + 1) + '</td><td>' + e(x.matricule) + '</td><td><strong>' + e(x.prenom) + ' ' + e(x.nom) + '</strong>' +
          (x.statut !== 'ACTIF' ? ' <span class="pastille">' + C.STATUTS[x.statut] + '</span>' : '') + '</td><td class="c">' + (x.sexe === 'F' ? 'F' : 'G') +
          '</td><td class="mm">' + dateFr(x.date_naiss) + (x.lieu_naiss ? ' à ' + e(x.lieu_naiss) : '') + '</td><td>' + e((E.classe(x.classe_id) || {}).nom) +
          '</td><td class="mm">' + e(x.parent) + (x.telephone ? ' · <a href="tel:' + e(x.telephone) + '">' + e(x.telephone) + '</a>' : '') +
          '</td><td class="no-print"><button class="btn petit" data-action="modif-eleve" data-id="' + x.id + '">Modifier</button></td></tr>';
      }).join('') : '<tr><td colspan="8" class="c aide">Aucun élève.</td></tr>') + '</tbody></table></div>';
    return h + carte('Liste des élèves · ' + liste.length, corps, '<button class="btn" data-action="imprimer-liste">🖨 Imprimer la liste</button><button class="btn" data-action="csv-eleves">⬇ Exporter (Excel/CSV)</button>');
  }

  /* =================================================================
   *  CLASSES
   * ================================================================= */
  function vueClasses() {
    var c = ui.editionClasse ? E.classe(ui.editionClasse) : null;
    var form = '<form data-form="classe"' + (c ? ' data-id="' + c.id + '"' : '') + ' class="grille-2">' +
      '<div class="champ"><label>Nom de la classe</label><input name="nom" required placeholder="ex. CM2 A" value="' + e(c && c.nom) + '"></div>' +
      '<div class="champ"><label>Niveau</label>' + selectNiveaux(c && c.niveau) + '</div>' +
      '<div class="champ"><label>Maître / professeur principal (français)</label><input name="titulaire_fr" value="' + e(c && c.titulaire_fr) + '"></div>' +
      '<div class="champ"><label>Maître d\'arabe</label><input name="titulaire_ar" value="' + e(c && c.titulaire_ar) + '"></div>' +
      '<div class="champ"><label>Salle</label><input name="salle" value="' + e(c && c.salle) + '"></div>' +
      '<div class="champ"><label>Effectif maximum</label><input name="effectif_max" type="number" min="1" value="' + e(c ? c.effectif_max : 50) + '"></div>' +
      '<div style="grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap"><button class="btn plein">' + (c ? 'Enregistrer' : 'Créer la classe') + '</button>' +
      (c ? '<button type="button" class="btn" data-action="fermer-classe">Annuler</button><button type="button" class="btn danger" data-action="suppr-classe" data-id="' + c.id + '">Supprimer</button>' : '') + '</div></form>';
    var rapide = '<p class="aide" style="margin-top:0">Crée une classe par niveau (vous pourrez les renommer, par ex. « CM2 A », et en ajouter d\'autres).</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn" data-action="classes-types" data-niveaux="CI,CP,CE1,CE2,CM1,CM2">Élémentaire (CI → CM2)</button>' +
      '<button class="btn" data-action="classes-types" data-niveaux="MAJ1,MAJ2,MAJ3">Majaalis 1 → 3</button>' +
      '<button class="btn" data-action="classes-types" data-niveaux="6E,5E,4E,3E">Moyen (6e → 3e)</button>' +
      '<button class="btn" data-action="classes-types" data-niveaux="2ND-L,2ND-S,1RE-L1,1RE-L2,1RE-S1,1RE-S2,TLE-L1,TLE-L2,TLE-S1,TLE-S2">Secondaire (2nde → Tle)</button></div>';
    var liste = E.classesTriees().map(function (k) {
      var n = NIV[k.niveau], ee = E.eleves({ classe: k.id });
      return '<tr><td><strong>' + e(k.nom) + '</strong></td><td>' + e(n.nom) + '</td><td class="c">' + ee.length + ' / ' + k.effectif_max + '</td><td class="mm">' + e(k.titulaire_fr) +
        (k.titulaire_ar ? ' · ' + e(k.titulaire_ar) : '') + '</td><td class="c mm">' + n.rubriques.length + ' · sur ' + n.base + '</td>' +
        '<td class="no-print"><button class="btn petit" data-action="modif-classe" data-id="' + k.id + '">Modifier</button> <button class="btn petit" data-action="voir-matieres" data-id="' + k.id + '">Matières</button></td></tr>' +
        (ui.matieres === k.id ? '<tr><td colspan="6">' + tableMatieres(k.niveau) + '</td></tr>' : '');
    }).join('');
    return '<h2 class="titre-vue">Classes</h2>' + carte(c ? 'Modifier ' + e(c.nom) : 'Nouvelle classe', form) + (c ? '' : carte('Création rapide', rapide)) +
      carte('Classes de l\'école', '<div class="table-defil"><table class="tableau"><thead><tr><th>Classe</th><th>Niveau</th><th>Élèves</th><th class="mm">Titulaires</th><th class="mm">Rubriques · notes</th><th class="no-print"></th></tr></thead><tbody>' +
        (liste || '<tr><td colspan="6" class="c aide">Aucune classe.</td></tr>') + '</tbody></table></div>');
  }
  function tableMatieres(code) {
    var n = NIV[code];
    return '<table class="tableau petit-t"><thead><tr><th>Langue</th><th>Matière</th><th>Rubrique</th><th>Barèmes (C1/C2/C3)</th>' + (n.base === 20 ? '<th>Coef</th>' : '') + '</tr></thead><tbody>' +
      n.rubriques.map(function (r) {
        return '<tr><td>' + C.LANGUES[r.langue] + '</td><td>' + e(r.matiere) + '</td><td>' + e(r.rubrique) + '</td><td class="c">' + r.baremes.join(' / ') + '</td>' + (n.base === 20 ? '<td class="c">' + r.coef + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table><p class="aide">Matières et barèmes repris de CTEFA-CLASSIC V3.3.</p>';
  }

  /* =================================================================
   *  SAISIE DES NOTES
   * ================================================================= */
  function vueNotes() {
    var h = '<h2 class="titre-vue">Saisie des notes</h2>';
    if (!E.d.classes.length) return h + pasDeClasse();
    var c = classeCourante(), n = NIV[c.niveau], rubs = n.rubriques, el = E.eleves({ classe: c.id });
    h += '<div class="carte"><div class="carte-corps ligne-champs"><div style="flex:1 1 160px"><label>Classe</label>' + selectClasses('classe-choix', c.id) + '</div>' +
      '<div style="flex:2 1 260px"><label>Composition</label>' + choixCompo('compo', ui.compo) + '</div></div></div>';
    if (!el.length) return h + carte('Aucun élève', '<p>Inscrivez d\'abord les élèves de ' + e(c.nom) + ' dans <a href="#eleves">Élèves</a>.</p>');
    var tete = '<tr><th class="fixe-g">Élève</th>' + rubs.map(function (r) {
      return '<th class="rub" title="' + e(r.matiere + ' — ' + r.rubrique) + '"><span class="lg lg-' + r.langue + '">' + r.langue + '</span><br>' + e(abrege(r.matiere)) + '<br><small>' + e(r.rubrique) + '</small><br><small>/' + r.baremes[ui.compo - 1] + '</small></th>';
    }).join('') + '<th>Moy.</th></tr>';
    var corps = el.map(function (x, i) {
      var m = E.moyennes(x.id, ui.compo);
      return '<tr><td class="fixe-g"><span class="aide">' + (i + 1) + '.</span> ' + e(x.prenom) + ' <strong>' + e(x.nom) + '</strong></td>' + rubs.map(function (r, j) {
        var v = E.note(x.id, ui.compo, r.id);
        return '<td class="cn"><input class="note" inputmode="decimal" autocomplete="off" data-el="' + x.id + '" data-rub="' + r.id + '" data-max="' + r.baremes[ui.compo - 1] + '" data-i="' + i + '" data-j="' + j + '" value="' + (v === null ? '' : String(v).replace('.', ',')) + '"></td>';
      }).join('') + '<td class="c moy" data-moy="' + x.id + '">' + nb(m.generale) + '</td></tr>';
    }).join('');
    var nbNotes = el.reduce(function (s, x) { return s + E.moyennes(x.id, ui.compo).nb_notes; }, 0);
    return h + carte(e(c.nom) + ' · ' + ui.compo + (ui.compo === 1 ? 're' : 'e') + ' composition · ' + nbNotes + ' / ' + el.length * rubs.length + ' notes',
      '<p class="aide" style="margin-top:0">Chaque note est enregistrée dès que vous quittez la case. <strong>Entrée</strong> passe à l\'élève suivant. Laissez vide si l\'élève n\'a pas composé.</p>' +
      '<div class="table-defil grille-notes"><table class="tableau notes"><thead>' + tete + '</thead><tbody>' + corps + '</tbody></table></div>',
      '<a class="btn plein" href="#resultats">Voir les résultats</a>');
  }
  function abrege(m) { return m.replace(/\s*\(.*\)$/, '').replace('Langue et Communication', 'Langue & Com.').replace('Découverte du Monde', 'Découverte').replace('Éducation au Développement Durable', 'EDD'); }

  /* =================================================================
   *  RÉSULTATS
   * ================================================================= */
  function vueResultats() {
    var h = '<h2 class="titre-vue">Résultats, moyennes et rangs</h2>';
    if (!E.d.classes.length) return h + pasDeClasse();
    var c = classeCourante(), R = E.resultats(c.id, ui.rapCompo), s = R.stats, lgs = Object.keys(C.LANGUES).filter(function (lg) {
      return R.lignes.some(function (l) { return l['m_' + lg] !== null; });
    });
    h += '<div class="carte no-print"><div class="carte-corps ligne-champs"><div style="flex:1 1 160px"><label>Classe</label>' + selectClasses('classe-choix', c.id) + '</div>' +
      '<div style="flex:2 1 300px"><label>Période</label>' + choixCompo('rapCompo', ui.rapCompo, true) + '</div></div></div>';
    h += '<div class="chiffres">' + chiffre('Effectif', s.effectif + ' (' + s.filles + ' F)') + chiffre('Moyenne de la classe', nb(s.moyenne)) +
      chiffre('Plus forte / plus faible', nb(s.max) + ' / ' + nb(s.min)) + chiffre('Moyenne atteinte (≥ ' + nb(s.seuil) + ')', s.admis + ' · ' + nb(s.taux) + ' %', s.taux >= 50 ? 'ok' : 'ko') + '</div>';
    var t = '<div class="table-defil"><table class="tableau"><thead><tr><th>Rang</th><th>Élève</th>' + lgs.map(function (lg) { return '<th>' + C.LANGUES[lg] + '</th>'; }).join('') +
      (ui.rapCompo === 'A' ? '<th class="mm">C1</th><th class="mm">C2</th><th class="mm">C3</th>' : '') + '<th>Moyenne</th><th class="mm">Appréciation</th><th class="no-print"></th></tr></thead><tbody>' +
      R.lignes.map(function (l) {
        return '<tr class="' + (l.g === null ? '' : l.g >= s.seuil ? 'paye' : 'impaye') + '"><td class="c"><strong>' + C.rangTexte(l.rang_g, l.exaequo_g, l.eleve.sexe) + '</strong></td><td>' + e(l.eleve.prenom) + ' ' + e(l.eleve.nom) + '</td>' +
          lgs.map(function (lg) { return '<td class="c">' + nb(l['m_' + lg]) + (l['rang_m_' + lg] ? '<br><span class="aide">' + C.rangTexte(l['rang_m_' + lg], l['exaequo_m_' + lg], l.eleve.sexe) + '</span>' : '') + '</td>'; }).join('') +
          (ui.rapCompo === 'A' ? l.compos.map(function (x) { return '<td class="c mm">' + nb(x) + '</td>'; }).join('') : '') +
          '<td class="c"><strong>' + nb(l.g) + '</strong></td><td class="mm">' + C.appreciation(l.g, s.base) + '</td>' +
          '<td class="no-print"><button class="btn petit" data-action="bulletin" data-id="' + l.eleve.id + '">Bulletin</button></td></tr>';
      }).join('') + '</tbody></table></div>';
    return h + carte(e(c.nom) + ' · ' + (ui.rapCompo === 'A' ? 'moyennes annuelles' : ui.rapCompo + (ui.rapCompo === 1 ? 're' : 'e') + ' composition'), t,
      '<button class="btn" data-action="imprimer-resultats">🖨 Imprimer le tableau</button><button class="btn plein" data-action="bulletins-classe">🖨 Tous les bulletins de la classe</button>');
  }

  /* =================================================================
   *  BULLETINS
   * ================================================================= */
  function entete() {
    var ec = E.d.ecole;
    return '<div class="doc-entete"><div class="doc-g">RÉPUBLIQUE DU SÉNÉGAL<br><small>Un Peuple – Un But – Une Foi</small><br>MINISTÈRE DE L\'ÉDUCATION NATIONALE' +
      (ec.ia ? '<br>IA de ' + e(ec.ia) : '') + (ec.ief ? '<br>IEF de ' + e(ec.ief) : '') + '</div>' +
      '<div class="doc-c"><strong>' + e(ec.nom) + '</strong>' + (ec.nom_ar ? '<br><span dir="rtl">' + e(ec.nom_ar) + '</span>' : '') +
      (ec.adresse ? '<br>' + e(ec.adresse) : '') + (ec.telephone ? '<br>Tél. ' + e(ec.telephone) : '') + '</div>' +
      '<div class="doc-d" dir="rtl">جمهورية السنغال<br><small>شعب واحد – هدف واحد – عقيدة واحدة</small><br>وزارة التربية الوطنية<br>Année scolaire ' + e(ec.annee) + '</div></div>';
  }
  function bulletin(eleveId, compo) {
    var x = E.eleve(eleveId), c = E.classe(x.classe_id), n = NIV[c.niveau];
    var R = E.resultats(c.id, compo), l = R.lignes.find(function (y) { return y.eleve.id === eleveId; }), s = R.stats;
    var titre = compo === 'A' ? 'BULLETIN ANNUEL' : 'BULLETIN DE NOTES — ' + compo + (compo === 1 ? 're' : 'e') + ' COMPOSITION';
    var h = '<div class="bulletin">' + entete() + '<h1 class="doc-titre">' + titre + '</h1>' +
      '<table class="doc-info"><tr><td>Élève : <strong>' + e(x.prenom + ' ' + x.nom) + '</strong></td><td>Matricule : ' + e(x.matricule) + '</td><td>Classe : <strong>' + e(c.nom) + '</strong></td></tr>' +
      '<tr><td>Né(e) le ' + (dateFr(x.date_naiss) || '…………') + (x.lieu_naiss ? ' à ' + e(x.lieu_naiss) : '') + '</td><td>Sexe : ' + (x.sexe === 'F' ? 'F' : 'M') + '</td><td>Effectif : ' + s.effectif + '</td></tr></table>';
    if (compo === 'A') {
      h += '<table class="doc-table"><thead><tr><th>Période</th>' + Object.keys(C.LANGUES).filter(function (lg) { return l['m_' + lg] !== null; }).map(function (lg) { return '<th>' + C.LANGUES[lg] + '</th>'; }).join('') + '<th>Moyenne</th><th>Rang</th></tr></thead><tbody>' +
        [1, 2, 3].map(function (k) {
          var Rk = E.resultats(c.id, k), lk = Rk.lignes.find(function (y) { return y.eleve.id === eleveId; });
          return '<tr><td>' + k + (k === 1 ? 're' : 'e') + ' composition</td>' + Object.keys(C.LANGUES).filter(function (lg) { return l['m_' + lg] !== null; }).map(function (lg) { return '<td class="c">' + nb(lk['m_' + lg]) + '</td>'; }).join('') +
            '<td class="c"><strong>' + nb(lk.g) + '</strong></td><td class="c">' + C.rangTexte(lk.rang_g, lk.exaequo_g, x.sexe) + '</td></tr>';
        }).join('') + '<tr class="total"><td>Moyenne annuelle</td>' + Object.keys(C.LANGUES).filter(function (lg) { return l['m_' + lg] !== null; }).map(function (lg) { return '<td class="c">' + nb(l['m_' + lg]) + '</td>'; }).join('') +
        '<td class="c"><strong>' + nb(l.g) + '</strong></td><td class="c"><strong>' + C.rangTexte(l.rang_g, l.exaequo_g, x.sexe) + '</strong></td></tr></tbody></table>';
    } else {
      var m = l.detail;
      Object.keys(C.LANGUES).forEach(function (lg) {
        var mats = m.matieres.filter(function (z) { return z.langue === lg; });
        if (!mats.length) return;
        var ar = lg === 'AR';
        h += '<table class="doc-table"' + (ar ? ' dir="rtl"' : '') + '><thead><tr><th colspan="' + (n.base === 20 ? 6 : 4) + '">' + (ar ? 'المواد العربية — Arabe' : C.LANGUES[lg]) + '</th></tr><tr>' +
          (n.base === 20 ? '<th>Matière</th><th>Devoirs</th><th>Compo.</th><th>Moy./20</th><th>Coef</th><th>Appréciation</th>'
                         : '<th>' + (ar ? 'المادة' : 'Matière') + '</th><th>' + (ar ? 'الفرع' : 'Rubrique') + '</th><th>' + (ar ? 'الدرجة' : 'Note') + '</th><th>' + (ar ? 'المجموع' : 'Total matière') + '</th>') + '</tr></thead><tbody>';
        mats.forEach(function (z) {
          if (n.base === 20) {
            var dv = z.rubriques.filter(function (r) { return /^devoir/i.test(r.rubrique) && r.note !== null; }), cp = z.rubriques.find(function (r) { return /^composition/i.test(r.rubrique); });
            h += '<tr><td>' + e(z.matiere) + '</td><td class="c">' + (dv.length ? nb(C.arrondi(dv.reduce(function (s2, r) { return s2 + r.note; }, 0) / dv.length)) : '—') + '</td><td class="c">' + nb(cp && cp.note) +
              '</td><td class="c"><strong>' + nb(z.note) + '</strong></td><td class="c">' + z.coef + '</td><td>' + C.appreciation(z.note, 20) + '</td></tr>';
          } else {
            z.rubriques.forEach(function (r, i) {
              h += '<tr>' + (i === 0 ? '<td rowspan="' + z.rubriques.length + '">' + e(z.matiere) + '</td>' : '') + '<td>' + e(r.rubrique) + '</td><td class="c">' + (r.note === null ? '—' : '<span dir="ltr">' + nb(r.note) + ' / ' + r.bareme + '</span>') + '</td>' +
                (i === 0 ? '<td class="c" rowspan="' + z.rubriques.length + '"><strong>' + (z.note === null ? '—' : '<span dir="ltr">' + nb(z.total) + ' / ' + z.bareme + '</span>') + '</strong></td>' : '') + '</tr>';
            });
          }
        });
        h += '<tr class="total"><td colspan="' + (n.base === 20 ? 3 : 3) + '">' + (ar ? 'المعدل' : 'Moyenne ' + C.LANGUES[lg].toLowerCase()) + '</td><td class="c" colspan="' + (n.base === 20 ? 3 : 1) + '"><strong dir="ltr">' + nb(m.langues[lg]) + ' / ' + n.base + '</strong>' +
          (l['rang_m_' + lg] ? ' · ' + C.rangTexte(l['rang_m_' + lg], l['exaequo_m_' + lg], x.sexe) : '') + '</td></tr></tbody></table>';
      });
    }
    var appr = compo === 'A' ? '' : E.appreciationMaitre(eleveId, compo);
    var dec = compo === 'A' ? E.propositions(c.id).find(function (p) { return p.ligne.eleve.id === eleveId; }) : null;
    h += '<table class="doc-table resume"><tr><td>Moyenne générale<br><strong class="gros">' + nb(l.g) + ' / ' + n.base + '</strong></td><td>Rang<br><strong class="gros">' + (C.rangTexte(l.rang_g, l.exaequo_g, x.sexe) || '—') + '</strong> sur ' + s.classes + '</td>' +
      '<td>Moyenne de la classe : ' + nb(s.moyenne) + '<br>Plus forte : ' + nb(s.max) + ' · Plus faible : ' + nb(s.min) + '</td>' +
      '<td>Appréciation<br><strong>' + C.appreciation(l.g, n.base) + '</strong><br><span dir="rtl">' + C.appreciationAr(l.g, n.base) + '</span></td></tr></table>' +
      (appr ? '<p class="doc-texte"><strong>Observation du maître :</strong> ' + e(appr) + '</p>' : '') +
      (dec ? '<p class="doc-texte"><strong>Décision du conseil :</strong> ' + C.DECISIONS[dec.decision || dec.proposition] + (dec.decision ? '' : ' (proposition)') + '</p>' : '') +
      '<table class="doc-signatures"><tr><td>Le maître<br>' + e(c.titulaire_fr) + '</td><td>Le maître d\'arabe<br>' + e(c.titulaire_ar) + '</td><td>Le directeur<br>' + e(E.d.ecole.directeur) + '</td><td>Le parent</td></tr></table></div>';
    return h;
  }
  function imprimer(html) {
    $('#impression').innerHTML = html;
    document.body.classList.add('mode-document');
    setTimeout(function () { window.print(); }, 100);
  }
  window.addEventListener('afterprint', function () { document.body.classList.remove('mode-document'); $('#impression').innerHTML = ''; });

  function vueBulletins() {
    var h = '<h2 class="titre-vue">Bulletins</h2>';
    if (!E.d.classes.length) return h + pasDeClasse();
    var c = classeCourante(), el = E.eleves({ classe: c.id });
    if (!el.some(function (x) { return x.id === ui.bulEleve; })) ui.bulEleve = el.length ? el[0].id : null;
    h += '<div class="carte no-print"><div class="carte-corps ligne-champs"><div style="flex:1 1 140px"><label>Classe</label>' + selectClasses('classe-choix', c.id) + '</div>' +
      '<div style="flex:2 1 180px"><label>Élève</label><select id="bul-eleve">' + el.map(function (x) { return '<option value="' + x.id + '"' + (x.id === ui.bulEleve ? ' selected' : '') + '>' + e(x.nom + ' ' + x.prenom) + '</option>'; }).join('') + '</select></div>' +
      '<div style="flex:2 1 300px"><label>Période</label>' + choixCompo('rapCompo', ui.rapCompo, true) + '</div></div></div>';
    if (!ui.bulEleve) return h + carte('Aucun élève', '<p>Cette classe n\'a pas encore d\'élèves.</p>');
    var obs = ui.rapCompo === 'A' ? '' : '<form data-form="appreciation" class="ligne-champs no-print" style="margin-top:10px"><div style="flex:1 1 260px"><label>Observation du maître pour ce bulletin</label>' +
      '<input name="texte" value="' + e(E.appreciationMaitre(ui.bulEleve, ui.rapCompo)) + '" placeholder="ex. Bon travail, doit soigner l\'écriture"></div><button class="btn fixe" style="align-self:flex-end">Enregistrer</button></form>';
    return h + '<div class="carte"><div class="carte-corps apercu-doc">' + bulletin(ui.bulEleve, ui.rapCompo) + '</div><div class="carte-pied no-print">' +
      '<button class="btn plein" data-action="imprimer-bulletin">🖨 Imprimer ce bulletin</button><button class="btn" data-action="bulletins-classe">🖨 Toute la classe</button>' + obs + '</div></div>';
  }

  /* =================================================================
   *  DÉCISIONS DE FIN D'ANNÉE
   * ================================================================= */
  function vueDecisions() {
    var h = '<h2 class="titre-vue">Décisions de fin d\'année</h2>';
    if (!E.d.classes.length) return h + pasDeClasse();
    var c = classeCourante(), n = NIV[c.niveau], P = E.propositions(c.id);
    h += '<div class="carte no-print"><div class="carte-corps ligne-champs"><div style="flex:1 1 160px"><label>Classe</label>' + selectClasses('classe-choix', c.id) + '</div>' +
      '<p class="aide" style="flex:3 1 260px;margin:0">Proposition automatique d\'après la moyenne annuelle (seuil ' + nb(n.seuil) + ' / ' + n.base + '). ' +
      (n.suivant ? 'Niveau suivant : <strong>' + NIV[n.suivant].nom + '</strong>.' : 'Dernière classe du cycle.') + ' Confirmez ou corrigez chaque décision.</p></div></div>';
    var t = '<div class="table-defil"><table class="tableau"><thead><tr><th>Élève</th><th>Moy. annuelle</th><th>Rang</th><th>Proposition</th><th>Décision</th></tr></thead><tbody>' +
      P.map(function (p) {
        var l = p.ligne;
        return '<tr><td>' + e(l.eleve.prenom + ' ' + l.eleve.nom) + '</td><td class="c"><strong>' + nb(l.g) + '</strong></td><td class="c">' + C.rangTexte(l.rang_g, l.exaequo_g, l.eleve.sexe) + '</td>' +
          '<td>' + C.DECISIONS[p.proposition] + '</td><td><select class="decision" data-id="' + l.eleve.id + '"><option value="">— à décider —</option>' +
          ['PASSAGE', 'REDOUBLEMENT', 'FIN_CYCLE', 'EXCLUSION', 'ABANDON'].map(function (k) { return '<option value="' + k + '"' + (p.decision === k ? ' selected' : '') + '>' + C.DECISIONS[k] + '</option>'; }).join('') + '</select></td></tr>';
      }).join('') + '</tbody></table></div>';
    var sansDec = P.filter(function (p) { return !p.decision && p.proposition !== 'SANS_NOTE'; }).length;
    h += carte(e(c.nom) + ' · ' + P.length + ' élève(s)', t, '<button class="btn plein" data-action="valider-propositions">✔ Valider toutes les propositions (' + sansDec + ')</button><button class="btn" data-action="imprimer-decisions">🖨 Imprimer</button>');
    h += carte('Passer à l\'année suivante', '<p class="aide" style="margin-top:0">Quand toutes les décisions sont prises : les élèves admis passent dans la classe du niveau suivant, les redoublants restent, les sortants deviennent inactifs. ' +
      'Les notes de l\'année sont archivées dans la sauvegarde. Exportez une sauvegarde avant.</p><button class="btn danger" data-action="nouvelle-annee">Passer à l\'année ' + e(anneeSuivante()) + '…</button>');
    return h;
  }
  function anneeSuivante() { var a = parseInt(String(E.d.ecole.annee).slice(0, 4), 10) || new Date().getFullYear(); return (a + 1) + '-' + (a + 2); }

  /* =================================================================
   *  PARAMÈTRES
   * ================================================================= */
  function vueParametres() {
    var ec = E.d.ecole;
    var champ = function (n, lib, ph) { return '<div class="champ"><label>' + lib + '</label><input name="' + n + '" value="' + e(ec[n]) + '"' + (ph ? ' placeholder="' + ph + '"' : '') + (n === 'nom_ar' ? ' dir="rtl"' : '') + '></div>'; };
    return '<h2 class="titre-vue">Paramètres</h2><div class="grille-2">' +
      carte('L\'école', '<form data-form="ecole">' + champ('nom', 'Nom de l\'école') + champ('nom_ar', 'Nom en arabe (facultatif)') + champ('ia', 'IA', 'Diourbel') + champ('ief', 'IEF', 'Mbacké') +
        champ('code', 'Code de l\'école') + champ('adresse', 'Adresse') + champ('telephone', 'Téléphone') + champ('directeur', 'Directeur / directrice') + champ('annee', 'Année scolaire', '2026-2027') +
        '<div class="champ"><label>Statut</label>' + selectObj('statut', { PUBLIQUE: 'Publique', PRIVEE: 'Privée' }, ec.statut) + '</div><button class="btn plein">Enregistrer</button></form>') +
      carte('Sauvegarde des données', '<p class="aide" style="margin-top:0">Les données restent dans ce navigateur. Exportez une sauvegarde après chaque saisie importante et gardez-la hors du téléphone (WhatsApp, e-mail, clé USB).</p>' +
        (window.CtefaSync ? CtefaSync.carte() : '') +
        '<div class="ligne-champs"><button class="btn plein fixe" data-action="exporter">⬇ Exporter la sauvegarde</button>' +
        '<label class="btn fixe" style="margin:0">Importer une sauvegarde<input type="file" id="import" accept=".json,application/json" hidden></label></div>' +
        '<p class="aide">Taille des données : ' + Math.ceil(E.exporter().length / 1024) + ' Ko.</p>',
        '<button class="btn" data-action="exemple">Charger des données d\'exemple</button><button class="btn danger" data-action="effacer">Tout effacer</button>') + '</div>' +
      carte('Règles de calcul', '<ul class="liste"><li><strong>Élémentaire et Majaalis</strong> (notes sur 10) : moyenne d\'une langue = total des notes ÷ total des barèmes × 10 ; moyenne générale = moyenne des langues (français, arabe, langue nationale).</li>' +
        '<li><strong>Moyen et secondaire</strong> (notes sur 20) : note de matière = (moyenne des devoirs + composition) ÷ 2 ; moyenne = Σ(note × coefficient) ÷ Σ coefficients.</li>' +
        '<li>Une rubrique sans note n\'est pas comptée. Les élèves à égalité partagent le rang (ex aequo).</li><li>Moyenne annuelle = moyenne des compositions notées.</li></ul>');
  }

  /* =================================================================
   *  DONNÉES D'EXEMPLE (noms fictifs)
   * ================================================================= */
  function donneesExemple() {
    var X = new C.Ecole(null), pr = ['Awa', 'Moussa', 'Fatou', 'Ibrahima', 'Aminata', 'Cheikh', 'Khady', 'Mamadou', 'Ndeye', 'Ousmane', 'Mariama', 'Abdou'],
        no = ['DIOP', 'FALL', 'NDIAYE', 'SOW', 'GUEYE', 'MBAYE', 'SARR', 'KA', 'CISSE', 'FAYE', 'BA', 'NIANG'];
    X.setEcole({ nom: 'ÉCOLE EXEMPLE', ia: 'Diourbel', ief: 'Mbacké', directeur: 'M. Directeur', adresse: 'Village', telephone: '77 000 00 00' });
    var ids = [X.enregistrerClasse({ nom: 'CM2 A', niveau: 'CM2', titulaire_fr: 'M. Sarr', titulaire_ar: 'Oustaz Mbaye' }), X.enregistrerClasse({ nom: 'CE1', niveau: 'CE1' }), X.enregistrerClasse({ nom: '6e A', niveau: '6E' })];
    ids.forEach(function (cid, k) {
      for (var i = 0; i < 10; i++) {
        var id = X.enregistrerEleve({ prenom: pr[(i + k * 3) % 12], nom: no[(i * 5 + k) % 12], sexe: i % 2 ? 'M' : 'F', classe_id: cid, date_naiss: (2012 + k + i % 3) + '-0' + (1 + i % 9) + '-1' + (i % 9), lieu_naiss: 'Mbacké' });
        [1, 2].forEach(function (cp) {
          X.rubriques(cid).forEach(function (r) { var b = r.baremes[cp - 1]; X.setNote(id, cp, r.id, Math.round(b * (0.3 + ((i * 7 + r.id * 3 + cp) % 13) / 18) * 2) / 2, true); });
        });
      }
    });
    return X.d;
  }

  /* =================================================================
   *  RENDU, NAVIGATION, ÉVÉNEMENTS
   * ================================================================= */
  var VUES = { tableau: vueTableau, eleves: vueEleves, classes: vueClasses, notes: vueNotes, resultats: vueResultats, bulletins: vueBulletins, decisions: vueDecisions, parametres: vueParametres };
  function vueCourante() { var v = location.hash.slice(1); return VUES[v] ? v : 'tableau'; }
  function rendre() {
    var v = vueCourante();
    $('#vue').innerHTML = VUES[v]();
    $$('#nav a').forEach(function (a) { a.classList.toggle('actif', a.getAttribute('href') === '#' + v); });
    $('#nom-ecole').textContent = E.d.ecole.nom;
    $('#info-annee').textContent = 'Année scolaire ' + E.d.ecole.annee;
    document.title = E.d.ecole.nom + ' · CTEFA-CLASSIC';
  }
  window.addEventListener('hashchange', function () { ui.editionEleve = null; ui.editionClasse = null; rendre(); window.scrollTo(0, 0); });

  window.CtefaApp = {
    donnees: function () { return E.d; },
    recues: function (d, remplacer) { if (remplacer) E = new C.Ecole(C.Ecole.valider(d), enregistrer); enregistrer(E.d, true); rendreQuandLibre(); },
    toast: toast, rendre: function () { rendre(); }, Ecole: C.Ecole
  };
  var attente = null;
  function rendreQuandLibre() {
    clearTimeout(attente);
    var a = document.activeElement;
    if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.closest('#vue')) { attente = setTimeout(rendreQuandLibre, 1500); return; }
    rendre();
  }

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-action]');
    if (!el) return;
    var id = Number(el.dataset.id), a = el.dataset.action;
    switch (a) {
      case 'compo': ui[el.dataset.cible] = el.dataset.val === 'A' ? 'A' : Number(el.dataset.val); rendre(); break;
      case 'ouvrir-classe': ui.classe = id; break;
      case 'modif-eleve': ui.editionEleve = id; rendre(); window.scrollTo(0, 0); break;
      case 'fermer-eleve': ui.editionEleve = null; rendre(); break;
      case 'suppr-eleve':
        if (confirm('Supprimer définitivement cet élève et toutes ses notes ?\n(Pour un élève parti, mettez plutôt son statut à « Abandon » ou « Transféré ».)'))
          agir(function () { E.supprimerEleve(id); ui.editionEleve = null; }, 'Élève supprimé.');
        break;
      case 'modif-classe': ui.editionClasse = id; rendre(); window.scrollTo(0, 0); break;
      case 'fermer-classe': ui.editionClasse = null; rendre(); break;
      case 'suppr-classe': if (confirm('Supprimer cette classe ?')) agir(function () { E.supprimerClasse(id); ui.editionClasse = null; }, 'Classe supprimée.'); break;
      case 'voir-matieres': ui.matieres = ui.matieres === id ? null : id; rendre(); break;
      case 'classes-types': agir(function () { return E.creerClassesTypes(el.dataset.niveaux.split(',')); }, function (n) { return n ? n + ' classe(s) créée(s).' : 'Ces classes existent déjà.'; }); break;
      case 'imprimer-liste': {
        var c = ui.classe === 'TOUTES' ? null : classeCourante(), l = E.eleves({ classe: c && c.id, statut: ui.statut });
        imprimer('<div class="bulletin">' + entete() + '<h1 class="doc-titre">LISTE DES ÉLÈVES' + (c ? ' — ' + e(c.nom) : '') + '</h1><table class="doc-table"><thead><tr><th>N°</th><th>Matricule</th><th>Prénom et nom</th><th>Sexe</th><th>Date et lieu de naissance</th><th>Parent</th><th>Téléphone</th></tr></thead><tbody>' +
          l.map(function (x, i) { return '<tr><td class="c">' + (i + 1) + '</td><td>' + e(x.matricule) + '</td><td>' + e(x.prenom + ' ' + x.nom) + '</td><td class="c">' + (x.sexe === 'F' ? 'F' : 'G') + '</td><td>' + dateFr(x.date_naiss) + (x.lieu_naiss ? ' à ' + e(x.lieu_naiss) : '') + '</td><td>' + e(x.parent) + '</td><td>' + e(x.telephone) + '</td></tr>'; }).join('') +
          '</tbody></table><p>Effectif : ' + l.length + ' (' + l.filter(function (x) { return x.sexe === 'F'; }).length + ' filles)</p></div>');
        break;
      }
      case 'csv-eleves': {
        var rows = [['Matricule', 'Prénom', 'Nom', 'Sexe', 'Date de naissance', 'Lieu', 'Classe', 'Parent', 'Téléphone', 'Adresse', 'Régime', 'Statut']];
        E.eleves({ statut: 'TOUS' }).forEach(function (x) { rows.push([x.matricule, x.prenom, x.nom, x.sexe, dateFr(x.date_naiss), x.lieu_naiss, (E.classe(x.classe_id) || {}).nom, x.parent, x.telephone, x.adresse, C.REGIMES[x.regime], C.STATUTS[x.statut]]); });
        telecharger('﻿' + rows.map(function (r) { return r.map(function (v) { return '"' + String(v || '').replace(/"/g, '""') + '"'; }).join(';'); }).join('\r\n'), 'eleves.csv', 'text/csv');
        break;
      }
      case 'bulletin': ui.bulEleve = id; location.hash = '#bulletins'; break;
      case 'imprimer-bulletin': imprimer(bulletin(ui.bulEleve, ui.rapCompo)); break;
      case 'bulletins-classe': {
        var cc = classeCourante();
        imprimer(E.eleves({ classe: cc.id }).map(function (x) { return bulletin(x.id, ui.rapCompo); }).join('<div class="saut"></div>'));
        break;
      }
      case 'imprimer-resultats': {
        var vue = $('#vue').cloneNode(true); $$('.no-print', vue).forEach(function (n) { n.remove(); });
        imprimer('<div class="bulletin">' + entete() + vue.innerHTML + '</div>'); break;
      }
      case 'imprimer-decisions': {
        var v2 = $('#vue').cloneNode(true); $$('.no-print', v2).forEach(function (n) { n.remove(); });
        $$('select', v2).forEach(function (s) { var o = s.options[s.selectedIndex]; s.replaceWith(document.createTextNode(o ? o.text : '')); });
        imprimer('<div class="bulletin">' + entete() + v2.innerHTML + '</div>'); break;
      }
      case 'valider-propositions':
        agir(function () { var n = 0; E.propositions(classeCourante().id).forEach(function (p) { if (!p.decision && p.proposition !== 'SANS_NOTE') { E.setDecision(p.ligne.eleve.id, p.proposition); n++; } }); return n; },
             function (n) { return n + ' décision(s) enregistrée(s).'; });
        break;
      case 'nouvelle-annee': nouvelleAnnee(); break;
      case 'exporter':
        telecharger(E.exporter(), 'ctefa_' + E.d.ecole.nom.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + new Date().toISOString().slice(0, 10) + '.json', 'application/json');
        try { localStorage.setItem(CLE_ENVOI, String(Date.now())); } catch (x) { /* ignore */ }
        toast('Sauvegarde téléchargée : gardez-la hors du téléphone.', 'succes'); rendre(); break;
      case 'exemple':
        if (!E.d.eleves.length || confirm('Remplacer toutes les données par des données d\'exemple ?')) { E = new C.Ecole(donneesExemple(), enregistrer); enregistrer(E.d); toast('Données d\'exemple chargées.', 'succes'); location.hash = '#tableau'; rendre(); }
        break;
      case 'effacer':
        if (confirm('Effacer TOUTES les données de ce navigateur ?') && confirm('Vraiment tout effacer ? Exportez d\'abord une sauvegarde.')) { E = new C.Ecole(null, enregistrer); enregistrer(E.d); toast('Données effacées.', 'succes'); rendre(); }
        break;
    }
  });

  function nouvelleAnnee() {
    var an = prompt('Nouvelle année scolaire :', anneeSuivante());
    if (!an) return;
    var corr = {}, manque = [];
    E.classesTriees().forEach(function (c) {
      var suiv = NIV[c.niveau].suivant; if (!suiv) return;
      var cibles = E.d.classes.filter(function (k) { return k.niveau === suiv; });
      if (cibles.length === 1) corr[c.id] = cibles[0].id;
      else if (cibles.length > 1) { var lettre = (c.nom.match(/\s([A-Z])$/) || [])[1]; var t = cibles.find(function (k) { return lettre && k.nom.slice(-1) === lettre; }); corr[c.id] = (t || cibles[0]).id; }
      else manque.push(c.nom + ' → ' + NIV[suiv].nom);
    });
    if (manque.length && !confirm('Pas de classe pour : ' + manque.join(', ') + '.\nCes élèves admis resteront dans leur classe actuelle. Continuer ?')) return;
    if (!confirm('Passer à ' + an + ' ? Les notes de ' + E.d.ecole.annee + ' seront archivées et les élèves admis changeront de classe.')) return;
    agir(function () { return E.nouvelleAnnee(an, corr); }, function (b) { return b.passes + ' passage(s), ' + b.redoublants + ' redoublant(s), ' + b.sortis + ' sortie(s), ' + b.sans + ' sans décision.'; });
  }

  document.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.id === 'classe-choix' || t.id === 'filtre-classe') { ui.classe = t.value === 'TOUTES' ? 'TOUTES' : Number(t.value); rendre(); }
    else if (t.id === 'filtre-statut') { ui.statut = t.value; rendre(); }
    else if (t.id === 'bul-eleve') { ui.bulEleve = Number(t.value); rendre(); }
    else if (t.classList.contains('decision')) { if (t.value) agir(function () { E.setDecision(Number(t.dataset.id), t.value); }); }
    else if (t.classList.contains('note')) saisirNote(t);
    else if (t.id === 'import' && t.files[0]) {
      var r = new FileReader();
      r.onload = function () {
        try {
          var d = C.Ecole.valider(JSON.parse(r.result));
          if (!confirm('Remplacer les données actuelles par cette sauvegarde (' + d.eleves.length + ' élèves) ?')) return;
          E = new C.Ecole(d, enregistrer); enregistrer(E.d); toast('Sauvegarde importée.', 'succes'); location.hash = '#tableau'; rendre();
        } catch (err) { toast(err instanceof C.Erreur ? err.message : 'Fichier illisible.', 'erreur'); }
      };
      r.readAsText(t.files[0]);
    }
  });
  document.addEventListener('input', function (ev) {
    if (ev.target.id === 'recherche') {
      ui.recherche = ev.target.value; var pos = ev.target.selectionStart; rendre();
      var r = $('#recherche'); r.focus(); r.setSelectionRange(pos, pos);
    }
  });
  function saisirNote(t) {
    try {
      E.setNote(Number(t.dataset.el), ui.compo, Number(t.dataset.rub), t.value.trim());
      t.classList.remove('faux'); t.classList.add('ok');
      var m = E.moyennes(Number(t.dataset.el), ui.compo), cel = $('[data-moy="' + t.dataset.el + '"]');
      if (cel) cel.textContent = nb(m.generale);
    } catch (err) { t.classList.add('faux'); toast(err.message, 'erreur'); }
  }
  document.addEventListener('keydown', function (ev) {
    var t = ev.target;
    if (!t.classList || !t.classList.contains('note')) return;
    if (ev.key === 'Enter' || ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      var i = Number(t.dataset.i) + (ev.key === 'ArrowUp' ? -1 : 1), j = t.dataset.j;
      var n = $('.note[data-i="' + i + '"][data-j="' + j + '"]') || (ev.key === 'Enter' ? $('.note[data-i="0"][data-j="' + (Number(j) + 1) + '"]') : null);
      if (n) { n.focus(); n.select(); } else t.blur();
    }
  });

  document.addEventListener('submit', function (ev) {
    var f = ev.target, type = f.dataset.form;
    if (!type) return;
    ev.preventDefault();
    var v = function (n) { return f.elements[n] ? f.elements[n].value : ''; }, id = Number(f.dataset.id) || null;
    if (type === 'eleve') {
      var info = {}; ['prenom', 'nom', 'sexe', 'classe_id', 'date_naiss', 'lieu_naiss', 'parent', 'telephone', 'adresse', 'regime', 'statut', 'matricule', 'observations'].forEach(function (k) { info[k] = v(k); });
      agir(function () { var r = E.enregistrerEleve(info, id); ui.classe = Number(info.classe_id); ui.editionEleve = null; return r; }, id ? 'Fiche modifiée.' : 'Élève inscrit.');
      if (!id) setTimeout(function () { var p = $('form[data-form=eleve] [name=prenom]'); if (p) { p.closest('details').open = true; p.focus(); } }, 50);
    } else if (type === 'classe') {
      var ci = {}; ['nom', 'niveau', 'salle', 'titulaire_fr', 'titulaire_ar', 'effectif_max'].forEach(function (k) { ci[k] = v(k); });
      agir(function () { var r = E.enregistrerClasse(ci, id); ui.editionClasse = null; return r; }, id ? 'Classe modifiée.' : 'Classe créée.');
    } else if (type === 'import') {
      agir(function () { return E.importerEleves(v('texte'), Number(v('classe_id'))); }, function (r) {
        ui.classe = Number(v('classe_id'));
        return r.ok + ' élève(s) importé(s).' + (r.erreurs.length ? ' ' + r.erreurs.length + ' ligne(s) ignorée(s) : ' + r.erreurs.slice(0, 2).join(' ; ') : '');
      });
    } else if (type === 'ecole') {
      var ec = {}; ['nom', 'nom_ar', 'ia', 'ief', 'code', 'adresse', 'telephone', 'directeur', 'annee', 'statut'].forEach(function (k) { ec[k] = v(k); });
      agir(function () { E.setEcole(ec); }, 'École enregistrée.');
    } else if (type === 'appreciation') {
      agir(function () { E.setAppreciation(ui.bulEleve, ui.rapCompo, v('texte')); }, 'Observation enregistrée.');
    }
  });

  /* ---------- application installable ---------- */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});

  rendre();
})();
