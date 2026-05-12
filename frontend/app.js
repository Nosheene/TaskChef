const API_URL = "http://localhost:3000";

function getToken() {
  return localStorage.getItem("taskchef_token");
}

function setAlert(message, type = "danger") {
  const alert = document.getElementById("alert");
  if (!alert) return;
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = "login.html";
  }
}

async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new Error(data?.message || "Erreur API");
  }

  return data;
}

async function initLogin() {
  const form = document.getElementById("loginForm");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: document.getElementById("email").value,
          mot_de_passe: document.getElementById("password").value,
        }),
      });

      localStorage.setItem("taskchef_token", data.token);
      localStorage.setItem("taskchef_user", JSON.stringify(data.user));
      window.location.href = "index.html";
    } catch (error) {
      setAlert(error.message);
    }
  });
}

async function initRegister() {
  const form = document.getElementById("registerForm");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          nom: document.getElementById("name").value,
          email: document.getElementById("email").value,
          mot_de_passe: document.getElementById("password").value,
        }),
      });

      setAlert("Compte créé. Vous pouvez maintenant vous connecter.", "success");
      form.reset();
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);
    } catch (error) {
      setAlert(error.message);
    }
  });
}

function taskStatusLabel(status) {
  return {
    a_faire: "À faire",
    en_cours: "En cours",
    termine: "Terminé",
  }[status] || status;
}

function createTaskCard(task) {
  const article = document.createElement("article");
  article.className = "card task-card shadow-sm";

  const body = document.createElement("div");
  body.className = "card-body";

  const title = document.createElement("h3");
  title.className = "h5";
  title.textContent = task.titre;

  const description = document.createElement("p");
  description.className = "text-muted";
  description.textContent = task.description || "Aucune description";

  const status = document.createElement("span");
  status.className = "badge text-bg-primary badge-status me-2";
  status.textContent = taskStatusLabel(task.statut);

  const priority = document.createElement("span");
  priority.className = "badge text-bg-secondary badge-status";
  priority.textContent = task.priorite;

  const deadline = document.createElement("p");
  deadline.className = "small text-muted mt-3 mb-0";
  deadline.textContent = task.date_limite
    ? `Date limite : ${new Date(task.date_limite).toLocaleDateString("fr-FR")}`
    : "Pas de date limite";

  body.append(title, description, status, priority, deadline);
  article.appendChild(body);
  return article;
}

async function loadTasks() {
  const tasksList = document.getElementById("tasksList");
  const statusFilter = document.getElementById("statusFilter");
  tasksList.textContent = "Chargement...";

  try {
    const tasks = await apiFetch("/tasks");
    const filteredTasks = statusFilter.value
      ? tasks.filter((task) => task.statut === statusFilter.value)
      : tasks;

    tasksList.textContent = "";
    if (filteredTasks.length === 0) {
      tasksList.textContent = "Aucune tâche à afficher.";
      return;
    }

    filteredTasks.forEach((task) => tasksList.appendChild(createTaskCard(task)));
  } catch (error) {
    setAlert(error.message);
  }
}

async function loadActivityLogs() {
  const logsList = document.getElementById("logsList");
  const token = getToken();
  if (!token) return;

  try {
    const logs = await apiFetch("/activity-logs", {
      headers: { Authorization: `Bearer ${token}` },
    });

    logsList.textContent = "";
    if (logs.length === 0) {
      logsList.textContent = "Aucun log pour le moment.";
      return;
    }

    logs.forEach((log) => {
      const item = document.createElement("div");
      item.className = "list-group-item";
      item.textContent = `${log.action} - tâche ${log.task_id} - ${new Date(log.timestamp).toLocaleString("fr-FR")}`;
      logsList.appendChild(item);
    });
  } catch (error) {
    logsList.textContent = error.message;
  }
}

async function initDashboard() {
  requireAuth();
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("taskchef_token");
    localStorage.removeItem("taskchef_user");
    window.location.href = "login.html";
  });
  document.getElementById("statusFilter").addEventListener("change", loadTasks);
  await loadTasks();
  await loadActivityLogs();
}

async function initCreateTask() {
  requireAuth();
  const form = document.getElementById("taskForm");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await apiFetch("/tasks", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          titre: document.getElementById("title").value,
          description: document.getElementById("description").value,
          statut: document.getElementById("status").value,
          priorite: document.getElementById("priority").value,
          date_limite: document.getElementById("deadline").value || null,
        }),
      });

      setAlert("Tâche créée avec succès.", "success");
      form.reset();
    } catch (error) {
      setAlert(error.message);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "login") initLogin();
  if (page === "register") initRegister();
  if (page === "dashboard") initDashboard();
  if (page === "create-task") initCreateTask();
});
