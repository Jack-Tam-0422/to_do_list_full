import express from "express";
import { Pool } from "pg";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import session from "express-session";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config({
  path: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env"),
});

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
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret-key", // Use .env SESSION_SECRET
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true, // Prevent client-side access
      sameSite: "lax", // Mitigate CSRF
    },
  })
);

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
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  try {
    const result = await pool.query(
      "SELECT * FROM todos WHERE user_id = $1 ORDER BY created_at DESC",
      [req.session.userId]
    );
    res.render("index", { todos: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

app.post("/", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { task } = req.body;
  if (!task) {
    return res.status(400).json({ error: "Task is required" });
  }
  try {
    const result = await pool.query(
      "INSERT INTO todos (task, completed, user_id) VALUES ($1, $2, $3) RETURNING *",
      [task, false, req.session.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.patch("/todos/:id/toggle", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { id } = req.params;
  const { completed } = req.body;

  try {
    const result = await pool.query(
      "UPDATE todos SET completed = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
      [completed, id, req.session.userId]
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
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
      [username, hashedPassword]
    );

    res.redirect("/login");
  } catch (err) {
    console.error(err);
    if (err.code === "23505") {
      // Unique violation (e.g., duplicate username)
      res.status(400).json({ error: "Username already exists" });
    } else {
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

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  try {
    // Fetch the user from the database
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    // Compare the provided password with the stored hash
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Store user ID in session
    req.session.userId = user.id;

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////
