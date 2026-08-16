CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    json TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS profiles_created_at ON profiles(created_at);

CREATE TABLE IF NOT EXISTS active_installs (
    id_hash TEXT PRIMARY KEY,
    last_seen INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS active_installs_last_seen ON active_installs(last_seen);
