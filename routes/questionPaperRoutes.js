const express = require('express');
const router = express.Router();
const questionPaperController = require('../controllers/questionPaperController');

// Get all question papers for a test series section
router.route('/:testSeriesId/sections/:sectionId/question-papers')
    .get(questionPaperController.getQuestionPapers)
    .post(questionPaperController.createQuestionPaper);

// Import questions from CSV
router.post('/:testSeriesId/sections/:sectionId/question-papers/import-csv', questionPaperController.importQuestionsFromCSV);

// Import questions from JSON
router.post('/:testSeriesId/sections/:sectionId/question-papers/import-json', questionPaperController.importQuestionsFromJSON);

// Get a specific question paper by ID
router.get('/:testSeriesId/sections/:sectionId/question-papers/:paperId', questionPaperController.getQuestionPaperById);

// Manage specific question paper within a section
router.route('/:testSeriesId/sections/:sectionId/question-papers/:paperId')
    .patch(questionPaperController.updateQuestionPaper)
    .delete(questionPaperController.deleteQuestionPaper);

// New route for question operations
router.route('/:testSeriesId/sections/:sectionId/question-papers/:paperId/questions/:questionIndex')
    .put(questionPaperController.updateQuestion)
    .delete(questionPaperController.deleteQuestion);

// Question operations
router.route('/:paperId/questions/:questionIndex')
    .put(questionPaperController.updateQuestion)
    .delete(questionPaperController.deleteQuestion);

module.exports = router; 