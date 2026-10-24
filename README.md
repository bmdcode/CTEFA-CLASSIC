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
2. Élèves et personnel · 3. Notes, bulletins, conseil de classe (règle : matière sans note = 0 si l'élève a d'autres notes) · 4. Caisse et finances · 5. Documents (QR) · 6. Vie scolaire et tableau de bord · 7. Migration, purges, reprise · 8. Guides et tests de charge.
