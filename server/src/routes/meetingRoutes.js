const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const {
  scheduleMeeting,
  getMyMeetings,
  getMeeting,
  acceptMeeting,
  rejectMeeting,
  cancelMeeting,
} = require("../controllers/meetingController");

router.post("/", authenticate, scheduleMeeting);
router.get("/", authenticate, getMyMeetings);
router.get("/:id", authenticate, getMeeting);
router.put("/:id/accept", authenticate, acceptMeeting);
router.put("/:id/reject", authenticate, rejectMeeting);
router.put("/:id/cancel", authenticate, cancelMeeting);

module.exports = router;
