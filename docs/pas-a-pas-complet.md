# Pas à pas complet — TaskChef (tests, captures dossier, Postman, déploiement)

Guide unique pour enchaîner : **environnement local** → **captures navigateur** → **tests Postman** → **déploiement type Alwaysdata**.

Documents détaillés en complément :
- [environnement-et-docker.md](environnement-et-docker.md)
- [tests-postman.md](tests-postman.md)
- [deploiement-alwaysdata.md](deploiement-alwaysdata.md)

---

# PHASE 1 — Préparer l’environnement de test

## 1.1 Prérequis (une fois)

- **Docker Desktop** lancé (icône prête).
- Sur ton Mac, si Docker affiche une erreur de version API :
  ```bash
  export DOCKER_API_VERSION=1.48
  ```
  (à refaire dans **chaque nouveau terminal** si besoin.)
- **Postman** installé (pour la phase 3).
- **Navigateur** Chrome ou Firefox (pour captures + onglet Network).

## 1.2 Démarrer l’API et les bases (terminal 1)

**Une commande par ligne** (ne pas coller `cd` sur la même ligne que `docker compose`) :

```bash
export DOCKER_API_VERSION=1.48
cd ~/TaskChef
docker compose up -d --build
```

Attendre la fin (première fois : plusieurs minutes).

Vérifier :

```bash
docker compose ps
```

Tu dois voir **mysql**, **mongo**, **backend** en **Up** / **running**.

```bash
curl -s http://localhost:3000/health
```

Résultat attendu : `"mysql":"ok"` et `"mongo":"ok"` (réessayer 2–3 fois si `down` au tout premier démarrage).

## 1.3 Importer le schéma SQL (si base vide ou nouvelle install)

```bash
cd ~/TaskChef
docker compose exec -T mysql mysql -utaskchef_user -ptaskchef_pass taskchef < database/sql/schema.sql
```

Optionnel (données de démo) :

```bash
docker compose exec -T mysql mysql -utaskchef_user -ptaskchef_pass taskchef < database/sql/seed.sql
```

## 1.4 Démarrer le front en local (terminal 2 — laisser ouvert)

```bash
cd ~/TaskChef/frontend
python3 -m http.server 5500
```

Ne pas fermer ce terminal pendant les tests.

## 1.5 URLs de test

| Page | URL |
|------|-----|
| Connexion | http://localhost:5500/login.html |
| Inscription | http://localhost:5500/register.html |
| Tableau de bord | http://localhost:5500/index.html |
| Créer une tâche | http://localhost:5500/create-task.html |

L’API reste sur **http://localhost:3000** (configurée dans `frontend/app.js`).

---

# PHASE 2 — Captures pour le dossier projet (navigateur + code)

Objectif : illustrer les **3 piliers** (code + explication + rendu) et les compétences front / fetch / responsive.

## 2.1 Checklist des captures à faire

Coche au fur et à mesure. Nomme les fichiers clairement (ex. `capture-01-health.png`).

### Environnement / Docker

| # | Capture | Où / quoi montrer |
|---|---------|-------------------|
| D1 | Terminal | `docker compose ps` — 3 services Up |
| D2 | Terminal | `curl http://localhost:3000/health` — JSON ok |
| D3 | VS Code | Arborescence `TaskChef/` (frontend, backend, database, docs) |
| D4 | VS Code ou terminal | Extrait `docker-compose.yml` (services mysql, mongo, backend) |

### Code (extraits courts + capture IDE)

| # | Fichier | Ce que ça prouve |
|---|---------|------------------|
| C1 | `frontend/app.js` | `API_URL`, fonction `apiFetch` + `fetch` |
| C2 | `frontend/app.js` | `localStorage` + token après login |
| C3 | `backend/server.js` | Route CRUD ou requête `execute` avec `?` (anti-injection SQL) |
| C4 | `backend/server.js` | Schéma `ActivityLog` / route `/activity-logs` (NoSQL) |
| C5 | `database/sql/schema.sql` | Tables `users` et `tasks` |

### Rendu final (navigateur)

| # | Page | Ce que ça prouve |
|---|------|------------------|
| R1 | login.html | Page connexion + logo |
| R2 | index.html (connecté) | Dashboard + cartes tâches |
| R3 | create-task.html | Formulaire création |
| R4 | task-detail.html | Détail centré + modification |
| R5 | index.html (bas de page) | Bloc **Logs d’activité NoSQL** |
| R6 | index.html responsive | Même page en **fenêtre étroite** (1 colonne) — preuve responsive |

### Réseau (preuve JavaScript asynchrone)

| # | Action | Onglet Network |
|---|--------|----------------|
| N1 | Connexion sur login.html | Requête **POST** `auth/login` — Status **200**, réponse avec `token` |
| N2 | Dashboard chargé | **GET** `tasks` — Status **200**, JSON tableau |
| N3 | Création tâche | **POST** `tasks` — Header **Authorization: Bearer …** |
| N4 | (optionnel) | **GET** `activity-logs` avec Bearer |

**Comment capturer Network :** F12 → **Réseau / Network** → refaire l’action → clic sur la ligne de requête → capture de l’en-tête + réponse.

## 2.2 Parcours utilisateur à suivre pour les captures R et N

1. Ouvre http://localhost:5500/register.html → crée un compte (email + mot de passe **8 caractères min**).
2. Connecte-toi sur login.html → redirection dashboard.
3. **Capture R2** + **N2** (liste des tâches).
4. Crée une tâche → **R3**, **N3**.
5. Clique une carte → détail → **R4**.
6. Descends jusqu’aux logs → **R5**.
7. Réduis la largeur du navigateur → **R6**.

## 2.3 Texte court à coller dans le dossier (exemple)

> L’environnement de test repose sur Docker Compose (MySQL, MongoDB, API Node.js) et un serveur HTTP local pour le front (port 5500). Les échanges front/API utilisent `fetch` de manière asynchrone ; l’authentification repose sur un JWT stocké dans `localStorage`.

---

# PHASE 3 — Tests Postman (API)

À faire **après** la phase 1 (Docker + health OK).

## 3.1 Importer la collection

1. Postman → **Import** → `~/TaskChef/docs/postman/TaskChef.postman_collection.json`
2. Collection **TaskChef API** → **Variables** :
   - `base_url` = `http://localhost:3000`
   - `token` = (vide au départ)
   - `task_id` = `1` (mis à jour après création)

## 3.2 Ordre des requêtes (dossiers 01 → 03)

| Étape | Requête | Statut attendu | Note |
|-------|---------|----------------|------|
| 1 | **01** → GET /health | 200, mysql/mongo ok | Capture dossier Postman #1 |
| 2 | **02** → POST /auth/register | 201 | Email dans le body ; si **409**, changer l’email |
| 3 | **02** → POST /auth/login | 200 + `token` | Le script remplit la variable `token` |
| 4 | **01** → GET /tasks | 200, tableau JSON | |
| 5 | **03** → POST /tasks | 201 + `id` | Met à jour `task_id` |
| 6 | **01** → GET /tasks/:id | 200 | |
| 7 | **03** → PUT /tasks/:id | 200 | |
| 8 | **03** → GET /activity-logs | 200, logs JSON | Capture dossier Postman #4 |
| 9 | **03** → DELETE /tasks/:id | 200 si **admin**, sinon 403 | Voir 3.3 |

## 3.3 Rendre ton compte admin (pour DELETE)

Après Register/Login avec `postman.test@taskchef.local` (ou ton email) :

```bash
cd ~/TaskChef
docker compose exec mysql mysql -utaskchef_user -ptaskchef_pass taskchef -e "UPDATE users SET role='admin' WHERE email='postman.test@taskchef.local';"
```

(Remplace l’email par le tien.)

Refais **POST /auth/login**, puis **DELETE /tasks/:id**.

## 3.4 Captures Postman pour le dossier

| # | Requête | Montrer sur la capture |
|---|---------|------------------------|
| P1 | GET /health | Status 200 + body JSON |
| P2 | POST /auth/login | Status 200 + champ `token` (flouter une partie du JWT) |
| P3 | POST /tasks | Onglet **Headers** : `Authorization: Bearer …` + Status 201 |
| P4 | GET /activity-logs | Status 200 + tableau de logs |

## 3.5 Si ça échoue

| Erreur | Action |
|--------|--------|
| Could not get response | `docker compose ps` ; `base_url` correct ? |
| 401 | Refaire Login ; vérifier variable `token` |
| 403 sur DELETE | Passer l’utilisateur en `admin` (3.3) |
| 429 sur /auth | Attendre quelques minutes (rate limit) |

---

# PHASE 4 — Déploiement (après Postman OK)

**Prérequis :** tests Postman concluants en local ; compte **Alwaysdata** (ou hébergeur équivalent) ; éventuellement **MongoDB Atlas** pour Mongo en production.

Le déploiement **ne reprend pas Docker** sur l’hébergeur mutualisé : on transfère les fichiers et on configure Node + MySQL (+ Mongo externe).

## 4.1 Vue d’ensemble

| Composant | Action |
|-----------|--------|
| **Front** | SFTP/FTP → upload contenu de `frontend/` |
| **Back** | Site Node.js Alwaysdata + SSH `npm install` |
| **MySQL** | Base Alwaysdata + import `schema.sql` |
| **MongoDB** | Souvent **MongoDB Atlas** → `MONGO_URI` sur le site Node |

## 4.2 Préparer les fichiers avant upload

### Front — modifier l’URL de l’API

Dans `frontend/app.js`, remplace :

```javascript
const API_URL = "http://localhost:3000";
```

par l’URL **HTTPS** de ton API en production, par exemple :

```javascript
const API_URL = "https://api-toncompte.alwaysdata.net";
```

(Adapter à l’URL réelle fournie par Alwaysdata.)

### Back — secrets production

Ne pas réutiliser `JWT_SECRET` ni mots de passe du `docker-compose.yml` de dev.

Préparer (sur papier / gestionnaire, pas dans Git) :
- `JWT_SECRET` (long, aléatoire)
- Identifiants MySQL Alwaysdata
- `MONGO_URI` (Atlas)
- `CORS_ORIGIN` = URL **exacte** du front HTTPS (ex. `https://toncompte.alwaysdata.net`)

## 4.3 Alwaysdata — ordre recommandé

### Étape A — MySQL

1. Créer la base MySQL dans l’admin Alwaysdata.
2. Noter : hôte, port, utilisateur, mot de passe, nom de base.
3. Importer `database/sql/schema.sql` (phpMyAdmin ou client MySQL).

### Étape B — MongoDB Atlas (si pas de Mongo chez l’hébergeur)

1. Créer un cluster gratuit sur https://www.mongodb.com/atlas
2. Utilisateur + mot de passe base.
3. Autoriser l’IP du serveur Alwaysdata (ou IP temporaire pour test).
4. Copier la chaîne de connexion → `MONGO_URI`.

### Étape C — Site Node.js (backend)

1. Créer un site **Node.js** dans l’admin.
2. SFTP : uploader le dossier **`backend/`** (sans `node_modules`).
3. SSH dans le répertoire de l’app :
   ```bash
   npm install --omit=dev
   ```
4. Commande de démarrage : `npm start` ou `node server.js` (selon doc Alwaysdata).
5. Variables d’environnement du site :
   - `NODE_ENV=production`
   - `JWT_SECRET=...`
   - `CORS_ORIGIN=https://ton-front.alwaysdata.net`
   - `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
   - `MONGO_URI=...`
6. Tester : `curl -s https://api-toncompte.alwaysdata.net/health`

### Étape D — Site statique (front)

1. Créer le site statique / hébergement fichiers.
2. SFTP : uploader tout **`frontend/`** (`index.html`, `login.html`, `styles.css`, `app.js`, `assets/`, etc.).
3. Ouvrir l’URL HTTPS du front → tester inscription, login, tâches.

### Étape E — Vérifications finales

- [ ] `/health` → mysql et mongo **ok**
- [ ] Login front → dashboard
- [ ] Création / modification tâche
- [ ] Logs visibles (si Mongo OK)
- [ ] Pas d’erreur CORS dans la console (sinon corriger `CORS_ORIGIN`)

## 4.4 Captures déploiement pour le dossier

| # | Capture |
|---|---------|
| H1 | Admin Alwaysdata — site Node + variables (secrets floutés) |
| H2 | Client SFTP — fichiers front uploadés |
| H3 | Navigateur — URL production + Network (requête API en 200) |
| H4 | `curl` ou Postman sur `/health` de l’API en production |

## 4.5 Postman en production (optionnel)

Dans la collection, change la variable **`base_url`** vers l’URL HTTPS de l’API, puis refais **health** → **login** → **tasks** pour prouver que l’API en ligne répond comme en local.

---

# Récap — ordre global

```
PHASE 1  Docker + SQL + front :5500
    ↓
PHASE 2  Captures navigateur + code + Network (dossier ECF)
    ↓
PHASE 3  Postman (collection + captures P1–P4)
    ↓
PHASE 4  Déploiement Alwaysdata (+ captures H1–H4)
```

---

# Aide-mémoire commandes (copier-coller)

```bash
# Terminal — Docker
export DOCKER_API_VERSION=1.48
cd ~/TaskChef
docker compose up -d
docker compose ps
curl -s http://localhost:3000/health

# SQL (si besoin)
docker compose exec -T mysql mysql -utaskchef_user -ptaskchef_pass taskchef < database/sql/schema.sql

# Terminal — Front (garder ouvert)
cd ~/TaskChef/frontend
python3 -m http.server 5500
```

**Navigateur :** http://localhost:5500/login.html
