# Phase 4 — Déploiement Alwaysdata (pas à pas)

À faire **après** les tests Postman OK en local (phase 3).

**Section du dossier ECF :** **II.4 — Documenter le déploiement d'une application dynamique web ou web mobile**

---

## Avant de commencer — noter ces infos

Remplis ce tableau au fur et à mesure (dans un carnet, pas dans Git pour les mots de passe) :

| Élément | Ta valeur (exemple) |
|---------|---------------------|
| URL admin Alwaysdata | https://admin.alwaysdata.com |
| URL du **front** (site statique) | `https://________________.alwaysdata.net` |
| URL de l’**API** (site Node.js) | `https://________________.alwaysdata.net` |
| Hôte MySQL Alwaysdata | `mysql-xxx.alwaysdata.net` |
| Port MySQL | souvent `3306` |
| Nom de la base | `taskchef` (ou celui créé dans l’admin) |
| Utilisateur MySQL | |
| Mot de passe MySQL | |
| `JWT_SECRET` (long, aléatoire, nouveau) | |
| `MONGO_URI` (Atlas) | `mongodb+srv://...` |

---

## Étape 0 — Préparer les fichiers sur ton Mac

### 0.1 Copie de travail pour la prod (recommandé)

Ne modifie pas ton `app.js` local si tu veux garder `localhost:3000` pour Docker.

**Option A — une seule ligne à changer avant upload :**

Dans `~/TaskChef/frontend/app.js`, remplace temporairement :

```javascript
const API_URL = "http://localhost:3000";
```

par (avec **ton** URL API HTTPS) :

```javascript
const API_URL = "https://TON-API.alwaysdata.net";
```

*(Remets `localhost` après les tests locaux si tu préfères.)*

**Option B — deux dossiers :** garde `frontend/` pour le local ; copie `frontend/` vers `frontend-prod/` avec la bonne `API_URL`.

### 0.2 Liste des fichiers à envoyer

**Front (dossier `frontend/`)** — tout le contenu, notamment :

- `index.html`, `login.html`, `register.html`, `create-task.html`, `task-detail.html`
- `app.js`, `styles.css`
- dossier `assets/` (logo SVG, etc.)

**Back (dossier `backend/`)** — **sans** `node_modules` :

- `server.js`, `package.json`, `package-lock.json` (si présent)
- **ne pas** uploader `.env` avec secrets de dev

**SQL :**

- `database/sql/schema.sql` (import dans MySQL Alwaysdata, pas forcément en FTP sur le site web)

---

## Étape 1 — MySQL sur Alwaysdata

1. Connexion à **l’administration Alwaysdata** → **Bases de données** → **MySQL**.
2. **Créer** une base (ex. `taskchef`) + utilisateur avec tous les droits sur cette base.
3. Noter **hôte**, **port**, **utilisateur**, **mot de passe**, **nom de base**.
4. **Importer le schéma** :
   - Via **phpMyAdmin** (souvent proposé par Alwaysdata), ou
   - Client MySQL : ouvrir `database/sql/schema.sql` et exécuter le script sur la base.
5. Vérifier : tables **`users`** et **`tasks`** présentes.

**Capture dossier :** écran phpMyAdmin ou liste des tables (sans mot de passe visible).

---

## Étape 2 — MongoDB Atlas (logs NoSQL)

Alwaysdata mutualisé n’a souvent **pas** Mongo intégré → **MongoDB Atlas** (gratuit possible).

1. Compte sur https://www.mongodb.com/atlas → **Create cluster** (M0 gratuit).
2. **Database Access** → créer un utilisateur (login + mot de passe).
3. **Network Access** → **Add IP Address** :
   - pour tester : `0.0.0.0/0` (moins sécurisé, à restreindre plus tard), ou
   - IP sortante du serveur Alwaysdata si tu la connais.
4. **Connect** → **Drivers** → copier la chaîne **`mongodb+srv://...`**.
5. Remplace `<password>` par le mot de passe réel → c’est ta **`MONGO_URI`**.

Exemple de forme :

```text
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/taskchef?retryWrites=true&w=majority
```

**Capture dossier :** écran Atlas (cluster + connexion, sans afficher le mot de passe en clair).

---

## Étape 3 — Site Node.js (API backend)

### 3.1 Créer le site dans l’admin

1. **Web** → **Sites** → **Ajouter un site**.
2. Type : **Node.js** (ou équivalent).
3. Choisir la **version Node** (20 recommandée, alignée avec le projet).
4. **Répertoire** : note le chemin (ex. `backend/` ou racine du site).
5. **Commande de démarrage** (souvent) :
   ```text
   npm start
   ```
   ou
   ```text
   node server.js
   ```
6. Enregistrer → noter l’**URL HTTPS** du site (= ton **API_URL** pour le front).

### 3.2 Transférer les fichiers (FTP / SFTP)

1. Récupérer les identifiants **FTP ou SFTP** (admin Alwaysdata → accès SSH/FTP).
2. **FileZilla** (ou Cyberduck) :
   - Protocole **SFTP** si disponible (plus sûr que FTP).
   - Hôte, utilisateur, mot de passe / clé selon Alwaysdata.
3. Aller au **répertoire du site Node** indiqué dans l’admin.
4. Envoyer le contenu de **`backend/`** (fichiers à la racine du site Node : `server.js`, `package.json`, etc.).

### 3.3 Installer les dépendances (SSH)

1. Admin Alwaysdata → **SSH** → ouvrir un terminal ou utiliser Terminal Mac :

   ```bash
   ssh VOTRE_LOGIN@ssh-VOTRE_COMPTE.alwaysdata.net
   ```

2. Aller dans le dossier du site Node (chemin indiqué dans l’admin) :

   ```bash
   cd ~/backend
   # ou le chemin exact affiché pour ton site
   ```

3. Installer :

   ```bash
   npm install --omit=dev
   ```

4. Vérifier que `node_modules` est bien créé sur le serveur.

### 3.4 Variables d’environnement (site Node)

Dans l’admin, section **Environnement** / **Variables** du site Node, ajouter :

| Variable | Valeur |
|----------|--------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | chaîne longue aléatoire (nouvelle, pas celle du docker-compose local) |
| `CORS_ORIGIN` | URL **exacte** du front HTTPS, ex. `https://taskchef.alwaysdata.net` |
| `MYSQL_HOST` | hôte MySQL Alwaysdata |
| `MYSQL_PORT` | `3306` (ou valeur admin) |
| `MYSQL_USER` | utilisateur MySQL |
| `MYSQL_PASSWORD` | mot de passe MySQL |
| `MYSQL_DATABASE` | nom de la base |
| `MONGO_URI` | chaîne Atlas complète |

**Important :** en `production`, seules les origines listées dans `CORS_ORIGIN` sont acceptées. Si le front est sur une autre URL, l’API refusera les requêtes.

`PORT` : souvent géré par Alwaysdata ; si l’admin impose un port, suivre leur documentation.

### 3.5 Redémarrer le site Node

Dans l’admin : **Redémarrer** le site ou attendre le redémarrage automatique après changement de variables.

### 3.6 Tester l’API en production

Sur ton Mac :

```bash
curl -s https://TON-API.alwaysdata.net/health
```

Attendu : `"mysql":"ok"` et `"mongo":"ok"`.

Si `down` : vérifier variables MySQL / `MONGO_URI`, logs du site dans l’admin Alwaysdata.

**Capture dossier :** réponse `/health` + écran variables (secrets floutés).

---

## Étape 4 — Site statique (front) en FTP/SFTP

### 4.1 Créer le second site (front)

1. **Ajouter un site** → type **Statique** / **Fichiers** / **PHP statique** (selon ce qu’Alwaysdata propose pour du HTML pur).
2. Noter l’**URL HTTPS** du front (différente de l’API).

### 4.2 Vérifier `API_URL` dans `app.js`

Avant upload, `app.js` doit pointer vers l’URL de l’**étape 3.6** :

```javascript
const API_URL = "https://TON-API.alwaysdata.net";
```

### 4.3 Upload FTP/SFTP

1. Même client FileZilla → **autre répertoire** (celui du site statique).
2. Envoyer **tout** le contenu de `frontend/` à la **racine web** du site (là où `index.html` doit être accessible directement).

Structure attendue côté serveur :

```text
/www/.../
  index.html
  login.html
  app.js
  styles.css
  assets/
  ...
```

### 4.4 Tester dans le navigateur

1. Ouvrir `https://TON-FRONT.alwaysdata.net/login.html`
2. **Inscription** ou **connexion**
3. **Dashboard** : liste des tâches
4. **Créer / modifier** une tâche
5. Vérifier les **logs** en bas du dashboard

**F12 → Network** : pas d’erreur CORS ; requêtes vers `https://TON-API...` en **200**.

**Captures dossier :** URL prod + login + dashboard + une requête Network OK.

---

## Étape 5 — Postman sur l’API en production (optionnel)

1. Collection TaskChef → variable **`base_url`** = `https://TON-API.alwaysdata.net`
2. Enchaîner : **health** → **register** → **login** → **tasks** → **activity-logs**
3. **Capture** pour II.4 : même série qu’en local mais avec l’URL HTTPS.

---

## Étape 6 — Rédiger la section II.4 du dossier

Inclure au minimum :

1. **Schéma** : Front (SFTP) + API (Node) + MySQL (Alwaysdata) + Mongo (Atlas).
2. **Procédure numérotée** (résumé des étapes 1 à 4).
3. **Variables d’environnement** (tableau sans secrets en clair).
4. **Différence local / prod** : Docker en dev ; Alwaysdata + Atlas en prod.
5. **Captures** H1–H4 (admin, SFTP, navigateur, health).

Texte type :

> En local, l’environnement est reproductible via Docker Compose. En production, le front est déployé par SFTP sur un site statique Alwaysdata, l’API Node.js est hébergée sur un site Node dédié avec variables d’environnement, MySQL est fourni par l’hébergeur et MongoDB par MongoDB Atlas. Le front communique avec l’API en HTTPS via `fetch`, avec CORS limité à l’origine du site statique.

---

## Dépannage rapide

| Problème | Solution |
|----------|----------|
| CORS dans le navigateur | `CORS_ORIGIN` = URL exacte du front (schéma + domaine, pas de typo) ; `NODE_ENV=production` |
| `mysql: down` sur `/health` | Vérifier host/user/password/base ; IP/autorisation MySQL |
| `mongo: down` | Vérifier `MONGO_URI`, mot de passe encodé dans l’URI, IP autorisée sur Atlas |
| 502 / site Node ne répond pas | Logs site dans admin ; `npm install` fait ? ; commande `npm start` correcte ? |
| Page blanche / 404 front | Fichiers au bon endroit ; tester `.../login.html` explicitement |
| Mixed content | Front et API tous les deux en **https://** |

---

## Checklist finale

- [ ] MySQL : tables créées
- [ ] Atlas : cluster + `MONGO_URI`
- [ ] Site Node : fichiers + `npm install` + variables + `/health` ok
- [ ] `app.js` : `API_URL` HTTPS
- [ ] Site statique : upload complet
- [ ] Login + CRUD + logs OK en navigateur
- [ ] Captures pour le dossier II.4
- [ ] Texte procédure dans le Word

---

## Aide Alwaysdata

- Node.js : https://help.alwaysdata.com/fr/hebergement-web/langages/nodejs/
- Accès FTP/SFTP : section **FTP / SSH** de ton compte dans l’admin
