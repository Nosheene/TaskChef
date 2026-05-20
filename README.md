# TaskChef

Application web de gestion de tâches réalisée dans le cadre d’un projet de formation (ECF).

## Objectif

Permettre à un utilisateur de créer, modifier, supprimer et suivre ses tâches à travers une interface **HTML / CSS / JavaScript** responsive, une **API REST** sous **Node.js / Express**, une base **MySQL** (données métier), une base **MongoDB** (logs d’activité), et une exécution **Docker Compose** pour l’environnement de développement.

## Fonctionnalités principales

- Authentification (JWT), rôles utilisateur
- CRUD tâches (MySQL), filtre par statut
- Journalisation d’activité (MongoDB)
- Interface responsive (grille, navigation)

## Technologies

| Couche | Stack |
|--------|--------|
| Front | HTML5, CSS3, JavaScript (`fetch`), Bootstrap 5 |
| Back | Node.js 20, Express 5 |
| Données | MySQL 8, MongoDB 7 |
| Outils | Git, Docker, Docker Compose |

## Démarrage rapide avec Docker

La procédure complète (prérequis, variables d’environnement, CORS, import SQL, dépannage) est décrite ici :

**[docs/environnement-et-docker.md](docs/environnement-et-docker.md)**

En résumé, à la racine du projet :

```bash
git clone <url-du-depot>
cd TaskChef
docker compose up --build
```

Puis importez le schéma et le jeu d’essai SQL (voir la section 3 du document Docker). Ouvrez le front via un petit serveur HTTP et une origine autorisée par CORS (détails dans le même document).

## Structure du dépôt

```
TaskChef/
├── backend/           # API Express (Dockerfile, server.js)
├── frontend/          # Pages statiques (HTML, CSS, JS)
├── database/sql/      # Scripts MySQL (schéma, seed)
├── docs/              # Documentation (Docker, Postman, déploiement, …)
│   └── postman/       # Collection Postman importable
├── docker-compose.yml # MySQL, MongoDB, backend
└── README.md
```

## Documentation

| Document | Contenu |
|----------|---------|
| [docs/environnement-et-docker.md](docs/environnement-et-docker.md) | Installation, Docker Compose, variables, URLs, commandes, dépannage |
| [docs/tests-postman.md](docs/tests-postman.md) | Pas à pas tests API avec Postman |
| [docs/postman/TaskChef.postman_collection.json](docs/postman/TaskChef.postman_collection.json) | Collection Postman (import) |
| [docs/deploiement-alwaysdata.md](docs/deploiement-alwaysdata.md) | Déploiement type Alwaysdata (SFTP, Node, CORS, Mongo Atlas) |
| [docs/pas-a-pas-complet.md](docs/pas-a-pas-complet.md) | **Guide complet** : env. test, captures dossier, Postman, déploiement |
| [docs/phase-4-deploiement-alwaysdata-pas-a-pas.md](docs/phase-4-deploiement-alwaysdata-pas-a-pas.md) | **Phase 4** : déploiement Alwaysdata pas à pas |

## Auteur

Nosheene MOHAMMAD
