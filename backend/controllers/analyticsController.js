const Visitor = require("../models/Visitor");

const getDashboardSummary = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, today, thisWeek, thisMonth, active, flagged, scheduled] = await Promise.all([
      Visitor.countDocuments(),
      Visitor.countDocuments({ in_time: { $gte: todayStart } }),
      Visitor.countDocuments({ in_time: { $gte: weekStart } }),
      Visitor.countDocuments({ in_time: { $gte: monthStart } }),
      Visitor.countDocuments({ out_time: { $exists: false }, scheduled: false }),
      Visitor.countDocuments({ is_flagged: true }),
      Visitor.countDocuments({ scheduled: true }),
    ]);

    const avgDuration = await Visitor.aggregate([
      { $match: { out_time: { $exists: true }, in_time: { $exists: true } } },
      {
        $project: {
          duration: { $subtract: ["$out_time", "$in_time"] },
        },
      },
      { $group: { _id: null, avg: { $avg: "$duration" } } },
    ]);

    const avgMinutes = avgDuration.length ? Math.round(avgDuration[0].avg / 60000) : 0;

    res.json({ total, today, thisWeek, thisMonth, active, flagged, scheduled, avgDurationMinutes: avgMinutes });
  } catch (err) {
    console.error("Analytics summary error:", err);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
};

const getVisitTrends = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const data = await Visitor.aggregate([
      { $match: { in_time: { $gte: since } } },
      {
        $group: {
          _id: {
            year: { $year: "$in_time" },
            month: { $month: "$in_time" },
            day: { $dayOfMonth: "$in_time" },
          },
          count: { $sum: 1 },
          scheduled: { $sum: { $cond: ["$scheduled", 1, 0] } },
          walkins: { $sum: { $cond: ["$scheduled", 0, 1] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    const result = data.map((d) => ({
      date: `${d._id.year}-${String(d._id.month).padStart(2, "0")}-${String(d._id.day).padStart(2, "0")}`,
      count: d.count,
      scheduled: d.scheduled,
      walkins: d.walkins,
    }));

    res.json(result);
  } catch (err) {
    console.error("Trends error:", err);
    res.status(500).json({ error: "Failed to fetch trends" });
  }
};

const getByDepartment = async (req, res) => {
  try {
    const data = await Visitor.aggregate([
      { $group: { _id: "$department_visiting", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    res.json(data.map((d) => ({ department: d._id || "Unknown", count: d.count })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch department data" });
  }
};

const getByHour = async (req, res) => {
  try {
    const data = await Visitor.aggregate([
      { $group: { _id: { $hour: "$in_time" }, count: { $sum: 1 } } },
      { $sort: { "_id": 1 } },
    ]);

    const hourly = Array.from({ length: 24 }, (_, i) => {
      const found = data.find((d) => d._id === i);
      return { hour: i, count: found ? found.count : 0 };
    });

    res.json(hourly);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch hourly data" });
  }
};

const getByVisitorType = async (req, res) => {
  try {
    const data = await Visitor.aggregate([
      { $group: { _id: "$visitor_type", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json(data.map((d) => ({ type: d._id || "Guest", count: d.count })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch visitor type data" });
  }
};

const getByPurpose = async (req, res) => {
  try {
    const data = await Visitor.aggregate([
      { $group: { _id: "$purpose_of_visit", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json(data.map((d) => ({ purpose: d._id || "General", count: d.count })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch purpose data" });
  }
};

const getRecentActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const visitors = await Visitor.find()
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    const activities = [];
    for (const v of visitors) {
      if (v.security_confirmed && v.security_out_time) {
        activities.push({ type: "exit", time: v.security_out_time, visitor: v.full_name, badge: v.badge_number, detail: `Exited via security`, dept: v.department_visiting });
      } else if (v.out_time) {
        activities.push({ type: "checkout", time: v.out_time, visitor: v.full_name, badge: v.badge_number, detail: `Checked out`, dept: v.department_visiting });
      } else if (v.approved) {
        activities.push({ type: "approved", time: v.updatedAt, visitor: v.full_name, badge: v.badge_number, detail: `Approved by host`, dept: v.department_visiting });
      } else {
        activities.push({ type: "checkin", time: v.in_time, visitor: v.full_name, badge: v.badge_number, detail: `Checked in to see ${v.person_to_visit}`, dept: v.department_visiting });
      }
    }

    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    res.json(activities.slice(0, limit));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch recent activity" });
  }
};

const getRepeatVisitors = async (req, res) => {
  try {
    const data = await Visitor.aggregate([
      { $group: { _id: "$contact_number", name: { $first: "$full_name" }, visits: { $sum: 1 }, lastVisit: { $max: "$in_time" } } },
      { $match: { visits: { $gt: 1 } } },
      { $sort: { visits: -1 } },
      { $limit: 10 },
    ]);
    res.json(data.map((d) => ({ phone: d._id, name: d.name, visits: d.visits, lastVisit: d.lastVisit })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch repeat visitors" });
  }
};

module.exports = {
  getDashboardSummary,
  getVisitTrends,
  getByDepartment,
  getByHour,
  getByVisitorType,
  getByPurpose,
  getRecentActivity,
  getRepeatVisitors,
};
