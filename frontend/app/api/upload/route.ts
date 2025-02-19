import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import mammoth from 'mammoth'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

import { DB_FILE, TABLE_NAME } from '@/lib/db'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }

  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Convert .docx to text
    const resultDoc = await mammoth.extractRawText({ buffer })
    const text = resultDoc.value.replace(/\n{3,}/g, '\n\n');

    // Save to SQLite database
    const db = await open({
      filename: DB_FILE,
      driver: sqlite3.Database
    })

    await db.exec(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        original_script TEXT,
        parsed_script JSON,
        event_timing JSON,
        dialogue_audio BLOB,
        music_audio BLOB,
        sfx_audio BLOB
      )
    `)

    const result = await db.run(
      `INSERT INTO ${TABLE_NAME} (name, original_script, parsed_script) VALUES (?, ?, ?)`,
      [file.name, text, JSON.stringify({})]
    )

    const id = result.lastID
    await db.close()

    return NextResponse.json({ 
      message: 'File uploaded and processed successfully',
      id: id 
    })
  } catch (error) {
    console.error('Error processing file:', error)
    return NextResponse.json({ error: 'Error processing file' }, { status: 500 })
  }
}