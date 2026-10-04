import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
export function sqliteBinding(sqlite) {
  return { prepare(sql) { return {bind(...args) {return {async first(){return sqlite.prepare(sql).get(...args)??null;}};}}; } };
}
export function localSaveDatabase() {
  mkdirSync('.sites-runtime',{recursive:true});
  const sqlite=new DatabaseSync('.sites-runtime/game-saves.sqlite');
  sqlite.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
  for(const name of readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort()) {
    if(sqlite.prepare('SELECT name FROM local_migrations WHERE name=?').get(name))continue;
    sqlite.exec('BEGIN');
    try {sqlite.exec(readFileSync(`drizzle/${name}`,'utf8'));sqlite.prepare('INSERT INTO local_migrations VALUES (?)').run(name);sqlite.exec('COMMIT');}
    catch(error){sqlite.exec('ROLLBACK');throw error;}
  }
  return sqliteBinding(sqlite);
}
