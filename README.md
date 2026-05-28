# TaskChef

Application web de gestion de tâches réalisée dans le cadre d’un projet de formation (ECF — DWWM1).

## Objectif

Permettre à un utilisateur de créer, modifier, supprimer et suivre ses tâches via une interface **HTML / CSS / JavaScript** responsive, une **API REST** **Node.js / Express**, une base **MySQL** (utilisateurs et tâches), une base **MongoDB** (historique des actions), et un environnement de développement reproductible avec **Docker Compose**.

## Fonctionnalités principales

- Authentification JWT (inscription, connexion, rôles `user` / `admin`)
- CRUD tâches en MySQL, filtre par statut sur le tableau de bord
- Historique des actions (MongoDB), affiché sur le dashboard
- Interface responsive (desktop et web mobile)
- API documentée et testable (Postman)

## Technologies

| Couche | Stack |
|--------|--------|
| Front | HTML5, CSS3, JavaScript (`fetch`), Bootstrap 5 |
| Back | Node.js 20, Express 5, bcrypt, JWT |
| Données | MySQL 8, MongoDB 7 (Mongoose) |
| Outils | Git, Docker, Docker Compose |

## Pages du front

| Fichier | Description |
|---------|-------------|
| `login.html` | Connexion |
| `register.html` | Inscription |
| `index.html` | Tableau de bord + historique |
| `create-task.html` | Nouvelle tâche |
| `task-detail.html` | Détail / modification / suppression (admin) |

Logique client centralisée dans **`frontend/app.js`**.

## Démarrage rapide (local)

Documentation complète : **[docs/environnement-et-docker.md](docs/environnement-et-docker.md)**

```bash
git clone <url-du-depot>
cd TaskChef
docker compose up --build
```

Importer le schéma SQL :

```bash
docker compose exec -T mysql mysql -utaskchef_user -ptaskchef_pass taskchef < database/sql/schema.sql
```

Lancer le front (autre terminal) :

```bash
cd frontend && python3 -m http.server 5500
```

- Front : http://localhost:5500/login.html  
- API : http://localhost:3000/health  

`frontend/app.js` utilise automatiquement `http://localhost:3000` en local.

## Déploiement production

Architecture utilisée pour la mise en ligne :

| Composant | Hébergeur | Exemple d’URL |
|-----------|-----------|----------------|
| Front statique | **Alwaysdata** | `https://taskchef.alwaysdata.net` |
| API Node.js | **Render** (plan gratuit) | `https://taskchef-api.onrender.com` |
| MySQL | **Alwaysdata** | base `taskchef_bd` |
| MongoDB | **MongoDB Atlas** M0 | variable `MONGO_URI` |

Guide pas à pas : **[docs/deploiement-alwaysdata-render.md](docs/deploiement-alwaysdata-render.md)**

Variante « tout sur Alwaysdata » (statique + Node) : **[docs/deploiement-alwaysdata.md](docs/deploiement-alwaysdata.md)**

En production, `app.js` pointe vers l’API Render lorsque le site n’est pas servi depuis `localhost`.

Variables API Render (extrait) : `MYSQL_*` (Alwaysdata), `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN=https://taskchef.alwaysdata.net`.

Test :

```bash
curl -s https://taskchef-api.onrender.com/health
```

## Structure du dépôt

```
TaskChef/
├── backend/              # API Express (server.js, package.json)
├── frontend/             # Pages HTML, styles.css, app.js, assets/
├── database/sql/         # schema.sql, seed.sql
├── docs/                 # Guides Docker, Postman, déploiement
│   └── postman/          # Collection Postman
├── docker-compose.yml
└── README.md
```

## Routes API principales

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/health` | État API, MySQL, MongoDB |
| POST | `/auth/register` | Inscription |
| POST | `/auth/login` | Connexion (JWT) |
| GET | `/tasks` | Liste des tâches |
| GET | `/tasks/:id` | Détail d’une tâche |
| POST | `/tasks` | Création (JWT) |
| PUT | `/tasks/:id` | Modification (JWT) |
| DELETE | `/tasks/:id` | Suppression (JWT, admin) |
| GET | `/activity-logs` | Historique (JWT) |

## Documentation

| Document | Contenu |
|----------|---------|
| [docs/environnement-et-docker.md](docs/environnement-et-docker.md) | Docker, variables, CORS, dépannage local |
| [docs/tests-postman.md](docs/tests-postman.md) | Tests API avec Postman |
| [docs/postman/TaskChef.postman_collection.json](docs/postman/TaskChef.postman_collection.json) | Collection importable |
| [docs/deploiement-alwaysdata-render.md](docs/deploiement-alwaysdata-render.md) | **Prod** : Alwaysdata + Render + Atlas |
| [docs/deploiement-alwaysdata.md](docs/deploiement-alwaysdata.md) | Variante tout Alwaysdata |
| [docs/pas-a-pas-complet.md](docs/pas-a-pas-complet.md) | Guide ECF complet (phases 1 à 4) |
| [docs/phase-4-deploiement-alwaysdata-pas-a-pas.md](docs/phase-4-deploiement-alwaysdata-pas-a-pas.md) | Phase 4 détaillée |

> Modèle d’infos prod (local, non versionné) : `docs/alwaysdata-infos-prod.txt` (dans `.gitignore`).

## Auteur

Nosheene MOHAMMAD
