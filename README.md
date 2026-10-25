# CTEFA-CLASSIC Web

Gestion scolaire multi-utilisateurs (direction, secrétariat, caisse, enseignants) sur des données partagées en temps réel. Tout tient dans un seul fichier : `docs/index.html`.

## Étape 1 — le socle (cette version)
- Premier démarrage : création de l'école (nom, type, nature, année, cycles) et de l'administrateur principal.
- 7 rôles, 15 droits personnalisables par compte, menus filtrés selon les droits, droits revérifiés par les règles de la base.
- Mot de passe provisoire changé à la première connexion ; blocage 15 min après 5 erreurs sur l'appareil.
- Journal des accès (connexions, refus, comptes, sauvegardes), export CSV.
- Fiche de l'école : identité, coordonnées, signataire, logo, cachet, cycles.
- Référentiels repris de CTEFA V3.4 : 26 niveaux (préscolaire → terminale), 527 rubriques de matières, listes, catégories de caisse, tarifs. Copie des matières d'un niveau à l'autre, « Réparer les référentiels ».
- Temps réel : chaque modification apparaît chez les autres sans recharger ; travail hors ligne puis envoi automatique ; témoin En ligne / Hors ligne / Envoi.
- Verrouillage optimiste : si deux personnes modifient la même chose, la seconde est prévenue (« modifié par X il y a 2 min ») et choisit d'écraser ou de garder.
- Compteurs atomiques (matricules, reçus, documents) prêts pour les étapes suivantes.
- Qui est connecté (nom, rôle, écran) et fil d'activité.
- Sauvegarde .json, restauration (administrateur principal, mot de passe redemandé, copie automatique avant), mode maintenance.
- Mode clair / sombre, adapté au téléphone.

## Étape 2 — élèves et personnel
- **Fiche élève en 3 onglets** (identité avec noms en arabe, famille et contacts, scolarité). Date de naissance tapée en 8 chiffres (JJMMAAAA), mise en forme automatique.
- **Matricule automatique et unique** : compteur en transaction + réservation du numéro dans la base (deux postes ne peuvent jamais obtenir le même). Modèle réglable dans École (`{AAAA}{NNNN}`, `{NIV}`, `{CLASSE}`). Hors ligne : matricule provisoire remplacé au retour du réseau.
- **Contrôles** : champs obligatoires, date impossible ou âge improbable, téléphone sénégalais, classe inexistante, matricule en double, homonyme (même nom et date de naissance) avec case « Forcer ».
- **Registre** filtrable (classe, statut, sexe, recherche), triable, paginé par 100, export CSV et impression avec en-tête de l'école et visa du chef d'établissement.
- **Sorties** avec motif et date ; **réinscription rapide** des inactifs avec la classe suivante proposée.
- **Import** en 5 étapes : coller depuis Excel ou fichier CSV / Excel → aperçu → correspondance des colonnes (devinée automatiquement) → rapport ligne par ligne (colonne RAPPORT, export CSV) → import.
- **Personnel** : fiche complète (les 29 champs de la feuille PERSONNEL V3.4), sexe pour les accords, langue, fonction, classes tenues qui alimentent les titulaires des classes.
- **Affectations** classe × matière (une seule par couple, sans doublon).
- **Répartition des enseignants d'arabe** : proposition automatique sur toutes les matières en langue arabe, équilibrée par nombre d'élèves, corrigeable, puis validée en affectations.
- **7 listes du personnel** : nominative, contacts, émargement (titre et colonnes vides au choix), fiche IEF, affectations, effectifs par classe, colonnes au choix ; filtres fonction / langue / sexe, tri, visa « Le Directeur / La Directrice » déduit du registre.
- **Import / export du personnel** (CSV, mise à jour par matricule) et **purge** (cases à cocher, double confirmation avec le mot PURGER, mot de passe redemandé, sauvegarde automatique avant, journal).
- Correctifs de l'étape 1 : messages Firebase en français, refus clair d'une adresse e-mail à la place de l'identifiant, un formulaire en cours de saisie n'est plus effacé par une mise à jour venue d'un autre poste.

- **Noms en arabe calculés automatiquement** (élèves et personnel : saisie, import, registre) : 1) dictionnaire de l'école, qui apprend chaque correction ; 2) dictionnaire intégré des prénoms et noms sénégalais courants ; 3) transcription phonétique, signalée « à vérifier ». Bouton « ✨ Compléter les noms en arabe » dans le registre pour traiter tous les élèves d'un coup.

- **Purges** (administrateurs) : élèves (par classe, statut, année d'entrée ; matricules libérés), classes (avec ou sans leurs élèves ; affectations et classes tenues nettoyées), matières d'un niveau (« Réparer les référentiels » les remet). Chaque purge : confirmation, mot PURGER, mot de passe, sauvegarde automatique avant, journal.

**Après la mise à jour : republier les règles** (`firestore.rules` → Firestore → Règles → Publier) : elles protègent maintenant les matricules.

## Étape 3 — notes, bulletins, conseil de classe
- **Saisie** par classe, composition (3 compositions ou 2 semestres, réglable par niveau) et matière. Une note = un enregistrement indépendant, sauvegardé à la sortie de la case. Barème et 20 bloqués, 2 décimales au plus, `ABS` pour un absent. Bouton « Effacer les notes ».
- **Travail à plusieurs** : la grille est réservée 60 s (renouvelées) par le premier qui l'ouvre ; les autres voient « en cours de saisie par X » en lecture seule. Les notes saisies ailleurs apparaissent en direct.
- **Règles de calcul** : une épreuve passée par personne n'est pas comptée ; pour un élève qui a composé, une case vide ou ABS compte 0 ; un élève sans aucune note n'est pas classé. Format EFA : moyenne des langues (sur 10) ; CEM/lycée : (moyenne des devoirs + composition) ÷ 2, coefficients. Rangs avec ex aequo (général et par langue). Moyenne annuelle.
- **Validation** : « Valider et figer » enregistre moyennes et rangs (collection résultats) et l'annonce dans l'activité.
- **Conseil de classe** : proposition automatique selon les seuils du niveau (passage, appréciation du conseil, redoublement, exclusion pour un redoublant), décision finale avec motif, historique des changements.
- **Éditions** : bulletins bilingues détaillés (1 par page) ou compacts (2 par page), ordre alphabétique ou de mérite ; fiche de notation vierge ; palmarès ; synthèse par matière ; statistiques de l'école (inscrits, classés, moyenne atteinte, taux, filles) ; progression annuelle ; proposition de passage.
- **Tests et essais** (CFEE, BFEM…) : épreuves, barèmes et coefficients propres, saisie, moyenne sur 20, rang, admis / ajourné, palmarès.

**Republier les règles** (`firestore.rules`) : elles autorisent maintenant les essais (collection `epreuves`).

## Mise en place (une seule fois)
1. **Firebase** : console.firebase.google.com → nouveau projet (ex. `ctefa-efa-yassi`), puis :
   - Authentication → Commencer → E-mail/Mot de passe → Activer. **Laissez la création de comptes autorisée** : l'application crée les comptes des utilisateurs elle-même ; un compte sans fiche dans l'école n'a accès à rien.
   - Authentication → Paramètres → Domaines autorisés → ajouter `bmdcode.github.io`.
   - Firestore Database → Créer → emplacement Europe → mode production. Onglet Règles : coller `firestore.rules` → Publier.
   - Paramètres du projet → Ajouter une application Web → copier le bloc `firebaseConfig`.
2. **GitHub** : nouveau dépôt `ctefa`, envoyer ce dossier, Settings → Pages → branche `main`, dossier `/docs`.
3. Ouvrir `https://bmdcode.github.io/ctefa/`, coller le bloc `firebaseConfig`, puis « Premier démarrage : créer l'école ».
4. Aide → « Installer sur un autre téléphone » : envoyer le lien à l'équipe.

## Limites
- La sécurité repose sur la connexion Firebase et les règles publiées ; l'affichage seul ne protège rien.
- Un administrateur ne peut pas changer le mot de passe d'un autre compte (il le désactive et en crée un nouveau). Créez un 2e administrateur principal de secours.
- Prévu pour une école (≈ 1 500 élèves, 10 connexions simultanées). Plusieurs écoles dans une même base, ou des paiements en ligne : il faut un vrai serveur.
- Données d'élèves hébergées en ligne : informer les parents et vérifier les obligations auprès de la CDP (loi 2008-12).

## Étapes suivantes
4. Caisse et finances · 5. Documents (QR) · 6. Vie scolaire et tableau de bord · 7. Migration, purges, reprise · 8. Guides et tests de charge.
