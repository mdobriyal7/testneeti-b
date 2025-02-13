const express = require("express");
const router = express.Router();
const TestSeriesController = require("../controllers/TestSeriesController");

// Test Series Routes - Special routes first
router.get("/analytics", TestSeriesController.getAnalytics);
router.get("/all", TestSeriesController.getAllTestSeries);

// CRUD operations
router.post("/", TestSeriesController.validateTestSeries, TestSeriesController.create);
router.get("/", TestSeriesController.getByCourseAndExam);
router.get("/:id", TestSeriesController.cacheMiddleware, TestSeriesController.get);
router.put("/:id", TestSeriesController.validateTestSeries, TestSeriesController.update);
router.delete("/:id", TestSeriesController.deleteTestSeries);

// Student stats
router.patch("/:testSeriesId/student/:studentId", TestSeriesController.updateStudentStats);

module.exports = router;
