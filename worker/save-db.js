export async function loadSaveRow(db,userId) {
  return db.prepare('SELECT revision, payload, previous_payload, updated_at FROM game_saves WHERE user_id = ?').bind(userId).first();
}
export async function writeSaveRow(db,userId,revision,payload,updatedAt) {
  if(revision===0)return db.prepare('INSERT OR IGNORE INTO game_saves (user_id,revision,payload,updated_at) VALUES (?,1,?,?) RETURNING revision,updated_at').bind(userId,payload,updatedAt).first();
  return db.prepare('UPDATE game_saves SET previous_payload=payload, payload=?, revision=revision+1, updated_at=? WHERE user_id=? AND revision=? RETURNING revision,updated_at').bind(payload,updatedAt,userId,revision).first();
}
