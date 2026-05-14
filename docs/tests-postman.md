# Tests API avec Postman — TaskChef

Ce guide complète la collection **`postman/TaskChef.postman_collection.json`**.

---

## 1. Prérequis

1. **Docker** : `docker compose up --build` à la racine du projet, schéma SQL importé (voir [environnement-et-docker.md](environnement-et-docker.md)).
2. **Postman** installé (application ou web).
3. L’API doit répondre sur **`http://localhost:3000`** (ou modifiez la variable `base_url` après import).

---

## 2. Importer la collection

1. Postman → **Import** → fichier **`docs/postman/TaskChef.postman_collection.json`**.
2. Ouvrir la collection **TaskChef API** → onglet **Variables**.
3. Vérifier **`base_url`** = `http://localhost:3000` (ou votre URL de préproduction).

---

## 3. Ordre d’exécution recommandé (pas à pas)

| Étape | Requête | Résultat attendu |
|-------|---------|------------------|
| 1 | **GET /health** | JSON avec `api`, `mysql`, `mongo` (souvent **200** si tout est prêt, sinon **503**). |
| 2 | **POST /auth/register** | **201** si le compte est créé ; **409** si l’email existe déjà (changez l’email dans le body ou supprimez l’utilisateur en base). |
| 3 | **POST /auth/login** | **200** + corps avec `token` → script Postman enregistre **`token`** dans les variables de collection. |
| 4 | **GET /tasks** | **200** + tableau JSON (liste des tâches). |
| 5 | **POST /tasks** | **201** + `id` → script enregistre **`task_id`**. |
| 6 | **GET /tasks/:id** | **200** + détail de la tâche (utilise `task_id`). |
| 7 | **PUT /tasks/:id** | **200** « Tache mise a jour. » |
| 8 | **GET /activity-logs** | **200** + liste de logs MongoDB. |
| 9 | **DELETE /tasks/:id** | **200** seulement si le JWT est un **admin** ; sinon **403**. |

---

## 4. Compte administrateur (pour DELETE)

La route **`DELETE /tasks/:id`** exige le rôle **`admin`** (`server.js`).

Après inscription, le rôle par défaut est **`user`**. Pour tester la suppression en Postman :

```sql
UPDATE users SET role = 'admin' WHERE email = 'postman.test@taskchef.local';
```

(à exécuter dans MySQL, ex. `docker compose exec mysql mysql -uroot -proot taskchef -e "..."` en adaptant utilisateur/mot de passe selon votre `docker-compose.yml`.)

---

## 5. Captures pour le dossier projet

À joindre au mémo / annexe :

1. **GET /health** — statut **200** + corps JSON.
2. **POST /auth/login** — onglet **Body** + **Headers** de réponse ou **Tests** montrant le token (masquer une partie du JWT sur la capture si vous publiez le document).
3. **POST /tasks** avec header **`Authorization: Bearer …`** — preuve **JWT + fetch équivalent côté API**.
4. **GET /activity-logs** — liste JSON des logs.

---

## 6. Dépannage

| Problème | Piste |
|----------|--------|
| **Could not get response** / connexion refusée | Docker non démarré ou mauvais `base_url` / port. |
| **401** sur routes protégées | Refaire **Login** ; vérifier que `Authorization` contient `Bearer ` + token. |
| **429** sur `/auth/*` | Trop de tentatives : rate limiting — attendre quelques minutes. |
| **403** sur DELETE | Utilisateur pas **admin** — voir section 4. |

---

## 7. Lien avec le front

Le navigateur utilise la même API (`fetch` dans `frontend/app.js`). Les captures **Postman** et **Network** (Chrome / Firefox) peuvent illustrer le même contrat JSON pour le dossier ECF.
