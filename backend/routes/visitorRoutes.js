const express = require("express");
const router = express.Router();
const multer = require("multer");
const visitorController = require("../controllers/visitorController");
const { requireAuth } = require("../middlewares/authMiddleware");

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed!"), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get("/updates", visitorController.subscribeUpdates);
router.get("/check-repeat", visitorController.checkRepeatVisitor);
router.post("/", upload.single("photo"), visitorController.registerVisitor);
router.get("/stats", requireAuth, visitorController.getStats);
router.get("/export", visitorController.exportVisitors);
router.get("/test-email", visitorController.testEmail);
router.get("/", requireAuth, visitorController.getAllVisitors);
router.get("/:id", visitorController.getVisitor);
router.get("/:id/approve", visitorController.approveVisitor);
router.post("/:id/checkout", requireAuth, visitorController.checkoutVisitor);
router.post("/:id/release", requireAuth, visitorController.releaseVisitor);
router.post("/:id/security-checkout", requireAuth, visitorController.securityCheckout);
router.post("/:id/allow-entry", requireAuth, visitorController.allowEntry);
router.post("/:id/flag", requireAuth, visitorController.flagVisitor);
router.post("/:id/unflag", requireAuth, visitorController.unflagVisitor);
router.delete("/bulk", requireAuth, visitorController.bulkDelete);
router.delete("/:id", requireAuth, visitorController.deleteVisitor);

module.exports = router;
