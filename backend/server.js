const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mysql = require("mysql2/promise");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

// Docker / reverse-proxy : évite les erreurs express-rate-limit si X-Forwarded-* est présent
app.set("trust proxy", 1);

const isProduction = process.env.NODE_ENV === "production";
const jwtSecret = process.env.JWT_SECRET || "change-me-in-production";
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || !isProduction || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin non autorisee par CORS."));
    },
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
  })
);

app.use(express.json());

const mysqlPool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "root",
  database: process.env.MYSQL_DATABASE || "taskchef",
  waitForConnections: true,
  connectionLimit: 10,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForMysql() {
  const max = Number(process.env.MYSQL_RETRY_ATTEMPTS || 30);
  for (let i = 0; i < max; i++) {
    try {
      await mysqlPool.query("SELECT 1");
      console.log("MySQL connecte");
      return;
    } catch (error) {
      console.error(`MySQL pas pret (${i + 1}/${max}):`, error.message);
      await sleep(2000);
    }
  }
  throw new Error("MySQL indisponible apres les tentatives.");
}

async function waitForMongo() {
  const max = Number(process.env.MONGO_RETRY_ATTEMPTS || 30);
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/taskchef";
  if (mongoose.connection.readyState === 1) {
    console.log("MongoDB connecte");
    return;
  }
  for (let i = 0; i < max; i++) {
    try {
      await mongoose.connect(mongoUri);
      console.log("MongoDB connecte");
      return;
    } catch (error) {
      console.error(`Mongo pas pret (${i + 1}/${max}):`, error.message);
      await sleep(2000);
    }
  }
  throw new Error("Mongo indisponible apres les tentatives.");
}

const activityLogSchema = new mongoose.Schema(
  {
    task_id: { type: Number, required: true },
    action: { type: String, required: true },
    user_id: { type: Number, required: true },
    details: { type: String, default: "" },
  },
  { timestamps: { createdAt: "timestamp", updatedAt: false } }
);

const ActivityLog = mongoose.models.ActivityLog || mongoose.model("ActivityLog", activityLogSchema);

async function writeActivityLog({ taskId, action, userId, details = "" }) {
  try {
    await ActivityLog.create({
      task_id: taskId,
      action,
      user_id: userId,
      details,
    });
  } catch (_error) {
    // Keep API stable even if log insert fails.
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ message: "Token manquant." });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Token invalide ou expire." });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: "Acces refuse." });
    }
    return next();
  };
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { message: "Trop de tentatives. Reessayez plus tard." },
});

app.get("/", (req, res) => {
  res.json({ message: "API TaskChef fonctionne !" });
});

app.get("/health", async (_req, res) => {
  const health = {
    api: "ok",
    mysql: "down",
    mongo: "down",
  };

  try {
    await mysqlPool.query("SELECT 1");
    health.mysql = "ok";
  } catch (error) {
    health.mysql = "down";
  }

  health.mongo = mongoose.connection.readyState === 1 ? "ok" : "down";

  const statusCode = health.mysql === "ok" && health.mongo === "ok" ? 200 : 503;
  return res.status(statusCode).json(health);
});

app.post("/auth/register", authLimiter, async (req, res) => {
  const { nom, email, mot_de_passe } = req.body;

  if (!nom || nom.trim().length < 2) {
    return res.status(400).json({ message: "Nom invalide." });
  }
  if (!email || !email.includes("@")) {
    return res.status(400).json({ message: "Email invalide." });
  }
  if (!mot_de_passe || mot_de_passe.length < 8) {
    return res.status(400).json({ message: "Mot de passe trop court (min 8)." });
  }

  try {
    const [existing] = await mysqlPool.execute("SELECT id FROM users WHERE email = ?", [email.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "Email deja utilise." });
    }

    const hash = await bcrypt.hash(mot_de_passe, 10);
    const [result] = await mysqlPool.execute(
      "INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?, ?, ?, 'user')",
      [nom.trim(), email.trim().toLowerCase(), hash]
    );

    return res.status(201).json({ message: "Compte cree.", userId: result.insertId });
  } catch (error) {
    return res.status(500).json({ message: "Erreur lors de l'inscription." });
  }
});

app.post("/auth/login", authLimiter, async (req, res) => {
  const { email, mot_de_passe } = req.body;

  if (!email || !mot_de_passe) {
    return res.status(400).json({ message: "Email et mot de passe requis." });
  }

  try {
    const [rows] = await mysqlPool.execute(
      "SELECT id, nom, email, mot_de_passe, role FROM users WHERE email = ? LIMIT 1",
      [email.trim().toLowerCase()]
    );
    if (rows.length === 0) {
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    const user = rows[0];
    const isPasswordValid = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: "8h" }
    );

    return res.json({
      message: "Connexion reussie.",
      token,
      user: { id: user.id, nom: user.nom, email: user.email, role: user.role },
    });
  } catch (error) {
    return res.status(500).json({ message: "Erreur lors de la connexion." });
  }
});

app.get("/tasks", async (_req, res) => {
  try {
    const [rows] = await mysqlPool.query(
      `SELECT id, titre, description, statut, priorite, date_limite, date_creation
       FROM tasks
       ORDER BY date_creation DESC`
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Erreur lors de la lecture des taches." });
  }
});

app.get("/tasks/:id", async (req, res) => {
  const taskId = Number(req.params.id);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    return res.status(400).json({ message: "ID de tache invalide." });
  }
  try {
    const [rows] = await mysqlPool.execute(
      `SELECT id, titre, description, statut, priorite, date_limite, date_creation
       FROM tasks
       WHERE id = ?
       LIMIT 1`,
      [taskId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Tache introuvable." });
    }
    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Erreur lors de la lecture de la tache." });
  }
});

app.get("/activity-logs", authenticateToken, async (_req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ timestamp: -1 }).limit(100).lean();
    return res.json(logs);
  } catch (error) {
    return res.status(500).json({ message: "Erreur lors de la lecture des logs." });
  }
});

app.post("/tasks", authenticateToken, async (req, res) => {
  const { titre, description, statut, priorite, date_limite } = req.body;

  if (!titre || titre.trim().length < 3) {
    return res.status(400).json({ message: "Le titre est obligatoire (min 3 caracteres)." });
  }

  try {
    const [result] = await mysqlPool.execute(
      `INSERT INTO tasks (titre, description, statut, priorite, date_limite)
       VALUES (?, ?, ?, ?, ?)`,
      [
        titre.trim(),
        description || null,
        statut || "a_faire",
        priorite || "moyenne",
        date_limite || null,
      ]
    );

    await writeActivityLog({
      taskId: result.insertId,
      action: "created",
      userId: req.user.id,
      details: titre.trim(),
    });

    return res.status(201).json({
      message: "Tache creee.",
      id: result.insertId,
    });
  } catch (error) {
    return res.status(500).json({ message: "Erreur lors de la creation de la tache." });
  }
});

app.put("/tasks/:id", authenticateToken, async (req, res) => {
  const taskId = Number(req.params.id);
  const { titre, description, statut, priorite, date_limite } = req.body;

  if (!Number.isInteger(taskId) || taskId <= 0) {
    return res.status(400).json({ message: "ID de tache invalide." });
  }

  if (!titre || titre.trim().length < 3) {
    return res.status(400).json({ message: "Le titre est obligatoire (min 3 caracteres)." });
  }

  try {
    const [result] = await mysqlPool.execute(
      `UPDATE tasks
       SET titre = ?, description = ?, statut = ?, priorite = ?, date_limite = ?
       WHERE id = ?`,
      [
        titre.trim(),
        description || null,
        statut || "a_faire",
        priorite || "moyenne",
        date_limite || null,
        taskId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Tache introuvable." });
    }

    await writeActivityLog({
      taskId,
      action: "updated",
      userId: req.user.id,
      details: titre.trim(),
    });

    return res.json({ message: "Tache mise a jour." });
  } catch (error) {
    return res.status(500).json({ message: "Erreur lors de la mise a jour." });
  }
});

app.delete("/tasks/:id", authenticateToken, requireRole("admin"), async (req, res) => {
  const taskId = Number(req.params.id);

  if (!Number.isInteger(taskId) || taskId <= 0) {
    return res.status(400).json({ message: "ID de tache invalide." });
  }

  try {
    const [result] = await mysqlPool.execute("DELETE FROM tasks WHERE id = ?", [taskId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Tache introuvable." });
    }

    await writeActivityLog({
      taskId,
      action: "deleted",
      userId: req.user.id,
      details: `task:${taskId}`,
    });

    return res.json({ message: "Tache supprimee." });
  } catch (error) {
    return res.status(500).json({ message: "Erreur lors de la suppression." });
  }
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await Promise.all([waitForMongo(), waitForMysql()]);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Serveur lance sur le port ${PORT}`);
    });
  } catch (error) {
    console.error("Erreur de demarrage serveur:", error.message);
    process.exit(1);
  }
}

startServer();