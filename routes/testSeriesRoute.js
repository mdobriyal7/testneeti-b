const express = require("express");
const router = express.Router();
const TestSeriesController = require("../controllers/TestSeriesController");

// Public routes
router.get("/test-series/all", TestSeriesController.getAllTestSeries); // Get all test series with filters
router.get("/test-series/analytics", TestSeriesController.getAnalytics);
router.get(
  "/test-series/:id",
  TestSeriesController.cacheMiddleware,
  TestSeriesController.get
);
router.get("/test-series", TestSeriesController.getByCourseAndExam);

// Test Series CRUD
router.post(
  "/test-series",
  TestSeriesController.validateTestSeries,
  TestSeriesController.create
);
router.put(
  "/test-series/:id",
  TestSeriesController.validateTestSeries,
  TestSeriesController.update
);
router.delete("/test-series/:id", TestSeriesController.deleteTestSeries);

// Test Series Sections
router.get(
  "/test-series/:testSeriesId/sections",
  TestSeriesController.getSections
);
router.get(
  "/test-series/:testSeriesId/sections/:sectionId",
  TestSeriesController.getSection
);
router.post(
  "/test-series/:testSeriesId/sections",
  TestSeriesController.validateSection,
  TestSeriesController.createSection
);
router.put(
  "/test-series/:testSeriesId/sections/:sectionId",
  TestSeriesController.validateSection,
  TestSeriesController.updateSection
);
router.delete(
  "/test-series/:testSeriesId/sections/:sectionId",
  TestSeriesController.deleteSection
);

// Student Attempts & Results
router.get(
  "/test-series/:testSeriesId/attempts",
  TestSeriesController.getAttempts
);
router.get(
  "/test-series/:testSeriesId/attempts/:attemptId",
  TestSeriesController.getAttempt
);
router.post(
  "/test-series/:testSeriesId/attempts",
  TestSeriesController.createAttempt
);
router.patch(
  "/test-series/:testSeriesId/attempts/:attemptId",
  TestSeriesController.updateAttempt
);
router.get(
  "/test-series/:testSeriesId/results",
  TestSeriesController.getResults
);
router.get(
  "/test-series/:testSeriesId/leaderboard",
  TestSeriesController.getLeaderboard
);

// Student Enrollment
router.post(
  "/test-series/:testSeriesId/enroll",
  TestSeriesController.enrollStudent
);
router.get(
  "/test-series/:testSeriesId/enrolled",
  TestSeriesController.getEnrolledStudents
);
router.delete(
  "/test-series/:testSeriesId/unenroll",
  TestSeriesController.unenrollStudent
);

// Student Stats
router.patch(
  "/test-series/:testSeriesId/student/:studentId",
  TestSeriesController.updateStudentStats
);
router.get(
  "/test-series/:testSeriesId/student/:studentId/progress",
  TestSeriesController.getStudentProgress
);
router.get(
  "/test-series/:testSeriesId/student/:studentId/performance",
  TestSeriesController.getStudentPerformance
);

// Bulk Operations
router.post(
  "/test-series/bulk-update",
  TestSeriesController.validateTestSeries,
  TestSeriesController.bulkUpdate
);

module.exports = router;
