const express = require("express");
const TestController = require("../controllers/TestController");
const router = express.Router();

/**
 * Create a new test
 * POST /api/tests
 */
router.post("/", async (req, res) => {
  try {
    const newTest = await TestController.createTest(req.body);
    res.status(201).json({
      message: "Test created successfully",
      test: newTest,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error creating test",
      error: error.message,
    });
  }
});

/**
 * Get all tests with filtering and pagination
 * GET /api/tests
 */
router.get("/", async (req, res) => {
  try {
    const filters = {
      course: req.query.course,
      isLive: req.query.isLive ? JSON.parse(req.query.isLive) : undefined,
      isFree: req.query.isFree ? JSON.parse(req.query.isFree) : undefined,
    };

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      sortBy: req.query.sortBy || "createdOn",
      sortOrder: req.query.sortOrder || "desc",
    };

    const result = await TestController.getTests(filters, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching tests",
      error: error.message,
    });
  }
});

/**
 * Get a specific test by ID
 * GET /api/tests/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const options = {
      includeQuestions: req.query.includeQuestions === "true",
      selectFields: req.query.fields,
    };

    const test = await TestController.getTestById(req.params.id, options);
    res.json(test);
  } catch (error) {
    res.status(404).json({
      message: "Test not found",
      error: error.message,
    });
  }
});

/**
 * Update a test
 * PUT /api/tests/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const updatedTest = await TestController.updateTest(
      req.params.id,
      req.body
    );
    res.json({
      message: "Test updated successfully",
      test: updatedTest,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error updating test",
      error: error.message,
    });
  }
});

/**
 * Delete a test
 * DELETE /api/tests/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const softDelete = req.query.softDelete === "true";
    const result = await TestController.deleteTest(req.params.id, softDelete);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      message: "Error deleting test",
      error: error.message,
    });
  }
});

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
