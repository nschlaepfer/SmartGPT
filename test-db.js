// Simple test script for SQLite database access
import Database from "better-sqlite3";

try {
  console.log("Attempting to open memory.sqlite...");
  const db = new Database("memory.sqlite");
  console.log("Successfully opened database");

  // Try to create a test table
  db.exec(
    "CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, value TEXT)"
  );
  console.log("Created test table");

  // Try to insert a value
  const stmt = db.prepare("INSERT INTO test_table (value) VALUES (?)");
  const result = stmt.run("test value");
  console.log("Inserted test value with id:", result.lastInsertRowid);

  // Try to query the table
  const rows = db.prepare("SELECT * FROM test_table").all();
  console.log("Query result:", rows);

  // Close the database
  db.close();
  console.log("Database test completed successfully");
} catch (error) {
  console.error("Error accessing SQLite database:", error.message);
}
