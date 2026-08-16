CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    json TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS profiles_created_at ON profiles(created_at);
