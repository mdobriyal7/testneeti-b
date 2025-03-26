const TestAttempt = require('../models/TestAttempt');
const QuestionPaper = require('../models/QuestionPaper');
const { ValidationError, NotFoundError, ForbiddenError } = require('../utils/errors');

/**
 * Controller for managing test attempts
 */
const TestAttemptController = {
  /**
   * Start a new test attempt or resume an existing one
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  startTest: async (req, res, next) => {
    try {
      const { testSeriesId, paperId } = req.params;
      const userId = req.user._id; // Assuming authentication middleware provides req.user
      
      // Check if there's an in-progress attempt for this user and paper
      let existingAttempt = await TestAttempt.findOne({
        userId,
        testSeriesId,
        paperId,
        status: 'in-progress'
      });
      
      if (existingAttempt) {
        // Update lastActiveAt timestamp
        existingAttempt.timing.lastActiveAt = new Date();
        await existingAttempt.save();
        
        return res.status(200).json({
          success: true,
          message: 'Resumed existing test attempt',
          testAttempt: existingAttempt
        });
      }
      
      // Retrieve question paper to set up attempt structure
      const questionPaper = await QuestionPaper.findById(paperId);
      if (!questionPaper) {
        throw new NotFoundError('Question paper not found');
      }
      
      // Create basic sections structure based on question paper
      const sections = questionPaper.sections.map(section => ({
        sectionId: section._id,
        sectionTitle: section.title,
        responses: section.questions.map((_, index) => ({
          questionIndex: index,
          selectedOption: null,
          isMarkedForReview: false,
          timeSpent: 0,
          isCorrect: false,
          marksAwarded: 0
        })),
        timeSpent: 0,
        score: 0,
        maxScore: section.questions.reduce((sum, q) => sum + q.posMarks, 0)
      }));
      
      // Calculate total allowed time safely
      let totalTimeInMinutes = 0;
      if (questionPaper.sections && Array.isArray(questionPaper.sections)) {
        totalTimeInMinutes = questionPaper.sections.reduce((sum, section) => {
          // Make sure section.time is a valid number
          const sectionTime = section.duration || section.time || 0;
          return sum + (typeof sectionTime === 'number' ? sectionTime : 0);
        }, 0);
      }
      
      // Default to 60 minutes (3600 seconds) if time calculation fails
      const totalTimeInSeconds = totalTimeInMinutes > 0 ? totalTimeInMinutes * 60 : 3600;
      
      // Create new test attempt
      const newAttempt = new TestAttempt({
        userId,
        testSeriesId,
        paperId,
        sections,
        progress: {
          currentSection: 0,
          currentQuestion: 0,
          visitedQuestions: {}
        },
        timing: {
          startedAt: new Date(),
          lastActiveAt: new Date(),
          totalTimeSpent: 0,
          remainingTime: totalTimeInSeconds
        }
      });
      
      await newAttempt.save();
      
      // Update attempt count on question paper
      await QuestionPaper.findByIdAndUpdate(paperId, { $inc: { attempts: 1 } });
      
      return res.status(201).json({
        success: true,
        message: 'Test attempt started successfully',
        testAttempt: newAttempt
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Get current test attempt for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getCurrentAttempt: async (req, res, next) => {
    try {
      const { testSeriesId, paperId } = req.params;
      const userId = req.user._id;
      const { includeAll } = req.query;
      
      // Build query based on parameters
      const query = {
        userId,
        testSeriesId,
        paperId
      };
      
      // If includeAll is true, find both in-progress and paused attempts
      // Otherwise just find in-progress attempts (default behavior)
      if (includeAll !== 'true') {
        query.status = 'in-progress';
      } else {
        query.status = { $in: ['in-progress', 'paused'] };
      }
      
      // Find the most recent attempt matching the criteria
      const testAttempt = await TestAttempt.findOne(query)
        .sort({ 'timing.lastActiveAt': -1 });
      
      if (!testAttempt) {
        return res.status(200).json({
          success: true,
          message: 'No active test attempt found',
          testAttempt: null
        });
      }
      
      return res.status(200).json({
        success: true,
        testAttempt
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Update test progress (save current state)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  updateProgress: async (req, res, next) => {
    try {
      const { testSeriesId, paperId, attemptId } = req.params;
      const userId = req.user._id;
      const { 
        selectedOptions, 
        markedForReview, 
        currentSection, 
        currentQuestion, 
        visitedQuestions,
        timeSpent,
        remainingTime
      } = req.body;
      
      // Find the attempt
      const testAttempt = await TestAttempt.findOne({
        _id: attemptId,
        userId,
        testSeriesId,
        paperId,
        status: 'in-progress'
      });
      
      if (!testAttempt) {
        throw new NotFoundError('Test attempt not found or not in progress');
      }
      
      // Update progress information
      if (typeof currentSection === 'number') {
        testAttempt.progress.currentSection = currentSection;
      }
      
      if (typeof currentQuestion === 'number') {
        testAttempt.progress.currentQuestion = currentQuestion;
      }
      
      if (visitedQuestions) {
        // Merge with existing visited questions
        for (const [key, value] of Object.entries(visitedQuestions)) {
          testAttempt.progress.visitedQuestions.set(key, value);
        }
      }
      
      // Update timing information
      testAttempt.timing.lastActiveAt = new Date();
      
      if (typeof timeSpent === 'number' && timeSpent > 0) {
        testAttempt.timing.totalTimeSpent = timeSpent;
      }
      
      if (typeof remainingTime === 'number' && remainingTime >= 0) {
        testAttempt.timing.remainingTime = remainingTime;
      }
      
      // Update responses if provided
      if (selectedOptions && Object.keys(selectedOptions).length > 0) {
        for (const [key, value] of Object.entries(selectedOptions)) {
          const [sectionIdx, questionIdx] = key.split('-').map(Number);
          
          if (testAttempt.sections[sectionIdx] && 
              testAttempt.sections[sectionIdx].responses[questionIdx]) {
            testAttempt.sections[sectionIdx].responses[questionIdx].selectedOption = value;
          }
        }
      }
      
      // Update marked for review status if provided
      if (markedForReview && Object.keys(markedForReview).length > 0) {
        for (const [key, value] of Object.entries(markedForReview)) {
          const [sectionIdx, questionIdx] = key.split('-').map(Number);
          
          if (testAttempt.sections[sectionIdx] && 
              testAttempt.sections[sectionIdx].responses[questionIdx]) {
            testAttempt.sections[sectionIdx].responses[questionIdx].isMarkedForReview = value;
          }
        }
      }
      
      await testAttempt.save();
      
      return res.status(200).json({
        success: true,
        message: 'Test progress updated successfully',
        testAttempt
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Submit a test attempt (mark as completed and calculate scores)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  submitTest: async (req, res, next) => {
    try {
      const { testSeriesId, paperId, attemptId } = req.params;
      const userId = req.user._id;
      const { 
        selectedOptions, 
        timeSpent,
        remainingTime
      } = req.body;
      
      // Find the attempt
      const testAttempt = await TestAttempt.findOne({
        _id: attemptId,
        userId,
        testSeriesId,
        paperId,
        status: 'in-progress'
      });
      
      if (!testAttempt) {
        throw new NotFoundError('Test attempt not found or not in progress');
      }
      
      // Get question paper for correct answers
      const questionPaper = await QuestionPaper.findById(paperId);
      if (!questionPaper) {
        throw new NotFoundError('Question paper not found');
      }
      
      // Update any final answers provided
      if (selectedOptions && Object.keys(selectedOptions).length > 0) {
        for (const [key, value] of Object.entries(selectedOptions)) {
          const [sectionIdx, questionIdx] = key.split('-').map(Number);
          
          if (testAttempt.sections[sectionIdx] && 
              testAttempt.sections[sectionIdx].responses[questionIdx]) {
            testAttempt.sections[sectionIdx].responses[questionIdx].selectedOption = value;
          }
        }
      }
      
      // Evaluate answers against question paper
      for (let sectionIdx = 0; sectionIdx < questionPaper.sections.length; sectionIdx++) {
        const paperSection = questionPaper.sections[sectionIdx];
        const attemptSection = testAttempt.sections[sectionIdx];
        
        if (!attemptSection) continue;
        
        let sectionScore = 0;
        
        for (let questionIdx = 0; questionIdx < paperSection.questions.length; questionIdx++) {
          const question = paperSection.questions[questionIdx];
          const response = attemptSection.responses[questionIdx];
          
          if (!response) continue;
          
          // Check if answer is correct
          if (response.selectedOption !== null) {
            const isCorrect = response.selectedOption === question.correctAnswer;
            response.isCorrect = isCorrect;
            
            // Calculate marks
            if (isCorrect) {
              response.marksAwarded = question.posMarks || 0;
              sectionScore += question.posMarks || 0;
            } else {
              response.marksAwarded = -(question.negMarks || 0);
              sectionScore -= question.negMarks || 0;
            }
          }
        }
        
        // Update section score
        attemptSection.score = sectionScore;
      }
      
      // Update timing information
      testAttempt.timing.submittedAt = new Date();
      
      if (typeof timeSpent === 'number' && timeSpent > 0) {
        testAttempt.timing.totalTimeSpent = timeSpent;
      }
      
      if (typeof remainingTime === 'number' && remainingTime >= 0) {
        testAttempt.timing.remainingTime = remainingTime;
      }
      
      // Mark as completed
      testAttempt.status = 'completed';
      
      // Save the attempt (pre-save hook will calculate summary stats)
      await testAttempt.save();
      
      return res.status(200).json({
        success: true,
        message: 'Test submitted successfully',
        testAttempt
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Get test attempt results
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getResults: async (req, res, next) => {
    try {
      const { testSeriesId, paperId, attemptId } = req.params;
      const userId = req.user._id;
      
      const testAttempt = await TestAttempt.findOne({
        _id: attemptId || { $exists: true }, // If no attemptId, get latest attempt
        userId,
        testSeriesId,
        paperId,
        status: 'completed'
      }).sort({ 'timing.submittedAt': -1 }); // Get latest completed attempt
      
      if (!testAttempt) {
        throw new NotFoundError('No completed test attempt found');
      }
      
      return res.status(200).json({
        success: true,
        testAttempt
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Get all attempts for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getUserAttempts: async (req, res, next) => {
    try {
      const { testSeriesId } = req.params;
      const userId = req.user._id;
      const { status } = req.query;
      
      // Build query
      const query = { userId, testSeriesId };
      
      // Filter by status if provided
      if (status) {
        query.status = status;
      }
      
      const attempts = await TestAttempt.find(query)
        .sort({ 'timing.startedAt': -1 })
        .populate('paperId', 'title'); // Populate paper title for display
      
      return res.status(200).json({
        success: true,
        attempts
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = TestAttemptController; 