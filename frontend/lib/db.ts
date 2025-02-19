import sqlite3 from "sqlite3"
import { open } from "sqlite"

export const DB_FILE = '/Users/brett/projects/audio-drama-app/backend/database/database.db'
export const TABLE_NAME = "shows"

async function getDb() {
  return open({
    filename: DB_FILE,
    driver: sqlite3.Database,
  })
}

export async function getAllShows() {
  const db = await getDb()
  const shows = await db.all(`SELECT id, name FROM ${TABLE_NAME}`)
  await db.close()
  return shows
}

export async function getShowById(id: number) {
  const db = await getDb()
  const show = await db.get(`SELECT * FROM ${TABLE_NAME} WHERE id = ?`, id)
  await db.close()
  return show
}

