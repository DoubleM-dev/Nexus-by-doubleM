const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const {
  getProfile,
  updateProfile,
} = require("../controllers/profileController");

router.get("/me", authenticate, getProfile);
router.put("/me", authenticate, updateProfile);

module.exports = router;
