const pool = require("../config/db");
const path = require("path");
const fs = require("fs");

async function uploadDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const owner_id = req.user.id;
  const { originalname, filename, mimetype, size } = req.file;
  const file_url = `/uploads/${filename}`;
  const file_size = `${(size / 1024).toFixed(2)} KB`;

  const [result] = await pool.query(
    `INSERT INTO documents 
     (owner_id, name, original_name, file_url, file_type, file_size) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [owner_id, originalname, filename, file_url, mimetype, file_size],
  );

  res.status(201).json({
    message: "Document uploaded",
    document: {
      id: result.insertId,
      name: originalname,
      file_url,
      file_type: mimetype,
      file_size,
    },
  });
}

async function getMyDocuments(req, res) {
  const [rows] = await pool.query(
    `SELECT d.*, u.full_name AS owner_name 
     FROM documents d
     JOIN users u ON d.owner_id = u.id
     WHERE d.owner_id = ?
     ORDER BY d.created_at DESC`,
    [req.user.id],
  );
  res.json(rows);
}

async function getSharedDocuments(req, res) {
  const [rows] = await pool.query(
    `SELECT d.*, u.full_name AS owner_name 
     FROM documents d
     JOIN users u ON d.owner_id = u.id
     WHERE d.is_shared = true 
     AND JSON_CONTAINS(d.shared_with, ?)`,
    [JSON.stringify(String(req.user.id))],
  );
  res.json(rows);
}

async function getDocument(req, res) {
  const [rows] = await pool.query(
    `SELECT d.*, u.full_name AS owner_name 
     FROM documents d
     JOIN users u ON d.owner_id = u.id
     WHERE d.id = ? AND (d.owner_id = ? OR JSON_CONTAINS(d.shared_with, ?))`,
    [req.params.id, req.user.id, JSON.stringify(String(req.user.id))],
  );

  if (!rows.length)
    return res.status(404).json({ error: "Document not found" });
  res.json(rows[0]);
}

async function deleteDocument(req, res) {
  const [rows] = await pool.query(
    "SELECT * FROM documents WHERE id = ? AND owner_id = ?",
    [req.params.id, req.user.id],
  );

  if (!rows.length) {
    return res.status(404).json({ error: "Document not found or not yours" });
  }

  // Delete file from disk
  const filePath = path.join(__dirname, "../../uploads", rows[0].original_name);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await pool.query("DELETE FROM documents WHERE id = ?", [req.params.id]);
  res.json({ message: "Document deleted" });
}

async function shareDocument(req, res) {
  const { user_ids } = req.body;

  if (!user_ids || !Array.isArray(user_ids)) {
    return res.status(400).json({ error: "user_ids must be an array" });
  }

  const [rows] = await pool.query(
    "SELECT * FROM documents WHERE id = ? AND owner_id = ?",
    [req.params.id, req.user.id],
  );

  if (!rows.length) {
    return res.status(404).json({ error: "Document not found or not yours" });
  }

  await pool.query(
    "UPDATE documents SET is_shared = true, shared_with = ? WHERE id = ?",
    [JSON.stringify(user_ids.map(String)), req.params.id],
  );

  res.json({ message: "Document shared" });
}

async function updateStatus(req, res) {
  const { status } = req.body;
  const allowed = ["draft", "pending", "signed", "rejected"];

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  await pool.query(
    "UPDATE documents SET status = ? WHERE id = ? AND owner_id = ?",
    [status, req.params.id, req.user.id],
  );

  res.json({ message: "Status updated" });
}

async function addSignature(req, res) {
  const { signature_url } = req.body;

  if (!signature_url) {
    return res.status(400).json({ error: "Signature image is required" });
  }

  const [rows] = await pool.query("SELECT * FROM documents WHERE id = ?", [
    req.params.id,
  ]);

  if (!rows.length)
    return res.status(404).json({ error: "Document not found" });

  // Check if user already signed this document
  const [existing] = await pool.query(
    "SELECT id FROM signatures WHERE document_id = ? AND user_id = ?",
    [req.params.id, req.user.id],
  );

  if (existing.length) {
    return res.status(409).json({ error: "You already signed this document" });
  }

  await pool.query(
    "INSERT INTO signatures (document_id, user_id, signature_url) VALUES (?, ?, ?)",
    [req.params.id, req.user.id, signature_url],
  );

  // Update document status to signed
  await pool.query("UPDATE documents SET status = ? WHERE id = ?", [
    "signed",
    req.params.id,
  ]);

  res.status(201).json({ message: "Signature added" });
}

async function getSignatures(req, res) {
  const [rows] = await pool.query(
    `SELECT s.*, u.full_name AS signer_name 
     FROM signatures s
     JOIN users u ON s.user_id = u.id
     WHERE s.document_id = ?`,
    [req.params.id],
  );
  res.json(rows);
}

module.exports = {
  uploadDocument,
  getMyDocuments,
  getSharedDocuments,
  getDocument,
  deleteDocument,
  shareDocument,
  updateStatus,
  addSignature,
  getSignatures,
};
