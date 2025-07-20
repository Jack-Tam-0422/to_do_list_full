import express from "express";
import { Pool } from "pg";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
const saltRounds = 10;

// declaring the app and setting the port
const app = express();
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// getting the current directory of the file
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// setting up middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// set the static files directory for EJS templates
app.use(express.static(path.join(dirname, "../client")));

// setting the engine for rendering EJS templates
// and specifying the views directory
app.set("view engine", "ejs");
app.set("views", path.join(dirname, "../client/views"));

// creating a new PostgreSQL connection pool
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "data",
  port: 5433,
});

//////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM todos ORDER BY created_at DESC"
    );
    res.render("index", { todos: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.post("/", async (req, res) => {
  const { task } = req.body;
  if (!task) {
    return res.status(400).json({ error: "Task is required" });
  }
  try {
    const result = await pool.query(
      "INSERT INTO todos (task, completed) VALUES ($1, $2) RETURNING *",
      [task, false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.patch("/todos/:id/toggle", async (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;

  try {
    const result = await pool.query(
      "UPDATE todos SET completed = $1 WHERE id = $2 RETURNING *",
      [completed, id]
    );

    if (result.rows.length > 0) {
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ error: "Todo not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/signup", async (req, res) => {
  try {
    res.render("signup");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.post("/signup", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  try {
    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert into the database (assuming a 'users' table)
    const result = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING user_id, username",
      [username, hashedPassword]
    );

    res.redirect("/login");
  } catch (err) {
    console.error(err);
    if (err.code === "23505") {
      // Unique violation (e.g., duplicate username)
      res.status(400).json({ error: "Username already exists" });
    } else {
      1;
      res.status(500).json({ error: "Server error" });
    }
  }
});

app.get("/login", async (req, res) => {
  try {
    res.render("login");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});
