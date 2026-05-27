# Déploiement production — Alwaysdata (front + MySQL) + Render (API)

Guide **recommandé** pour TaskChef lorsque Alwaysdata ne permet pas (ou difficilement) un second site **Node.js** sur le même compte.

| Composant | Hébergeur | Coût typique |
|-----------|-----------|--------------|
| Front statique (`frontend/`) | Alwaysdata | Offre gratuite Alwaysdata |
| API Node.js (`backend/`) | [Render](https://render.com) | Plan gratuit (veille après inactivité) |
| MySQL (`users`, `tasks`) | Alwaysdata | Inclus |
| MongoDB (historique) | [MongoDB Atlas](https://www.mongodb.com/atlas) M0 | Gratuit |

> **Docker Compose** reste réservé au **développement local** ([environnement-et-docker.md](environnement-et-docker.md)).

---

## Architecture

```text
Navigateur
    → https://VOTRE-COMPTE.alwaysdata.net  (front HTML/JS)
    → fetch → https://VOTRE-API.onrender.com  (API Express)
                    → MySQL Alwaysdata (ex. taskchef_bd)
                    → MongoDB Atlas
```

---

## 1. MySQL sur Alwaysdata

1. Admin → **Bases de données** → **MySQL** : créer la base et l’utilisateur (droits complets sur la base).
2. Noter : hôte (`mysql-xxx.alwaysdata.net`), port `3306`, utilisateur, mot de passe, **nom exact de la base** (ex. `taskchef_bd`).
3. Importer le schéma depuis votre Mac :

```bash
cd ~/TaskChef
export MYSQLHOST="mysql-VOTRE_COMPTE.alwaysdata.net"
export MYSQLPORT="3306"
export MYSQLUSER="VOTRE_USER"
export MYSQLPASSWORD="VOTRE_MDP"
export MYSQLDATABASE="taskchef_bd"

mysql -h "$MYSQLHOST" -P "$MYSQLPORT" -u "$MYSQLUSER" -p"$MYSQLPASSWORD" "$MYSQLDATABASE" < database/sql/schema.sql
mysql -h "$MYSQLHOST" -P "$MYSQLPORT" -u "$MYSQLUSER" -p"$MYSQLPASSWORD" "$MYSQLDATABASE" -e "SHOW TABLES;"
```

Attendu : tables `users` et `tasks`.

---

## 2. MongoDB Atlas

1. Cluster M0 gratuit.
2. **Database Access** : utilisateur + mot de passe.
3. **Network Access** : `0.0.0.0/0` pour les tests (à restreindre plus tard).
4. Copier la chaîne `mongodb+srv://.../taskchef?retryWrites=true&w=majority` → **`MONGO_URI`**.

---

## 3. API sur Render

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service** → repo GitHub **TaskChef**.
2. Paramètres :

| Champ | Valeur |
|--------|--------|
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | Free |

3. Variables d’environnement :

```env
NODE_ENV=production
JWT_SECRET=CHAINE_LONGUE_ALEATOIRE

MYSQL_HOST=mysql-VOTRE_COMPTE.alwaysdata.net
MYSQL_PORT=3306
MYSQL_USER=VOTRE_USER
MYSQL_PASSWORD=VOTRE_MDP
MYSQL_DATABASE=taskchef_bd

MONGO_URI=mongodb+srv://...
CORS_ORIGIN=https://VOTRE-COMPTE.alwaysdata.net
```

Ne pas définir `PORT` : Render l’injecte automatiquement.

4. Déployer → noter l’URL (ex. `https://taskchef-api.onrender.com`).

5. Test :

```bash
curl -s "https://taskchef-api.onrender.com/health"
```

Attendu : `"mysql":"ok"` et `"mongo":"ok"`.

**Plan gratuit Render** : la première requête après veille peut prendre 30–60 s.

### Inscription / login (terminal)

```bash
API="https://taskchef-api.onrender.com"
EMAIL="test.$(date +%s)@gmail.com"
PASSWORD="Test1234A"

curl -s -X POST "$API/auth/register/" -H "Content-Type: application/json" \
  -d "{\"nom\":\"Test\",\"email\":\"$EMAIL\",\"mot_de_passe\":\"$PASSWORD\"}"

curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"mot_de_passe\":\"$PASSWORD\"}"
```

> L’API accepte `/auth/register` et `/auth/register/`. Le front appelle `/auth/register/`.

---

## 4. Front sur Alwaysdata (statique)

1. **Web** → **Sites** → site **statique** → adresse `VOTRE-COMPTE.alwaysdata.net`.
2. Répertoire : `www` (fichiers HTML **à la racine**, pas dans un sous-dossier `frontend/`).
3. **Directives Apache** : laisser **vide**.
4. SFTP → `ssh-VOTRE_COMPTE.alwaysdata.net` → uploader le contenu de `frontend/` dans `www/`.

### `API_URL` dans `app.js`

Le dépôt choisit automatiquement l’URL selon l’hôte :

```javascript
const API_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://taskchef-api.onrender.com";
```

Adaptez l’URL Render si la vôtre diffère, puis re-uploadez `app.js`.

---

## 5. Tests navigateur

1. `https://VOTRE-COMPTE.alwaysdata.net/register.html` — inscription (mot de passe ≥ 8 caractères).
2. `https://VOTRE-COMPTE.alwaysdata.net/login.html` — connexion.
3. Dashboard : CRUD tâches + section **Historique** (logs MongoDB).
4. **F12 → Network** : requêtes vers `onrender.com`, statuts **200**, pas d’erreur CORS.

---

## Dépannage

| Symptôme | Cause probable | Action |
|----------|----------------|--------|
| `upstream failed` sur l’URL **statique** | Test de `/health` sur le mauvais site | Tester `/health` sur l’URL **Render** uniquement |
| Inscription échoue, login OK en `curl` | Ancien `app.js` (`localhost`) sur le serveur | Re-uploader `app.js`, Ctrl+F5 |
| Erreur CORS | `CORS_ORIGIN` incorrect | URL front exacte, sans `/` final |
| `mysql: down` dans `/health` | Mauvaise base (`taskchef` vs `taskchef_bd`) | Corriger `MYSQL_DATABASE` sur Render |
| `mongo: down` | Atlas IP / `MONGO_URI` | `0.0.0.0/0` + URI complète |
| `Access denied` MySQL local | Mauvais nom de base | `SHOW DATABASES;` → utiliser le nom listé |
| Render lent | Veille plan gratuit | Attendre ~1 min, réessayer |

---

## Checklist ECF (II.4)

- [ ] Schéma SQL sur MySQL Alwaysdata (`users`, `tasks`)
- [ ] `/health` Render → mysql + mongo **ok**
- [ ] Front en ligne (Alwaysdata) + capture login / dashboard
- [ ] Capture Network (requête API HTTPS réussie)
- [ ] Mention : dev local = Docker ; prod = Alwaysdata + Render + Atlas

---

## Variante : tout sur Alwaysdata

Si votre offre permet **deux sites** (statique + Node.js), voir [deploiement-alwaysdata.md](deploiement-alwaysdata.md) et [phase-4-deploiement-alwaysdata-pas-a-pas.md](phase-4-deploiement-alwaysdata-pas-a-pas.md).
