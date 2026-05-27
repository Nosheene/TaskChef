# Déploiement TaskChef — Alwaysdata

## Quelle doc suivre ?

| Situation | Document |
|-----------|----------|
| **Recommandé** — front + MySQL sur Alwaysdata, API sur **Render** (gratuit) | **[deploiement-alwaysdata-render.md](deploiement-alwaysdata-render.md)** |
| Tout sur Alwaysdata (site statique **et** site Node.js sur le même compte) | Ce fichier + [phase-4-deploiement-alwaysdata-pas-a-pas.md](phase-4-deploiement-alwaysdata-pas-a-pas.md) |

> En production, ne réutilisez pas les secrets du `docker-compose.yml` local.

---

## 1. Vue d’ensemble (tout Alwaysdata)

| Composant | Où ? | Transfert / config |
|-----------|------|---------------------|
| **Frontend** | Site **statique** | SFTP → répertoire `www` |
| **Backend** | Site **Node.js** | SFTP → `backend/` + SSH `npm install` |
| **MySQL** | Alwaysdata | Import `database/sql/schema.sql` |
| **MongoDB** | **Atlas** (souvent) | `MONGO_URI` sur le site Node |

Le **Docker Compose** du dépôt sert au **développement local** uniquement.

---

## 2. Front-end (SFTP)

1. Créer un site **statique** → adresse `votrecompte.alwaysdata.net` (pas le domaine `alwaysdata.net` seul).
2. Répertoire : **`www`** — y placer **directement** `index.html`, `login.html`, `app.js`, `styles.css`, `assets/`, etc.
3. **Directives Apache** du virtual host : **laisser vide**.

### `API_URL`

En production hybride (Render), `frontend/app.js` bascule automatiquement :

- `localhost` / `127.0.0.1` → `http://localhost:3000`
- sinon → URL Render (à adapter dans le fichier si besoin)

Si l’API est sur Alwaysdata, définissez l’URL HTTPS du site Node dans la branche « production » du fichier.

Re-uploadez **`app.js`** après toute modification.

---

## 3. Back-end Node.js (Alwaysdata)

1. **Web → Sites → Ajouter** → type **Node.js**.
2. Répertoire : `backend` — commande : `npm start`.
3. SFTP : envoyer `backend/` (sans `node_modules`).
4. SSH :

```bash
ssh VOTRE_LOGIN@ssh-VOTRE_COMPTE.alwaysdata.net
cd ~/backend
npm install --omit=dev
```

5. Variables d’environnement :

| Variable | Exemple |
|----------|---------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | chaîne longue aléatoire |
| `CORS_ORIGIN` | `https://votrecompte.alwaysdata.net` |
| `MYSQL_HOST` | `mysql-votrecompte.alwaysdata.net` |
| `MYSQL_PORT` | `3306` |
| `MYSQL_USER` | utilisateur MySQL |
| `MYSQL_PASSWORD` | mot de passe |
| `MYSQL_DATABASE` | nom **exact** de la base (ex. `taskchef_bd`) |
| `MONGO_URI` | chaîne Atlas |

6. Importer `database/sql/schema.sql` (phpMyAdmin ou client MySQL).

7. Test : `curl -s https://URL-DU-SITE-NODE.alwaysdata.net/health`

---

## 4. CORS et HTTPS

- En `production`, seules les origines de **`CORS_ORIGIN`** sont acceptées.
- Front et API en **HTTPS**.
- En cas d’erreur CORS : F12 → onglet Network → comparer l’`Origin` avec `CORS_ORIGIN` (sans slash final).

---

## 5. MongoDB Atlas

1. Cluster gratuit M0.
2. Utilisateur + **Network Access** (IP du serveur ou `0.0.0.0/0` pour test).
3. Chaîne `mongodb+srv://...` dans **`MONGO_URI`**.

---

## 6. Checklist « en ligne »

- [ ] Tables `users` / `tasks` présentes
- [ ] `/health` → `mysql` et `mongo` **ok**
- [ ] `CORS_ORIGIN` = URL du front
- [ ] `app.js` pointe vers la bonne API
- [ ] Inscription, login, CRUD tâches, historique

---

## 7. Dossier ECF (II.4)

Captures : admin Alwaysdata (secrets floutés), SFTP du front, navigateur + Network, réponse `/health`.

Préciser : **local** = Docker Compose ; **distant** = Alwaysdata (+ Render pour l’API si pas de site Node).
