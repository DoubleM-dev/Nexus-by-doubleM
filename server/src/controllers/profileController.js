const pool = require("../config/db");

async function getProfile(req, res) {
  const [rows] = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.role, p.* 
     FROM users u JOIN profiles p ON u.id = p.user_id WHERE u.id = ?`,
    [req.user.id],
  );
  if (!rows.length) return res.status(404).json({ error: "Profile not found" });
  res.json(rows[0]);
}

async function updateProfile(req, res) {
  const allowedFields =
    req.user.role === "investor"
      ? [
          "bio",
          "avatar_url",
          "location",
          "investment_range_min",
          "investment_range_max",
          "preferred_industries",
          "past_investments",
        ]
      : [
          "bio",
          "avatar_url",
          "location",
          "startup_name",
          "startup_stage",
          "industry",
          "funding_needed",
        ];

  const updates = Object.keys(req.body).filter((k) =>
    allowedFields.includes(k),
  );
  if (!updates.length)
    return res.status(400).json({ error: "No valid fields to update" });

  const setClause = updates.map((f) => `${f} = ?`).join(", ");
  const values = updates.map((f) => {
    const v = req.body[f];
    return typeof v === "object" ? JSON.stringify(v) : v;
  });

  await pool.query(`UPDATE profiles SET ${setClause} WHERE user_id = ?`, [
    ...values,
    req.user.id,
  ]);
  res.json({ message: "Profile updated" });
}

module.exports = { getProfile, updateProfile };
