# CTEFA-CLASSIC Web

Version Web de CTEFA-CLASSIC V3.3 : application installable (téléphone, ordinateur), qui fonctionne sans internet.

## Étape 1 (cette version) : la scolarité, toutes classes
- **23 niveaux** repris de CTEFA-CLASSIC V3.3 (feuille PARAM_MATIERES) avec leurs matières, rubriques, barèmes et coefficients : CI → CM2, Majaalis 1 → 3, 6e → 3e, 2nde → Terminale (L et S).
- **Classes** : création une par une ou par cycle en un geste ; titulaires français et arabe.
- **Élèves** : inscription, modification, statut (actif, inactif, abandon, transféré), régime, import en collant depuis Excel, liste imprimable, export CSV.
- **Notes** : grille de saisie par classe et par composition (3 compositions), contrôle des barèmes, enregistrement immédiat.
- **Résultats** : moyennes par langue (français, arabe, langue nationale) et générale, rangs avec ex aequo, statistiques de la classe, moyennes annuelles.
- **Bulletins bilingues** par composition et annuels, individuels ou pour toute la classe, avec observation du maître.
- **Décisions de fin d'année** : propositions automatiques, validation, passage à l'année suivante (élèves admis déplacés, notes archivées).
- **Sauvegarde** : export / import d'un fichier .json.

## Règles de calcul
- Élémentaire et Majaalis (sur 10) : moyenne d'une langue = total des notes ÷ total des barèmes × 10 ; moyenne générale = moyenne des langues.
- Moyen et secondaire (sur 20) : note de matière = (moyenne des devoirs + composition) ÷ 2 ; moyenne = Σ(note × coef) ÷ Σ coef.
- À vérifier contre les résultats du classeur V3.3 sur une classe réelle avant usage.

## Étapes suivantes
2. Finances (tarifs, encaissements, reçus, impayés, régimes, transport par ligne, arrêté de caisse, contrôle automatique des paiements — repris de CTEFA V3.3 et GS/KMAL).
3. Synchronisation entre appareils (comme Tontine 2.0) et comptes par rôle.
4. Outils d'EFA-DOCS (registre d'appel, journal, fiches de préparation, certificats) et vie scolaire.

## Publication
Nouveau dépôt GitHub `ctefa`, contenu de ce dossier, Pages : branche `main`, dossier `/docs`.
