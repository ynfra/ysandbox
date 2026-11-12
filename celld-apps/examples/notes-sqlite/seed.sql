CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
INSERT INTO notes (body) VALUES ('Welcome to your notes app'), ('Notes live in a per-app SQLite database'), ('Delete me with the button');
