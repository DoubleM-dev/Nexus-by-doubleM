const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const upload = require("../config/multer");
const {
  uploadDocument,
  getMyDocuments,
  getSharedDocuments,
  getDocument,
  deleteDocument,
  shareDocument,
  updateStatus,
  addSignature,
  getSignatures,
} = require("../controllers/documentController");

router.post("/upload", authenticate, upload.single("file"), uploadDocument);
router.get("/", authenticate, getMyDocuments);
router.get("/shared", authenticate, getSharedDocuments);
router.get("/:id", authenticate, getDocument);
router.delete("/:id", authenticate, deleteDocument);
router.put("/:id/share", authenticate, shareDocument);
router.put("/:id/status", authenticate, updateStatus);
router.post("/:id/sign", authenticate, addSignature);
router.get("/:id/signatures", authenticate, getSignatures);

module.exports = router;
