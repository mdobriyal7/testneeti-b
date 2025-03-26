const express = require('express');
const router = express.Router();
const TestAttemptController = require('../controllers/TestAttemptController');
const verifyJWT = require('../middleware/verifyJWT');

// Custom middleware to provide mock user data when needed
// This will run after verifyJWT but before the controller
const prepareUserData = (req, res, next) => {
  // If using real authentication, the verifyJWT middleware sets req.user to username
  // But our controllers expect req.user to be an object with _id property
  
  // Create a mock user object with _id if not already present
  if (!req.user || typeof req.user === 'string') {
    // Store the original user info if any
    const originalUser = req.user;
    
    // Replace with an object that has _id
    // Using the username as ID or a default ID if no username
    req.user = {
      _id: originalUser || '000000000000000000000001', // MongoDB requires a 24-character hex string
      username: originalUser || 'test-user',
      // Keep roles if they exist
      roles: req.roles || ['User']
    };
  }
  
  next();
};

// Apply auth middleware and user data preparation to all routes
router.use(verifyJWT);
router.use(prepareUserData);

// Routes for test attempts
router.post('/test-series/:testSeriesId/papers/:paperId/attempts', TestAttemptController.startTest);
router.get('/test-series/:testSeriesId/papers/:paperId/attempts/current', TestAttemptController.getCurrentAttempt);
router.patch('/test-series/:testSeriesId/papers/:paperId/attempts/:attemptId', TestAttemptController.updateProgress);
router.post('/test-series/:testSeriesId/papers/:paperId/attempts/:attemptId/submit', TestAttemptController.submitTest);
router.get('/test-series/:testSeriesId/papers/:paperId/attempts/:attemptId/results', TestAttemptController.getResults);
router.get('/test-series/:testSeriesId/papers/:paperId/results', TestAttemptController.getResults); // Get latest results
router.get('/test-series/:testSeriesId/attempts', TestAttemptController.getUserAttempts);

module.exports = router; 