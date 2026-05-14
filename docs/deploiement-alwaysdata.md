# Déploiement TaskChef — approche type Alwaysdata

Ce document décrit une **démarche type** hébergement mutualisé (ex. **Alwaysdata**) : front statique par **FTP/SFTP**, API **Node.js** configurée dans le panneau, bases **MySQL** (+ **MongoDB** souvent externe, ex. **Atlas**). Adaptez les noms d’hôtes et menus à **votre** interface Alwaysdata et à **votre** offre.

> **Important** : en production, ne réutilisez pas les mots de passe ou `JWT_SECRET` du `docker-compose.yml` de développement.

---

## 1. Vue d’ensemble

| Composant | Où l’héberger ? | Mode de transfert / config typique |
|-----------|-----------------|-------------------------------------|
| **Frontend** (`frontend/`) | Site **statique** (ou équivalent) | **SFTP/FTP** vers le répertoire web public |
| **Backend** (`backend/`) | Site **Node.js** | Fichiers par **SFTP** + commande de démarrage dans l’admin (ex. `npm start` ou `node server.js`) + `npm install` en **SSH** |
| **MySQL** | Base fournie par l’hébergeur | Paramètres dans l’admin (hôte, port, utilisateur, base) |
| **MongoDB** | Souvent **externe** (MongoDB Atlas gratuit possible) | Variable `MONGO_URI` sur le site Node |

Le **Docker Compose** du dépôt sert surtout au **développement local** ; en mutualisé classique on ne lance généralement **pas** `docker compose` sur les serveurs Alwaysdata.

---

## 2. Front-end (SFTP / FTP)

1. Créez un site **statique** (ou le type proposé pour fichiers HTML/CSS/JS).
2. Avec **FileZilla**, **Cyberduck** ou le client SFTP intégré, uploadez le contenu de **`frontend/`** (fichiers à la racine du site : `index.html`, `login.html`, `styles.css`, `app.js`, dossier **`assets/`**, etc.).
3. **URL du front** : notez l’URL HTTPS (ex. `https://votrecompte.alwaysdata.net/`).

### Modifier l’URL de l’API

Dans **`frontend/app.js`**, la constante **`API_URL`** pointe par défaut vers `http://localhost:3000`.

- Remplacez-la par l’URL **HTTPS** de votre API en production, par exemple :  
  `const API_URL = "https://api-votrecompte.alwaysdata.net";`  
  (exemple indicatif : adaptez au sous-domaine / chemin réels.)

4. Re-uploadez **`app.js`** après modification.

---

## 3. Back-end Node.js (Alwaysdata)

1. Créez un site de type **Node.js** dans l’administration.
2. Uploadez le dossier **`backend/`** (sans `node_modules` : plus léger ; installez les deps en SSH).
3. En **SSH** (accès fourni par Alwaysdata), dans le répertoire de l’app :

   ```bash
   npm install --omit=dev
   ```

4. Définissez la **commande de démarrage** attendue par l’hébergeur (souvent `npm start` ou `node server.js` — voir [aide Node.js Alwaysdata](https://help.alwaysdata.com/fr/hebergement-web/langages/nodejs/)).
5. Configurez les **variables d’environnement** du site Node (équivalent de votre `docker-compose`) :
   - `PORT` — souvent imposé ou ignoré selon l’hébergeur ; suivez la doc Alwaysdata.
   - `NODE_ENV=production`
   - `JWT_SECRET` — chaîne longue et aléatoire.
   - `CORS_ORIGIN` — **origine exacte du front**, ex. `https://votrecompte.alwaysdata.net` (sans slash final si l’API est stricte ; testez les deux).
   - `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` — valeurs **MySQL Alwaysdata**.
   - `MONGO_URI` — URI **Atlas** ou Mongo fourni par l’hébergeur si disponible.

6. **Importer le schéma** `database/sql/schema.sql` dans la base MySQL Alwaysdata (phpMyAdmin, client MySQL, ou script).

---

## 4. CORS et HTTPS

- En **production**, `server.js` n’accepte les origines croisées que si elles figurent dans **`CORS_ORIGIN`** (et selon la logique `NODE_ENV`).
- Le **front** et l’**API** doivent être en **HTTPS** en production pour éviter les blocages navigateur (contenu mixte).

Testez depuis le navigateur : onglet **Network** sur une action login / liste des tâches ; en cas d’erreur CORS, vérifiez l’URL exacte du `Origin` et ajoutez-la à `CORS_ORIGIN`.

---

## 5. MongoDB (Atlas — exemple)

1. Créez un cluster gratuit sur [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Autorisez l’**IP sortante** du serveur Alwaysdata (ou `0.0.0.0/0` temporairement pour test — moins sécurisé).
3. Copiez la **chaîne de connexion** (avec utilisateur et mot de passe) dans **`MONGO_URI`**.

---

## 6. Checklist avant de dire « en ligne »

- [ ] Schéma SQL appliqué sur MySQL de production.
- [ ] `JWT_SECRET` et mots de passe forts.
- [ ] `CORS_ORIGIN` = URL du front.
- [ ] `API_URL` dans `app.js` = URL de l’API HTTPS.
- [ ] Connexion MongoDB OK (`/health` ou création de tâche qui écrit un log).
- [ ] Test manuel : inscription, login, CRUD tâche, logs.

---

## 7. Pour le dossier projet (ECF)

Documentez en **captures** :

1. Écran d’administration Alwaysdata (site Node + variables d’environnement — **masquez** les secrets).
2. Client SFTP montrant les fichiers du front uploadés.
3. Navigateur sur l’URL de production + une requête **Network** réussie vers l’API.

Mentionnez explicitement que le **déploiement local** utilise Docker (voir `environnement-et-docker.md`) et que le **déploiement distant** utilise l’hébergeur + SFTP + configuration Node.
