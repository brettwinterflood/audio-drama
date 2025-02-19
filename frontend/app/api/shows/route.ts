import { NextResponse } from 'next/server'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

// # NOT USED

const DB_PATH = '/Users/brett/projects/audio-drama-app/backend/database/database.db'
const TABLE_NAME = 'shows' // Replace with your actual table name

export async function GET() {
  try {
    const db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    })

    const shows = await db.all(`SELECT * FROM ${TABLE_NAME}`)
    await db.close()

    return NextResponse.json(shows)
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ error: 'Failed to fetch shows' }, { status: 500 })
  }
}
