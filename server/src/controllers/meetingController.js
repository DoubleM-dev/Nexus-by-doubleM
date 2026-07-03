const pool = require("../config/db");

// Schedule a new meeting
async function scheduleMeeting(req, res) {
  const { title, participant_id, scheduled_at, duration_mins, notes } =
    req.body;
  const organizer_id = req.user.id;

  if (!title || !participant_id || !scheduled_at || !duration_mins) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Conflict detection — check if organizer already has a meeting at this time
  const newStart = new Date(scheduled_at);
  const newEnd = new Date(newStart.getTime() + duration_mins * 60000);

  const [existing] = await pool.query(
    `SELECT id, scheduled_at, duration_mins FROM meetings
     WHERE (organizer_id = ? OR participant_id = ?)
     AND status NOT IN ('rejected', 'cancelled')
     AND (
       (scheduled_at < ? AND DATE_ADD(scheduled_at, INTERVAL duration_mins MINUTE) > ?)
     )`,
    [organizer_id, organizer_id, newEnd, newStart],
  );

  if (existing.length > 0) {
    return res
      .status(409)
      .json({ error: "You already have a meeting during this time" });
  }

  // Also check participant's schedule
  const [participantConflict] = await pool.query(
    `SELECT id FROM meetings
     WHERE (organizer_id = ? OR participant_id = ?)
     AND status NOT IN ('rejected', 'cancelled')
     AND (
       (scheduled_at < ? AND DATE_ADD(scheduled_at, INTERVAL duration_mins MINUTE) > ?)
     )`,
    [participant_id, participant_id, newEnd, newStart],
  );

  if (participantConflict.length > 0) {
    return res
      .status(409)
      .json({
        error: "The other person already has a meeting during this time",
      });
  }

  const [result] = await pool.query(
    `INSERT INTO meetings (title, organizer_id, participant_id, scheduled_at, duration_mins, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      title,
      organizer_id,
      participant_id,
      scheduled_at,
      duration_mins,
      notes || null,
    ],
  );

  res
    .status(201)
    .json({ message: "Meeting scheduled", meeting_id: result.insertId });
}

// Get all meetings for current user
async function getMyMeetings(req, res) {
  const [rows] = await pool.query(
    `SELECT m.*,
       u1.full_name AS organizer_name,
       u2.full_name AS participant_name
     FROM meetings m
     JOIN users u1 ON m.organizer_id = u1.id
     JOIN users u2 ON m.participant_id = u2.id
     WHERE m.organizer_id = ? OR m.participant_id = ?
     ORDER BY m.scheduled_at ASC`,
    [req.user.id, req.user.id],
  );
  res.json(rows);
}

// Get a single meeting by id
async function getMeeting(req, res) {
  const [rows] = await pool.query(
    `SELECT m.*,
       u1.full_name AS organizer_name,
       u2.full_name AS participant_name
     FROM meetings m
     JOIN users u1 ON m.organizer_id = u1.id
     JOIN users u2 ON m.participant_id = u2.id
     WHERE m.id = ? AND (m.organizer_id = ? OR m.participant_id = ?)`,
    [req.params.id, req.user.id, req.user.id],
  );

  if (!rows.length) return res.status(404).json({ error: "Meeting not found" });
  res.json(rows[0]);
}

// Accept a meeting — only the participant can accept
async function acceptMeeting(req, res) {
  const [rows] = await pool.query("SELECT * FROM meetings WHERE id = ?", [
    req.params.id,
  ]);

  if (!rows.length) return res.status(404).json({ error: "Meeting not found" });

  const meeting = rows[0];

  if (meeting.participant_id !== req.user.id) {
    return res
      .status(403)
      .json({ error: "Only the invited person can accept this meeting" });
  }

  if (meeting.status !== "pending") {
    return res
      .status(400)
      .json({ error: `Meeting is already ${meeting.status}` });
  }

  await pool.query("UPDATE meetings SET status = ? WHERE id = ?", [
    "accepted",
    req.params.id,
  ]);

  res.json({ message: "Meeting accepted" });
}

// Reject a meeting — only the participant can reject
async function rejectMeeting(req, res) {
  const [rows] = await pool.query("SELECT * FROM meetings WHERE id = ?", [
    req.params.id,
  ]);

  if (!rows.length) return res.status(404).json({ error: "Meeting not found" });

  const meeting = rows[0];

  if (meeting.participant_id !== req.user.id) {
    return res
      .status(403)
      .json({ error: "Only the invited person can reject this meeting" });
  }

  if (meeting.status !== "pending") {
    return res
      .status(400)
      .json({ error: `Meeting is already ${meeting.status}` });
  }

  await pool.query("UPDATE meetings SET status = ? WHERE id = ?", [
    "rejected",
    req.params.id,
  ]);

  res.json({ message: "Meeting rejected" });
}

// Cancel a meeting — only the organizer can cancel
async function cancelMeeting(req, res) {
  const [rows] = await pool.query("SELECT * FROM meetings WHERE id = ?", [
    req.params.id,
  ]);

  if (!rows.length) return res.status(404).json({ error: "Meeting not found" });

  const meeting = rows[0];

  if (meeting.organizer_id !== req.user.id) {
    return res
      .status(403)
      .json({ error: "Only the organizer can cancel this meeting" });
  }

  await pool.query("UPDATE meetings SET status = ? WHERE id = ?", [
    "cancelled",
    req.params.id,
  ]);

  res.json({ message: "Meeting cancelled" });
}

module.exports = {
  scheduleMeeting,
  getMyMeetings,
  getMeeting,
  acceptMeeting,
  rejectMeeting,
  cancelMeeting,
};
