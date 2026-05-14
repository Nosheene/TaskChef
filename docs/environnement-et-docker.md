# Environnement de développement et Docker — TaskChef

Ce document décrit comment installer, lancer et dépanner l’application **TaskChef** avec **Docker Compose**. Il complète le fichier racine `README.md`.

---

## 1. Prérequis

| Outil | Rôle | Remarques |
|--------|------|-----------|
| **Git** | Cloner le dépôt | — |
| **Docker Engine** + **Docker Compose v2** | Exécuter MySQL, MongoDB et l’API | `docker compose version` doit répondre (plugin Compose v2). |
| **Navigateur récent** | Tester le front et l’API | — |

**Optionnel (hors Docker)** : **Node.js 20+** et **npm** si vous lancez le backend en local avec `npm run dev` (voir section 7).

**Conseil** : sur macOS, utilisez **Docker Desktop** récent (ou un runtime compatible avec votre version d’OS). En cas d’erreur du type *client API trop récent pour le daemon*, votre environnement peut exiger une variable `DOCKER_API_VERSION` — voir la documentation Docker de votre machine.

---

## 2. Architecture des services (`docker-compose.yml`)

| Service | Image / build | Rôle | Port hôte |
|---------|----------------|------|-----------|
| **mysql** | `mysql:8.0` | Base relationnelle (utilisateurs, tâches) | **3306** |
| **mongo** | `mongo:7` | Base NoSQL (logs d’activité) | **27017** |
| **backend** | `./backend` (Dockerfile) | API REST Node.js / Express | **3000** |

Les données MySQL et MongoDB sont stockées dans des **volumes nommés** (`mysql_data`, `mongo_data`) : elles survivent à un `docker compose down` sans option `-v`.

Le dossier `./backend` est **monté** dans le conteneur (`./backend:/app`) pour le développement ; un **volume anonyme** `/app/node_modules` évite d’écraser les dépendances installées dans l’image. Le `CMD` du backend exécute **`npm install && npm start`** au démarrage pour resynchroniser `node_modules` avec le `package.json` du dépôt.

---

## 3. Premier lancement (recommandé)

À la racine du projet (`TaskChef/`), après le clone :

### 3.1 Construire et démarrer les conteneurs

```bash
cd TaskChef
docker compose up --build
```

- Laissez ce terminal ouvert pour voir les logs (`Ctrl+C` arrête les services).
- Pour lancer en **arrière-plan** :

```bash
docker compose up --build -d
```

### 3.2 Initialiser le schéma SQL et les données de test

L’API **ne** joue **pas** automatiquement les scripts SQL : il faut les importer **une fois** dans MySQL (depuis la machine hôte, à la racine du projet) :

```bash
docker compose exec -T mysql mysql -utaskchef_user -ptaskchef_pass taskchef < database/sql/schema.sql
docker compose exec -T mysql mysql -utaskchef_user -ptaskchef_pass taskchef < database/sql/seed.sql
```

Les lignes `mot_de_passe` de `seed.sql` utilisent des **hachages d’exemple** : pour vous connecter avec ces comptes, remplacez-les par des hachages **bcrypt** valides (générés après inscription via l’API, ou avec un petit script Node utilisant `bcryptjs`), ou créez vos utilisateurs avec **`POST /auth/register`**.

Sous **Windows PowerShell**, la redirection `<` peut poser problème ; utilisez **Git Bash**, **WSL**, ou importez les fichiers via un client MySQL (DBeaver, etc.) en vous connectant à `localhost:3306` avec l’utilisateur `taskchef_user` / mot de passe `taskchef_pass` et la base `taskchef`.

### 3.3 Vérifier que l’API et les bases répondent

```bash
curl -s http://localhost:3000/health
```

Réponse attendue (résumé) : états **mysql** et **mongo** à **ok** lorsque tout est prêt.

---

## 4. URLs et accès

| Ressource | URL / accès |
|-----------|-------------|
| **API REST** | `http://localhost:3000` |
| **Santé (health check)** | `GET http://localhost:3000/health` |
| **MySQL** | Hôte `localhost`, port **3306**, base `taskchef`, utilisateur `taskchef_user` |
| **MongoDB** | `mongodb://localhost:27017` (base logique `taskchef` côté application) |

### Front-end (fichiers statiques)

Le dossier `frontend/` contient des **HTML / CSS / JS** servis sans conteneur dédié dans ce dépôt.

**CORS** : avec `NODE_ENV=development` (valeur du `docker-compose.yml`), l’API **accepte toutes les origines** (voir `server.js`). En **production**, seules les URLs listées dans `CORS_ORIGIN` sont autorisées : pensez à les ajuster avant un déploiement réel.

Exemple pour servir le front sur le port **8080** (Python 3) :

```bash
cd frontend
python3 -m http.server 8080
```

Ouvrez ensuite `http://localhost:8080/login.html`.

Ouvrir les fichiers en **`file://`** peut poser problème avec `fetch` (origine nulle, cookies `localStorage` selon navigateur) : **préférez un petit serveur HTTP** comme ci-dessus.

---

## 5. Variables d’environnement

### 5.1 Définies dans `docker-compose.yml` (service `backend`)

| Variable | Exemple dans le dépôt | Rôle |
|----------|----------------------|------|
| `PORT` | `3000` | Port d’écoute de l’API dans le conteneur (mappé sur l’hôte). |
| `NODE_ENV` | `development` | Comportement général (logs, sécurité renforcée en `production`). |
| `JWT_SECRET` | `super-secret-taskchef-change-me` | Signature des jetons JWT — **à changer en production**. |
| `CORS_ORIGIN` | Liste séparée par des virgules | Origines autorisées pour les requêtes navigateur. |
| `MYSQL_HOST` | `mysql` | Nom du service Docker (réseau interne). |
| `MYSQL_PORT` | `3306` | Port MySQL dans le réseau Compose. |
| `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` | `taskchef_user` / `taskchef_pass` / `taskchef` | Identifiants applicatifs (alignés sur le service `mysql`). |
| `MONGO_URI` | `mongodb://mongo:27017/taskchef` | Chaîne de connexion MongoDB (hôte = nom du service `mongo`). |

### 5.2 Variables optionnelles (backend / `server.js`)

Non définies par défaut dans Compose, mais reconnues par le code si vous les exportez :

| Variable | Rôle |
|----------|------|
| `MYSQL_RETRY_ATTEMPTS` | Nombre de tentatives d’attente MySQL au démarrage (défaut **30**). |
| `MONGO_RETRY_ATTEMPTS` | Idem pour MongoDB (défaut **30**). |

En développement **sans Docker**, un fichier `backend/.env` peut être utilisé avec **dotenv** (voir valeurs par défaut dans `server.js` : hôte `localhost`, utilisateur MySQL `root`, etc.). **Ne commitez pas** de secrets réels ; pour la production, utilisez des secrets Docker ou un gestionnaire dédié.

---

## 6. Commandes utiles

```bash
# État des conteneurs
docker compose ps

# Logs du backend uniquement
docker compose logs -f backend

# Logs de tous les services
docker compose logs -f

# Arrêter les conteneurs (conserve les volumes de données)
docker compose down

# Arrêter et supprimer les volumes (réinitialise MySQL / Mongo)
docker compose down -v

# Reconstruire l’image backend après changement du Dockerfile
docker compose build --no-cache backend
docker compose up -d
```

---

## 7. Lancer le backend sans Docker (optionnel)

Utile pour déboguer sans conteneur, à condition d’avoir **MySQL** et **MongoDB** accessibles localement (ou via tunnels) avec les mêmes schémas / données.

```bash
cd backend
npm install
cp .env.example .env   # si vous ajoutez un exemple ; sinon configurez les variables à la main
npm run dev            # nodemon
# ou
npm start
```

Les valeurs par défaut du code pointent vers `localhost` pour MySQL et MongoDB si les variables ne sont pas définies.

---

## 8. Dépannage court

| Symptôme | Piste |
|----------|--------|
| `health` indique **mysql** ou **mongo** **down** | Attendre quelques secondes au premier `up` ; vérifier `docker compose ps` et les logs `mysql` / `mongo`. |
| Erreur **Cannot find module** (`helmet`, etc.) dans le conteneur | Reconstruire / redémarrer : `docker compose up --build` (le démarrage lance `npm install`). |
| **CORS** dans la console du navigateur | En `development`, l’API accepte toutes les origines. Si vous passez en `production`, renseignez `CORS_ORIGIN` correctement. Évitez `file://` pour le front. |
| Port **3000** ou **3306** déjà utilisé | Arrêter l’autre service ou modifier le mapping de ports dans `docker-compose.yml` (ex. `3001:3000` pour l’API — adaptez alors `API_URL` dans `frontend/app.js` ou utilisez un reverse-proxy). |
| Connexion MySQL refusée depuis l’hôte | Vérifier que le port `3306` est bien publié et que le pare-feu local n’intercepte pas. |

---

## 9. Fichiers utiles dans le dépôt

| Fichier / dossier | Contenu |
|-------------------|---------|
| `docker-compose.yml` | Services, ports, variables d’environnement. |
| `backend/Dockerfile` | Image Node 20 Alpine, démarrage avec `npm install && npm start`. |
| `database/sql/schema.sql` | Création des tables. |
| `database/sql/seed.sql` | Données de test (si fournies). |
| `frontend/app.js` | URL de l’API (`API_URL`, par défaut `http://localhost:3000`). |

Pour toute évolution de ce document, gardez-le aligné avec les versions réelles des images et des ports du dépôt.
