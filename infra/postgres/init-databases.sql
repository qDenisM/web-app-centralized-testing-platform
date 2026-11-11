-- Создаём отдельные БД под database-per-service (OLTP).
-- Analytics живёт в ClickHouse, не здесь.
-- Скрипт выполняется только при первом старте тома Postgres.

SELECT 'Creating service databases...' AS info;

CREATE DATABASE identity;
CREATE DATABASE catalog;
CREATE DATABASE applicant;
CREATE DATABASE exam;
CREATE DATABASE results;
CREATE DATABASE chances;
CREATE DATABASE notification;

-- Права пользователю приложения (тот же, что POSTGRES_USER в compose)
GRANT ALL PRIVILEGES ON DATABASE identity TO abiturent;
GRANT ALL PRIVILEGES ON DATABASE catalog TO abiturent;
GRANT ALL PRIVILEGES ON DATABASE applicant TO abiturent;
GRANT ALL PRIVILEGES ON DATABASE exam TO abiturent;
GRANT ALL PRIVILEGES ON DATABASE results TO abiturent;
GRANT ALL PRIVILEGES ON DATABASE chances TO abiturent;
GRANT ALL PRIVILEGES ON DATABASE notification TO abiturent;
