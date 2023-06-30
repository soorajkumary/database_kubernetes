const express = require('express');
const { Pool } = require('pg');

// Create a pool for reading from the secondary nodes
const readPool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST_READ,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

// Create a pool for writing to the primary node
const writePool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST_WRITE,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

const app = express();

// Ensure that the table exists
async function ensureTableExists() {
  try {
    const writeClient = await writePool.connect();
    await writeClient.query(`
      CREATE TABLE IF NOT EXISTS your_table (
        column1 TEXT,
        column2 TEXT
      )
    `);
    writeClient.release();
  } catch (error) {
    console.error('Error creating table:', error);
  }
}

// Route for reading from the secondary nodes
app.get('/read', async (req, res) => {
  try {
    console.log('Connecting to read pool at:', process.env.PGHOST_READ);
    const readClient = await readPool.connect();
    const result = await readClient.query('SELECT * FROM your_table');
    res.json(result.rows);
    readClient.release();
  } catch (error) {
    console.error('Error while reading from secondary nodes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route for writing to the primary node
app.post('/write', async (req, res) => {
  try {
    console.log('Connecting to write pool at:', process.env.PGHOST_WRITE);
    const writeClient = await writePool.connect();
    await writeClient.query('INSERT INTO your_table (column1, column2) VALUES ($1, $2)', ['value1', 'value2']);
    res.status(201).json({ message: 'Data written successfully' });
    writeClient.release();
  } catch (error) {
    console.error('Error while writing to primary node:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route for the root URL ("/")
app.get('/', (req, res) => {
  res.send('Welcome to the application!');
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
