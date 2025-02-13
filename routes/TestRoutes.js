const express = require("express");
const TestController = require("../controllers/TestController");
const router = express.Router();

/**
 * Get tests by exam ID
 * GET /api/tests/exam/:examId
 */
router.get("/exam/:examId", TestController.getTestsByExamId);

/**
 * Create a new test
 * POST /api/tests
 */
router.post("/", async (req, res) => {
  try {
    const test = await TestController.createTest(req.body);
    res.status(201).json({
      success: true,
      test
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get all tests with filtering and pagination
 * GET /api/tests
 */
router.get("/", TestController.getTests);

/**
 * Get a specific test by ID
 * GET /api/tests/:id
 */
router.get("/:id", TestController.getTestById);

/**
 * Update a test
 * PUT /api/tests/:id
 */
router.put("/:id", TestController.updateTest);

/**
 * Delete a test
 * DELETE /api/tests/:id
 */
router.delete("/:id", TestController.deleteTest);

/**
 * Get test insights
 * GET /api/tests/:id/insights
 */
router.get("/:id/insights", async (req, res) => {
  try {
    const insights = await TestController.getTestInsights(req.params.id);
    res.json(insights);
  } catch (error) {
    res.status(500).json({
      message: "Error retrieving test insights",
      error: error.message,
    });
  }
});

/**
 * Recommend tests based on user profile
 * POST /api/tests/recommendations
 */
router.post("/recommendations", async (req, res) => {
  try {
    const { userProfile, learningGoals } = req.body;
    const recommendations = await TestController.recommendTests(
      userProfile,
      learningGoals
    );
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({
      message: "Error generating test recommendations",
      error: error.message,
    });
  }
});

/**
 * Analyze test performance
 * POST /api/tests/:id/performance
 */
router.post("/:id/performance", async (req, res) => {
  try {
    const performanceAnalysis = await TestController.analyzeTestPerformance(
      req.params.id,
      req.body.userResponses
    );
    res.json(performanceAnalysis);
  } catch (error) {
    res.status(500).json({
      message: "Error analyzing test performance",
      error: error.message,
    });
  }
});

/**
 * Clone a test
 * POST /api/tests/:id/clone
 */
router.post("/:id/clone", async (req, res) => {
  try {
    const clonedTest = await TestController.cloneTestIntelligently(
      req.params.id,
      req.body.cloneOptions || {}
    );
    res.status(201).json({
      message: "Test cloned successfully",
      test: clonedTest,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error cloning test",
      error: error.message,
    });
  }
});

module.exports = router;
