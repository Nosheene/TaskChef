INSERT INTO users (nom, email, mot_de_passe, role)
VALUES
  ('Admin TaskChef', 'admin@taskchef.local', '$2b$10$examplehash', 'admin'),
  ('Utilisateur Demo', 'user@taskchef.local', '$2b$10$examplehash', 'user');

INSERT INTO tasks (titre, description, statut, priorite, date_limite, user_id)
VALUES
  ('Preparer maquette web', 'Creer les ecrans dashboard et creation', 'a_faire', 'haute', '2026-05-15', 1),
  ('Ecrire documentation Docker', 'Documenter install, run et debug', 'en_cours', 'moyenne', '2026-05-16', 1),
  ('Verifier CRUD API', 'Tester toutes les routes avec Postman', 'termine', 'moyenne', '2026-05-14', 2);
