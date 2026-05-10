CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nom VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  mot_de_passe VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  titre VARCHAR(200) NOT NULL,
  description TEXT,
  statut ENUM('a_faire', 'en_cours', 'termine') DEFAULT 'a_faire',
  priorite ENUM('basse', 'moyenne', 'haute') DEFAULT 'moyenne',
  date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
  date_limite DATE,
  user_id INT NULL,
  CONSTRAINT fk_tasks_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
);
