const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
}

async function register(req, res) {
  const { email, password, role, full_name } = req.body;
  if (!email || !password || !role || !full_name) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!["investor", "entrepreneur"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [
    email,
  ]);
  if (existing.length)
    return res.status(409).json({ error: "Email already registered" });

  const hash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    "INSERT INTO users (email, password_hash, role, full_name) VALUES (?, ?, ?, ?)",
    [email, hash, role, full_name],
  );
  await pool.query("INSERT INTO profiles (user_id) VALUES (?)", [
    result.insertId,
  ]);

  const token = signToken({ id: result.insertId, role, email });
  res
    .status(201)
    .json({ token, user: { id: result.insertId, email, role, full_name } });
}

async function login(req, res) {
  const { email, password } = req.body;
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
    email,
  ]);
  if (!rows.length)
    return res.status(401).json({ error: "Invalid credentials" });

  const user = rows[0];
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({ id: user.id, role: user.role, email: user.email });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    },
  });
}

module.exports = { register, login };
