import sqlite3

DB_FILE = "database.db"  # SQLite database file
TABLE_NAME = "shows"

# Connect to SQLite (creates the file if it doesn't exist)
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

# Create table
cursor.execute(f"""
    CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_script TEXT,
        parsed_script TEXT
    )
""")

conn.commit()
conn.close()

print(f"Database saved to {DB_FILE} with table '{TABLE_NAME}'")