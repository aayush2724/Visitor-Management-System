const express = require("express");
const router = express.Router();
const multer = require("multer");
const visitorController = require("../controllers/visitorController");
const { requireAuth } = require("../middlewares/authMiddleware");

// --- Multer Setup ---
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed!"), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// --- Routes ---

router.get("/updates", visitorController.subscribeUpdates);
router.post("/", upload.single("photo"), visitorController.registerVisitor);
router.get("/stats", requireAuth, visitorController.getStats);
router.get("/", requireAuth, visitorController.getAllVisitors);
router.get("/export", visitorController.exportVisitors); // Auth inside controller
router.get("/:id/approve", visitorController.approveVisitor);

router.post("/:id/checkout", requireAuth, visitorController.checkoutVisitor);
router.post("/:id/release", requireAuth, visitorController.releaseVisitor);
router.post(
  "/:id/security-checkout",
  requireAuth,
  visitorController.securityCheckout
);
router.delete("/:id", requireAuth, visitorController.deleteVisitor);
router.post("/:id/allow-entry", requireAuth, visitorController.allowEntry);
router.get("/test-email", visitorController.testEmail);

module.exports = router;
