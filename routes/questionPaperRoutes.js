const express = require('express');
const router = express.Router();
const questionPaperController = require('../controllers/questionPaperController');

// Get all question papers for a test series section
router.route('/:testSeriesId/sections/:sectionId/question-papers')
    .get(questionPaperController.getQuestionPapers)
    .post(questionPaperController.createQuestionPaper);

// Get a specific question paper by ID
router.get('/:testSeriesId/sections/:sectionId/question-papers/:paperId', questionPaperController.getQuestionPaperById);

// Manage specific question paper within a section
router.route('/:testSeriesId/sections/:sectionId/question-papers/:paperId')
    .patch(questionPaperController.updateQuestionPaper)
    .delete(questionPaperController.deleteQuestionPaper);

module.exports = router; 