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


# PHASE 2 — Tests Postman (API)

À faire **après** la phase 1 (Docker + health OK).

## 2.1 Importer la collection

1. Postman → **Import** → `~/TaskChef/docs/postman/TaskChef.postman_collection.json`
2. Collection **TaskChef API** → **Variables** :
   - `base_url` = `http://localhost:3000`
   - `token` = (vide au départ)
   - `task_id` = `1` (mis à jour après création)

## 2.2 Ordre des requêtes

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

## 2.3 Rendre ton compte admin (pour DELETE)

Après Register/Login avec `postman.test@taskchef.local` (ou ton email) :

```bash
cd ~/TaskChef
docker compose exec mysql mysql -utaskchef_user -ptaskchef_pass taskchef -e "UPDATE users SET role='admin' WHERE email='postman.test@taskchef.local';"
```

(Remplace l’email par le tien.)

Refais **POST /auth/login**, puis **DELETE /tasks/:id**.


# PHASE 3 — Déploiement (après Postman OK)

**Prérequis :** tests Postman concluants en local ; compte **Alwaysdata** ; **MongoDB Atlas** ; compte **Render** (gratuit) pour l’API si pas de site Node sur Alwaysdata.

Le déploiement **ne reprend pas Docker** en production.

**Guide détaillé recommandé :** [deploiement-alwaysdata-render.md](deploiement-alwaysdata-render.md)

## 3.1 Vue d’ensemble (Alwaysdata + Render)

| Composant | Action |
|-----------|--------|
| **Front** | Site statique Alwaysdata → SFTP → `www/` |
| **Back** | **Render** Web Service (`backend/`) **ou** site Node Alwaysdata |
| **MySQL** | Alwaysdata + import `schema.sql` (base ex. `taskchef_bd`) |
| **MongoDB** | Atlas → `MONGO_URI` sur Render / site Node |

## 3.2 Préparer les fichiers avant upload

### Front — `API_URL`

`frontend/app.js` bascule automatiquement entre `localhost:3000` (dev) et l’URL Render en production. Adaptez l’URL Render dans le fichier si besoin, puis uploadez `app.js` sur Alwaysdata.

### Back — secrets production

Ne pas réutiliser `JWT_SECRET` ni mots de passe du `docker-compose.yml` de dev.

Préparer (sur papier / gestionnaire, pas dans Git) :
- `JWT_SECRET` (long, aléatoire)
- Identifiants MySQL Alwaysdata
- `MONGO_URI` (Atlas)
- `CORS_ORIGIN` = URL **exacte** du front HTTPS (ex. `https://toncompte.alwaysdata.net`)

## 3.3 Alwaysdata — ordre recommandé

### Étape A — MySQL

1. Créer la base MySQL dans l’admin Alwaysdata.
2. Noter : hôte, port, utilisateur, mot de passe, nom de base.
3. Importer `database/sql/schema.sql` (phpMyAdmin ou client MySQL).

### Étape B — MongoDB Atlas (si pas de Mongo chez l’hébergeur)

1. Créer un cluster gratuit sur https://www.mongodb.com/atlas
2. Utilisateur + mot de passe base.
3. Autoriser l’IP du serveur Alwaysdata (ou IP temporaire pour test).
4. Copier la chaîne de connexion → `MONGO_URI`.

### Étape C — API (Render ou Alwaysdata Node)

**Option Render (recommandée)** : voir [deploiement-alwaysdata-render.md](deploiement-alwaysdata-render.md) — déploiement GitHub, variables MySQL Alwaysdata + `MONGO_URI` + `CORS_ORIGIN`.

**Option Alwaysdata Node** :

1. Créer un site **Node.js** dans l’admin.
2. SFTP : uploader **`backend/`** (sans `node_modules`).
3. SSH : `npm install --omit=dev`
4. Variables : `JWT_SECRET`, `CORS_ORIGIN`, `MYSQL_*`, `MONGO_URI`
5. Tester : `curl -s https://api-toncompte.alwaysdata.net/health`

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

## 3.4 Postman en production (optionnel)

Dans la collection, change la variable **`base_url`** vers l’URL HTTPS de l’API, puis refais **health** → **login** → **tasks** pour prouver que l’API en ligne répond comme en local.

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
