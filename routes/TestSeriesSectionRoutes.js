const express = require("express");
const router = express.Router();
const TestSeriesSectionController = require("../controllers/TestSeriesSectionController");

// Base path is /api/v1/test-series
// Test Series Section Routes
router.route("/:testSeriesId/sections")
    .get(TestSeriesSectionController.getSections)
    .post(TestSeriesSectionController.createSection);

// Specific section operations
router.route("/:testSeriesId/sections/:sectionId")
    .get(TestSeriesSectionController.getSection)
    .put(TestSeriesSectionController.updateSection)
    .delete(TestSeriesSectionController.deleteSection);

// Question paper operations - Commented out as we're using questionPaperController instead
// router.route("/:testSeriesId/sections/:sectionId/question-papers")
//     .post(TestSeriesSectionController.addQuestionPaper);

module.exports = router;
