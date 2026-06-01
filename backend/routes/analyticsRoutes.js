const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middlewares/authMiddleware");
const {
  getDashboardSummary,
  getVisitTrends,
  getByDepartment,
  getByHour,
  getByVisitorType,
  getByPurpose,
  getRecentActivity,
  getRepeatVisitors,
} = require("../controllers/analyticsController");

router.use(requireAuth);

router.get("/summary", getDashboardSummary);
router.get("/trends", getVisitTrends);
router.get("/by-department", getByDepartment);
router.get("/by-hour", getByHour);
router.get("/by-type", getByVisitorType);
router.get("/by-purpose", getByPurpose);
router.get("/recent-activity", getRecentActivity);
router.get("/repeat-visitors", getRepeatVisitors);

module.exports = router;
