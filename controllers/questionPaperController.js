const QuestionPaper = require('../models/QuestionPaper');
const TestSeriesSection = require('../models/TestSeriesSection');
const Test = require('../models/Test');
const mongoose = require('mongoose');
const logger = require('../config/logger');
const cache = require('../utils/cache');
const { ValidationError } = require("../utils/errors");

class QuestionPaperController {
    /**
     * Get all question papers with filtering and pagination
     * @route GET /question-papers
     */
    static async getQuestionPapers(req, res) {
        try {
            const { search, status, sort = 'createdAt', order = 'desc', page = 1, limit = 10 } = req.query;

            logger.debug('Fetching papers with params:', { search, status, sort, order, page, limit });

            // Build query
            const query = {};
            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ];
            }
            if (status) {
                query.status = status;
            }

            // Execute query with analytics
            const [questionPapers, total] = await Promise.all([
                QuestionPaper.find(query)
                    .sort({ [sort]: order === 'desc' ? -1 : 1 })
                    .skip((page - 1) * limit)
                    .limit(parseInt(limit))
                    .populate("metadata.createdBy", "name email")
                    .populate("metadata.lastModifiedBy", "name email")
                    .populate("testId", "title exam course")
                    .lean(),
                QuestionPaper.countDocuments(query)
            ]);

            logger.debug('Query results:', { found: questionPapers.length, total });

            const response = {
                success: true,
                questionPapers,
                pagination: {
                    total,
                    pages: Math.ceil(total / limit),
                    page: parseInt(page),
                    limit: parseInt(limit)
                },
                analytics: {
                    totalPapers: total,
                    activePapers: questionPapers.filter(p => p.isActive).length,
                    averageAttempts: questionPapers.reduce((acc, p) => acc + (p.attempts || 0), 0) / questionPapers.length || 0,
                    byStatus: {
                        draft: questionPapers.filter(p => p.status === "draft").length,
                        published: questionPapers.filter(p => p.status === "published").length,
                        archived: questionPapers.filter(p => p.status === "archived").length
                    }
                }
            };

            res.json(response);
        } catch (error) {
            logger.error('GetQuestionPapers error:', { 
                error: error.message,
                stack: error.stack,
                query: req.query
            });
            res.status(error instanceof ValidationError ? 400 : 500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Create a new question paper from test
     * @route POST /question-papers
     */
    static async createQuestionPaper(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            console.log('Starting createQuestionPaper');
            const { testId, title, description, isFullTest, sections, languages, showCalculator, isFree, isActive } = req.body;
            const { sectionId: testSeriesSectionId } = req.params;
            console.log('Request body:', { testId, testSeriesSectionId, title });

            const test = await Test.findById(testId);
            console.log('Found Test:', test ? 'Yes' : 'No');
            if (!test) {
                throw new ValidationError("Test not found");
            }

            // Check if the test has sections
            if (!test.sections || test.sections.length === 0) {
                throw new ValidationError("The selected test does not have any sections. Please select a test with at least one section or create sections for this test first.");
            }

            // Validate test series section exists
            console.log('Looking for TestSeriesSection:', testSeriesSectionId);
            const testSeriesSection = await mongoose.model('TestSeriesSection').findById(testSeriesSectionId);
            console.log('Found TestSeriesSection:', testSeriesSection ? 'Yes' : 'No');
            if (!testSeriesSection) {
                throw new ValidationError("Test series section not found");
            }

            // Validate sections exist in test
            console.log('Validating sections');
            console.log('Received sections:', JSON.stringify(sections, null, 2));
            console.log('Test sections:', JSON.stringify(test.sections, null, 2));

            // If isFullTest is true, use all sections from the test
            const sectionsToUse = isFullTest 
                ? test.sections.map(s => ({ _id: s._id.toString() })) 
                : sections;

            const invalidSections = sectionsToUse.filter(section => 
                !test.sections.some(testSection => {
                    console.log('Comparing:', {
                        sectionId: section._id,
                        testSectionId: testSection._id?.toString()
                    });
                    return testSection._id?.toString() === section._id;
                })
            );

            if (invalidSections.length > 0) {
                console.log('Invalid sections found:', invalidSections);
                throw new ValidationError(`Invalid sections: ${invalidSections.map(s => s._id).join(', ')}`);
            }

            console.log('Creating QuestionPaper object');
            // Create question paper
            const questionPaper = new QuestionPaper({
                testId,
                testSeriesSectionId,
                title: title || `${test.title} - ${new Date().toLocaleDateString()}`,
                description: description || `Based on ${test.exam} - ${test.course}`,
                sections: test.sections.map(testSection => ({
                        _id: new mongoose.Types.ObjectId(),
                        title: testSection.title,
                    time: testSection.time,
                    qCount: testSection.qCount,
                    maxM: testSection.maxM,
                    isQualifyingSection: testSection.isQualifyingSection,
                        instructions: Array.isArray(testSection.instructions) 
                        ? testSection.instructions.filter(Boolean)
                        : [],
                        hasOptionalQuestions: testSection.hasOptionalQuestions || false,
                        isOptional: testSection.isOptional || false,
                        isTimeShared: testSection.isTimeShared || false,
                        questions: [],
                    SSNo: testSection.SSNo || 1
                })),
                languages: languages || test.languages,
                showCalculator: showCalculator ?? test.showCalculator,
                isFree: isFree ?? false,
                isActive: isActive ?? true,
                status: "draft", // Default status
                metadata: {
                    createdBy: req.user?._id || null,
                    lastModifiedBy: req.user?._id || null,
                    createdAt: new Date()
                }
            });

            console.log('Attempting to save QuestionPaper');
            // Save question paper
            await questionPaper.save({ session });
            console.log('QuestionPaper saved successfully');

            // Explicitly update the TestSeriesSection to include the question paper ID
            await TestSeriesSection.findByIdAndUpdate(
                testSeriesSectionId,
                { 
                    $push: { questionPapers: questionPaper._id },
                    $set: { 
                        'metadata.lastQuestionPaperAdded': new Date(),
                        'metadata.totalQuestions': testSeriesSection.metadata.totalQuestions + (questionPaper.totalQuestions || 0),
                        'metadata.totalMarks': testSeriesSection.metadata.totalMarks + (questionPaper.totalMarks || 0)
                    }
                },
                { session }
            );
            console.log('TestSeriesSection updated with question paper ID');

            await session.commitTransaction();
            console.log('Transaction committed');

            // Get populated paper
            console.log('Getting populated paper');
            const populatedPaper = await QuestionPaper.findById(questionPaper._id)
                .populate("metadata.createdBy", "name email")
                .populate("testId", "title exam course")
                .populate("testSeriesSectionId", "title")
                .lean();

            res.status(201).json({
                success: true,
                questionPaper: populatedPaper
            });
            console.log('Response sent successfully');
        } catch (error) {
            console.error('Error in createQuestionPaper:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            await session.abortTransaction();
            console.log('Transaction aborted');
            
            logger.error('CreateQuestionPaper error:', {
                error: error.message,
                stack: error.stack,
                body: req.body
            });
            res.status(error instanceof ValidationError ? 400 : 500).json({
                success: false,
                message: error.message
            });
        } finally {
            session.endSession();
            console.log('Session ended');
        }
    }

    /**
     * Update question paper
     * @route PATCH /question-papers/:paperId
     */
    static async updateQuestionPaper(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { paperId } = req.params;
            const { sectionId, question } = req.body;
            console.log("paperId", paperId);

            // Validate ID
            if (!mongoose.Types.ObjectId.isValid(paperId)) {
                throw new ValidationError("Invalid paper ID format");
            }

            // Get existing paper
            const paper = await QuestionPaper.findById(paperId);
            if (!paper) {
                throw new ValidationError("Question paper not found");
            }

            // Check if paper can be modified
            if (paper.status === "archived") {
                throw new ValidationError("Cannot modify archived paper");
            }

            // If adding a question
            if (sectionId && question) {
                // Validate sectionId from question object
                if (!question.sectionId || !mongoose.Types.ObjectId.isValid(question.sectionId)) {
                    throw new ValidationError("Invalid section ID in question data");
                }

                // Find the section using the sectionId from the question object
                const section = paper.sections.find(s => s._id.toString() === question.sectionId.toString());
                if (!section) {
                    throw new ValidationError("Section not found in paper");
                }

                // Validate question structure based on model requirements
                if (!question.type || !['mcq', 'numerical', 'descriptive'].includes(question.type)) {
                    throw new ValidationError("Invalid question type");
                }

                // Validate content structure
                if (!question.content || !question.content.en || !question.content.en.prompt) {
                    throw new ValidationError("Question must have content with at least English prompt");
                }

                // Validate marks
                if (typeof question.posMarks !== 'number' || question.posMarks < 0) {
                    throw new ValidationError("Invalid positive marks");
                }
                if (typeof question.negMarks !== 'number' || question.negMarks < 0) {
                    throw new ValidationError("Invalid negative marks");
                }
                if (typeof question.skipMarks !== 'number') {
                    throw new ValidationError("Invalid skip marks");
                }

                // Validate correct answer based on question type
                if (question.type === 'mcq' && (!Number.isInteger(question.correctAnswer) || question.correctAnswer < 0)) {
                    throw new ValidationError("MCQ correct answer must be a non-negative integer");
                } else if (question.type === 'numerical' && !Number.isFinite(question.correctAnswer)) {
                    throw new ValidationError("Numerical correct answer must be a number");
                } else if (question.type === 'descriptive' && typeof question.correctAnswer !== 'string') {
                    throw new ValidationError("Descriptive correct answer must be a string");
                }

                // Prepare question with required fields from model
                const newQuestion = {
                    ...question,
                    isNum: question.type === 'numerical',
                    SSNo: section.SSNo,
                    QSNo: (section.questions?.length || 0) + 1,
                    content: {
                        en: {
                            ...question.content.en,
                            value: question.content.en.value || '',
                            solution: question.content.en.solution || '',
                            options: question.content.en.options.map(opt => ({
                                prompt: opt.prompt || '',  // Set empty string if prompt is missing
                                value: opt.value || ''     // Set empty string if value is missing
                            }))
                        }
                    },
                    negMarks: question.negMarks || 0,
                    posMarks: question.posMarks || 1,
                    skipMarks: question.skipMarks || 0
                };

                // Initialize questions array if needed
                if (!section.questions) {
                    section.questions = [];
                }

                // Add question to section
                section.questions.push(newQuestion);

                // Update section's qCount
                section.qCount = section.questions.length;

            } else {
                // Handle paper updates (only allowed fields from model)
                const allowedUpdates = [
                    'title',
                    'description',
                    'isActive',
                    'showCalculator',
                    'isFree',
                    'status',
                    'languages'
                ];
                
                const updates = {};
                Object.keys(req.body).forEach(key => {
                    if (allowedUpdates.includes(key)) {
                        // Validate specific fields
                        if (key === 'status' && !['draft', 'published', 'archived'].includes(req.body[key])) {
                            throw new ValidationError("Invalid status value");
                        }
                        if (key === 'title' && (!req.body[key] || req.body[key].length < 3)) {
                            throw new ValidationError("Title must be at least 3 characters long");
                        }
                        updates[key] = req.body[key];
                    }
                });

                Object.assign(paper, updates);
            }

            // Update metadata
            paper.metadata.lastModifiedBy = req.user._id;

            // Save changes - this will trigger model validations
            await paper.save({ session });
            await session.commitTransaction();

            // Get updated paper with populated fields
            const updatedPaper = await QuestionPaper.findById(paperId)
                .populate("metadata.createdBy", "name email")
                .populate("metadata.lastModifiedBy", "name email")
                .populate("testId", "title exam course")
                .lean();

            res.json({
                success: true,
                questionPaper: updatedPaper
            });
        } catch (error) {
            await session.abortTransaction();
            logger.error('UpdateQuestionPaper error:', {
                error: error.message,
                stack: error.stack,
                params: req.params,
                body: req.body
            });
            res.status(error instanceof ValidationError ? 400 : 500).json({
                success: false,
                message: error.message
            });
        } finally {
            session.endSession();
        }
    }

    /**
     * Delete question paper
     * @route DELETE /question-papers/:paperId
     */
    static async deleteQuestionPaper(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { paperId } = req.params;

            // Validate ID
            if (!mongoose.Types.ObjectId.isValid(paperId)) {
                throw new ValidationError("Invalid paper ID format");
            }

            // Find paper first
            const paper = await QuestionPaper.findById(paperId);
            if (!paper) {
                throw new ValidationError("Question paper not found");
            }

            // Remove paper (this will trigger pre-remove middleware)
            await paper.remove({ session });
            await session.commitTransaction();

            res.json({
                success: true,
                message: "Question paper deleted successfully"
            });
        } catch (error) {
            await session.abortTransaction();
            logger.error('DeleteQuestionPaper error:', {
                error: error.message,
                stack: error.stack,
                params: req.params
            });
            res.status(error instanceof ValidationError ? 400 : 500).json({
                success: false,
                message: error.message
            });
        } finally {
            session.endSession();
        }
    }

    // @desc    Get a question paper by ID
    // @route   GET /api/v1/test-series/:testSeriesId/sections/:sectionId/question-papers/:paperId
    // @access  Public
    static async getQuestionPaperById(req, res) {
        try {
            const { paperId } = req.params;


            const questionPaper = await QuestionPaper.findById(paperId)
                .populate('sections.questions')
                .lean();

            if (!questionPaper) {
                return res.status(404).json({
                    success: false,
                    message: 'Question paper not found'
                });
            }

            res.status(200).json({
                success: true,
                questionPaper
            });
        } catch (error) {
            console.error('Error in getQuestionPaperById:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch question paper',
                error: error.message
            });
        }
    }

    /**
     * Update or create a question at specific index
     * @route PUT /question-papers/:paperId/questions/:questionIndex
     */
    static async updateQuestion(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { paperId, questionIndex } = req.params;
            const { question } = req.body;

            // Get existing paper
            const paper = await QuestionPaper.findById(paperId);
            if (!paper) {
                throw new ValidationError("Question paper not found");
            }

            // Find the section
            const section = paper.sections.find(s => s._id.toString() === question.sectionId.toString());
            if (!section) {
                throw new ValidationError("Section not found in paper");
            }

            // Prepare question with required fields
            const newQuestion = {
                ...question,
                isNum: question.type === 'numerical',
                SSNo: section.SSNo,
                QSNo: parseInt(questionIndex) + 1,
                content: {
                    en: {
                        value: question.content.en.value || '',
                        comp: question.content.en.comp || '',
                        solution: question.content.en.solution || '',
                        options: (question.content.en.options || []).map(opt => ({
                            prompt: opt.prompt || '',
                            value: opt.value || ''
                        }))
                    }
                },
                negMarks: question.negMarks || 0,
                posMarks: question.posMarks || 1,
                skipMarks: question.skipMarks || 0
            };

            // Set isComplete based on question type
            if (question.type === 'mcq') {
                newQuestion.isComplete = !!(
                    newQuestion.content.en.value?.trim() && 
                    newQuestion.content.en.options?.some(opt => opt.value?.trim()) &&
                    typeof question.correctAnswer === 'number'
                );
            } else if (question.type === 'numerical') {
                newQuestion.isComplete = !!(
                    newQuestion.content.en.value?.trim() && 
                    typeof question.correctAnswer === 'number'
                );
            } else if (question.type === 'descriptive') {
                newQuestion.isComplete = !!(
                    newQuestion.content.en.value?.trim() && 
                    typeof question.correctAnswer === 'string' &&
                    question.correctAnswer.trim().length > 0
                );
            }

            // Update the question at the specified index
            section.questions[parseInt(questionIndex)] = newQuestion;

            // Save changes
            await paper.save({ session });
            await session.commitTransaction();

            res.json({
                success: true,
                message: "Question updated successfully",
                question: {
                    ...newQuestion,
                    isComplete: newQuestion.isComplete,
                    content: {
                        en: newQuestion.content.en
                    }
                }
            });

        } catch (error) {
            await session.abortTransaction();
            logger.error('UpdateQuestion error:', {
                error: error.message,
                stack: error.stack,
                params: req.params,
                body: req.body
            });
            res.status(error instanceof ValidationError ? 400 : 500).json({
                success: false,
                message: error.message
            });
        } finally {
            session.endSession();
        }
    }

    /**
     * Delete a question at specific index
     * @route DELETE /question-papers/:paperId/questions/:questionIndex
     */
    static async deleteQuestion(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { paperId, questionIndex } = req.params;
            const { sectionId } = req.body;

            // Validate IDs and index
            if (!mongoose.Types.ObjectId.isValid(paperId)) {
                throw new ValidationError("Invalid paper ID format");
            }

            if (!Number.isInteger(parseInt(questionIndex)) || parseInt(questionIndex) < 0) {
                throw new ValidationError("Invalid question index");
            }

            // Get existing paper
            const paper = await QuestionPaper.findById(paperId);
            if (!paper) {
                throw new ValidationError("Question paper not found");
            }

            // Find the section
            const section = paper.sections.find(s => s._id.toString() === sectionId);
            if (!section) {
                throw new ValidationError("Section not found in paper");
            }

            // Remove the question
            if (section.questions && section.questions[parseInt(questionIndex)]) {
                section.questions[parseInt(questionIndex)] = null;
                section.qCount = section.questions.filter(q => q !== null).length;

                // Update metadata
                paper.metadata.lastModifiedBy = req.user?._id;

                // Save changes
                await paper.save({ session });
                await session.commitTransaction();

                res.json({
                    success: true,
                    message: "Question deleted successfully"
                });
            } else {
                throw new ValidationError("Question not found at specified index");
            }

        } catch (error) {
            await session.abortTransaction();
            logger.error('DeleteQuestion error:', {
                error: error.message,
                stack: error.stack,
                params: req.params,
                body: req.body
            });
            res.status(error instanceof ValidationError ? 400 : 500).json({
                success: false,
                message: error.message
            });
        } finally {
            session.endSession();
        }
    }

    /**
     * Import questions from CSV and add them to a question paper
     * @route POST /question-papers/:testSeriesId/sections/:sectionId/question-papers/import-csv
     */
    static async importQuestionsFromCSV(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { testSeriesId, sectionId } = req.params;
            const { questions, paperId } = req.body;

            logger.debug('Starting CSV import for questions', { 
                testSeriesId, 
                sectionId, 
                paperId, 
                questionCount: questions?.length 
            });

            if (!questions || !Array.isArray(questions) || questions.length === 0) {
                throw new ValidationError("No valid questions provided in the CSV");
            }

            // Validate that each question has required fields
            questions.forEach((question, index) => {
                // Validation for the new question structure
                if (question.content) {
                    // New format with content object
                    if (!question.content.en || !question.content.en.value) {
                        throw new ValidationError(`Question at index ${index} is missing content.en.value`);
                    }
                    if (!question.content.en.options || !Array.isArray(question.content.en.options) || 
                        question.content.en.options.length < 2) {
                        throw new ValidationError(`Question at index ${index} must have at least 2 options in content.en.options`);
                    }
                    if (question.correctAnswer === undefined || question.correctAnswer < 0 || 
                        question.correctAnswer >= question.content.en.options.length) {
                        throw new ValidationError(`Question at index ${index} has an invalid correctAnswer`);
                    }
                } else {
                    // Legacy format for backward compatibility
                    if (!question.text) {
                        throw new ValidationError(`Question at index ${index} is missing text`);
                    }
                    if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
                        throw new ValidationError(`Question at index ${index} must have at least 2 options`);
                    }
                    if (question.correctOption === undefined || question.correctOption < 0 || 
                        question.correctOption >= question.options.length) {
                        throw new ValidationError(`Question at index ${index} has an invalid correctOption`);
                    }
                }
                
                // Validate section information if provided
                if (question.sectionTitle && typeof question.sectionTitle !== 'string') {
                    throw new ValidationError(`Question at index ${index} has an invalid sectionTitle`);
                }
                if (question.sectionIndex !== undefined && 
                    (typeof question.sectionIndex !== 'number' || question.sectionIndex < 0)) {
                    throw new ValidationError(`Question at index ${index} has an invalid sectionIndex`);
                }
            });

            // Find the test series section
            const testSeriesSection = await TestSeriesSection.findById(sectionId)
                .session(session);

            if (!testSeriesSection) {
                throw new ValidationError("Test series section not found");
            }

            let questionPaper;

            // If paperId is provided, update existing paper, otherwise create a new one
            if (paperId) {
                questionPaper = await QuestionPaper.findById(paperId)
                    .session(session);

                if (!questionPaper) {
                    throw new ValidationError("Question paper not found");
                }

                // Verify the question paper belongs to the specified section
                if (questionPaper.testSeriesSectionId.toString() !== sectionId) {
                    throw new ValidationError("Question paper does not belong to the specified section");
                }
            } else {
                // Create a new question paper if paperId is not provided
                // We need to get the testId from the section
                const testId = testSeriesSection.testId;
                
                // Fetch the test to get its details
                const test = await Test.findById(testId).session(session);
                if (!test) {
                    throw new ValidationError("Test not found");
                }

                // Check if the test has sections
                if (!test.sections || test.sections.length === 0) {
                    throw new ValidationError("The selected test does not have any sections. Please select a test with at least one section or create sections for this test first.");
                }

                // Create a new question paper with default values
                questionPaper = new QuestionPaper({
                    testId,
                    testSeriesSectionId: sectionId,
                    title: `Imported Paper - ${new Date().toLocaleDateString()}`,
                    description: `Imported from CSV for ${test.title}`,
                    sections: test.sections.map(testSection => ({
                        _id: new mongoose.Types.ObjectId(),
                        title: testSection.title,
                        time: testSection.time,
                        qCount: 0, // Will be updated as questions are added
                        maxM: testSection.maxM,
                        isQualifyingSection: testSection.isQualifyingSection,
                        instructions: Array.isArray(testSection.instructions) 
                            ? testSection.instructions.filter(Boolean)
                            : [],
                        hasOptionalQuestions: testSection.hasOptionalQuestions || false,
                        isOptional: testSection.isOptional || false,
                        isTimeShared: testSection.isTimeShared || false,
                        questions: [], // Will be populated with imported questions
                        SSNo: testSection.SSNo || 1
                    })),
                    languages: ["en"],
                    showCalculator: false,
                    isFree: false,
                    isActive: true,
                    status: "draft",
                    metadata: {
                        createdBy: req.user?._id,
                        lastModifiedBy: req.user?._id,
                        createdAt: new Date(),
                        lastModifiedAt: new Date()
                    }
                });
            }

            // Group questions by section
            const questionsBySection = new Map();
            
            // Process each question and organize by section
            questions.forEach((question, index) => {
                // Determine which section this question belongs to
                let sectionKey;
                let sectionIndex = 0;
                
                if (question.sectionId) {
                    // If section ID is provided, use it directly
                    sectionKey = `id_${question.sectionId}`;
                    // Find matching section in the paper
                    sectionIndex = questionPaper.sections.findIndex(s => s._id.toString() === question.sectionId);
                } else if (question.sectionNumber !== undefined) {
                    // Map to section by SSNo
                    sectionIndex = questionPaper.sections.findIndex(s => s.SSNo === parseInt(question.sectionNumber));
                    sectionKey = `section_${question.sectionNumber}`;
                } else if (question.sectionTitle) {
                    // Find by title
                    sectionIndex = questionPaper.sections.findIndex(s => 
                        s.title.toLowerCase() === question.sectionTitle.toLowerCase());
                    sectionKey = question.sectionTitle;
                } else if (question.SSNo !== undefined) {
                    // Try to find by SSNo if available
                    sectionIndex = questionPaper.sections.findIndex(s => s.SSNo === question.SSNo);
                    sectionKey = `section_${question.SSNo}`;
                } else {
                    // Default to the first section
                    sectionKey = 'default_section';
                }
                
                // If we couldn't find a matching section, use the first one
                if (sectionIndex === -1) {
                    sectionIndex = 0;
                }
                
                // Use the actual section index to ensure questions go in the right place
                sectionKey = `section_${sectionIndex}`;
                
                // Initialize the section group if it doesn't exist
                if (!questionsBySection.has(sectionKey)) {
                    questionsBySection.set(sectionKey, {
                        sectionIndex,
                        questions: []
                    });
                }
                
                if (question.content) {
                    // Question is already in the new format - use as is with minimal processing
                    // For backward compatibility, ensure correctAnswer exists (was correctOption in old format)
                    const processedQuestion = {
                        ...question,
                        // Ensure SSNo, SSSNo, QSNo fields exist
                        SSNo: question.SSNo || questionPaper.sections[sectionIndex].SSNo || 1,
                        QSNo: index + 1 // Temporary QSNo, will be updated later
                    };
                    
                    // Handle additional languages - ensure they're in the paper's language list
                    Object.keys(question.content).forEach(lang => {
                        if (!questionPaper.languages.includes(lang)) {
                            questionPaper.languages.push(lang);
                        }
                    });
                    
                    // Add to the appropriate section group
                    questionsBySection.get(sectionKey).questions.push(processedQuestion);
                } else {
                    // Legacy format - convert to new format
                    // Create language content map
                    const content = new Map();
                    
                    // Add English content
                    content.set('en', {
                        value: question.text,
                        solution: question.explanation || '',
                        options: question.options.map(opt => ({
                            value: opt.text,
                            prompt: ''
                        }))
                    });
                    
                    // Add comprehension passage if this is a comprehension question
                    if (question.isComprehension && question.passage) {
                        content.get('en').comp = question.passage;
                    }
                    
                    // Add Hindi content if available
                    if (question.hindi) {
                        content.set('hi', {
                            value: question.hindi,
                            solution: question.hindiExplanation || '',
                            options: question.hindiOptions?.map(opt => ({
                                value: opt.text,
                                prompt: ''
                            })) || []
                        });
                        
                        // Add Hindi passage for comprehension questions
                        if (question.isComprehension && question.hindiPassage) {
                            content.get('hi').comp = question.hindiPassage;
                        }
                        
                        // Add Hindi to languages if not already present
                        if (!questionPaper.languages.includes('hi')) {
                            questionPaper.languages.push('hi');
                        }
                    }
                    
                    // Create the processed question object
                    const processedQuestion = {
                        isNum: false,
                        type: question.type || "mcq",
                        isComplete: true,
                        negMarks: question.negativeMarks || 0.25,
                        posMarks: question.marks || 1,
                        skipMarks: 0,
                        content,
                        isComprehension: question.isComprehension || false,
                        correctAnswer: question.correctOption, // use correctOption from legacy format
                        SSNo: question.SSNo || questionPaper.sections[sectionIndex].SSNo || 1,
                        QSNo: index + 1 // Temporary QSNo, will be updated later
                    };
                    
                    // Add to the appropriate section group
                    questionsBySection.get(sectionKey).questions.push(processedQuestion);
                }
            });
            
            // Now process each section group
            if (paperId) {
                // Updating existing paper - need to handle each section appropriately
                
                // Create a map of existing sections by title for easy lookup
                const existingSectionsByTitle = new Map();
                const existingSectionsByIndex = new Map();
                
                questionPaper.sections.forEach((section, index) => {
                    existingSectionsByTitle.set(section.title.toLowerCase(), index);
                    existingSectionsByIndex.set(index, index);
                });
                
                // Process each section group from the CSV
                for (const [sectionKey, sectionQuestions] of questionsBySection.entries()) {
                    let sectionIndex;
                    
                    if (sectionKey.startsWith('id_')) {
                        // This is a direct section ID reference
                        const sectionId = sectionKey.replace('id_', '');
                        
                        // Find the section by ID
                        const sectionIndexInArray = questionPaper.sections.findIndex(
                            section => section._id.toString() === sectionId
                        );
                        
                        if (sectionIndexInArray === -1) {
                            throw new ValidationError(`Section with ID ${sectionId} not found in question paper. Please ensure the section ID is correct and exists in the question paper.`);
                        }
                        
                        sectionIndex = sectionIndexInArray;
                    } else if (sectionKey.startsWith('section_')) {
                        // This is a section index reference
                        const requestedIndex = parseInt(sectionKey.replace('section_', ''), 10);
                        
                        // Check if this section index exists
                        if (requestedIndex >= questionPaper.sections.length) {
                            // Create a new section with this index if it doesn't exist
                            // Get section title from first question or use default
                            const sectionTitle = sectionQuestions.questions[0]?.title || `Section ${requestedIndex}`;
                            const sectionDuration = sectionQuestions.questions[0]?.time || 60;
                            
                            // Create the new section
                            const newSection = {
                                _id: new mongoose.Types.ObjectId(),
                                title: sectionTitle,
                                time: sectionDuration,
                                maxM: sectionQuestions.questions.reduce((sum, q) => sum + q.posMarks, 0),
                                qCount: sectionQuestions.questions.length,
                                SSNo: requestedIndex + 1,
                                langFilteredQuestions: false,
                                hasOptionalQuestions: false,
                                isOptional: false,
                                isTimeShared: false,
                                instructions: [],
                                questions: [],
                            };
                            
                            questionPaper.sections.push(newSection);
                            
                            sectionIndex = questionPaper.sections.length - 1;
                        } else {
                            sectionIndex = requestedIndex;
                        }
                    } else if (sectionKey === 'default_section') {
                        // Default to first section
                        sectionIndex = 0;
                        
                        // Create first section if it doesn't exist
                        if (questionPaper.sections.length === 0) {
                            questionPaper.sections.push({
                                _id: new mongoose.Types.ObjectId(),
                                title: "Default Section",
                                time: 60,
                                maxM: sectionQuestions.questions.reduce((sum, q) => sum + q.posMarks, 0),
                                qCount: sectionQuestions.questions.length,
                                SSNo: 1,
                                langFilteredQuestions: false,
                                hasOptionalQuestions: false,
                                isOptional: false,
                                isTimeShared: false,
                                instructions: [],
                                questions: [],
                            });
                        }
                    } else {
                        // This is a section title reference
                        const normalizedTitle = sectionKey.toLowerCase();
                        
                        // Check if a section with this title exists
                        if (existingSectionsByTitle.has(normalizedTitle)) {
                            sectionIndex = existingSectionsByTitle.get(normalizedTitle);
                        } else {
                            // Create a new section with this title
                            const newSectionIndex = questionPaper.sections.length;
                            
                            // Get section duration from first question or use default
                            const sectionDuration = sectionQuestions.questions[0]?.time || 60;
                            
                            // Create the new section
                            const newSection = {
                                _id: new mongoose.Types.ObjectId(),
                                title: sectionKey,
                                time: sectionDuration,
                                maxM: sectionQuestions.questions.reduce((sum, q) => sum + q.posMarks, 0),
                                qCount: sectionQuestions.questions.length,
                                SSNo: newSectionIndex + 1,
                                langFilteredQuestions: false,
                                hasOptionalQuestions: false,
                                isOptional: false,
                                isTimeShared: false,
                                instructions: [],
                                questions: [],
                            };
                            
                            questionPaper.sections.push(newSection);
                            
                            sectionIndex = newSectionIndex;
                        }
                    }
                    
                    // Now we have the correct section index, update the questions and add them
                    const section = questionPaper.sections[sectionIndex];
                    const startQSNo = section.questions.length + 1;
                    
                    // Update QSNo, SSNo, and SSSNo for each question
                    sectionQuestions.questions.forEach((question, idx) => {
                        question.QSNo = startQSNo + idx;
                        question.SSNo = 1;
                    });
                    
                    // Add questions to the section
                    section.questions.push(...sectionQuestions.questions);
                    
                    // Update section metadata
                    section.qCount = section.questions.length;
                    section.maxM = section.questions.reduce((sum, q) => sum + q.posMarks, 0);
                }
            } else {
                // Creating a new paper - create sections based on the CSV data
                let sectionCounter = 1;
                
                // Process each section group
                for (const [sectionKey, sectionQuestions] of questionsBySection.entries()) {
                    let sectionTitle;
                    
                    if (sectionKey.startsWith('section_')) {
                        // Use section title from first question if available, otherwise use generic title
                        sectionTitle = sectionQuestions.questions[0]?.title || `Section ${sectionCounter}`;
                    } else if (sectionKey === 'default_section') {
                        sectionTitle = "Imported Section";
                    } else {
                        // Use the provided section title
                        sectionTitle = sectionKey;
                    }
                    
                    // Get section duration from first question or use default
                    const sectionDuration = sectionQuestions.questions[0]?.time || 60;
                    
                    // Create the new section
                    const newSection = {
                        _id: new mongoose.Types.ObjectId(),
                        title: sectionTitle,
                        time: sectionDuration,
                        maxM: sectionQuestions.questions.reduce((sum, q) => sum + q.posMarks, 0),
                        qCount: sectionQuestions.questions.length,
                        SSNo: 1,
                        langFilteredQuestions: false,
                        hasOptionalQuestions: false,
                        isOptional: false,
                        isTimeShared: false,
                        instructions: [],
                        questions: [],
                    };
                    
                    // Update QSNo, SSNo, and SSSNo for each question
                    sectionQuestions.questions.forEach((question, idx) => {
                        question.QSNo = idx + 1;
                        question.SSNo = 1;
                    });
                    
                    // Add questions to the section
                    newSection.questions = sectionQuestions.questions;
                    
                    // Add the section to the question paper
                    questionPaper.sections.push(newSection);
                    
                    sectionCounter++;
                }
            }

            // Ensure we have at least one section
            if (questionPaper.sections.length === 0) {
                throw new ValidationError("Failed to create any sections from the provided data");
            }

            // Update metadata
            if (req.user?._id) {
                questionPaper.metadata.lastModifiedBy = req.user._id;
                questionPaper.metadata.lastModifiedAt = new Date();
            }

            // Save the question paper
            await questionPaper.save({ session });

            // If this is a new paper, add it to the test series section
            if (!paperId) {
                testSeriesSection.questionPapers.push(questionPaper._id);
                await testSeriesSection.save({ session });
            }

            // Commit the transaction
            await session.commitTransaction();
            session.endSession();

            // Clear cache
            cache.del(`question-papers:${sectionId}`);
            cache.del(`question-paper:${questionPaper._id}`);

            // Count total questions imported
            const totalQuestionsImported = questionPaper.sections.reduce(
                (sum, section) => sum + section.questions.length, 0
            );

            logger.info('Successfully imported questions from CSV', {
                paperId: questionPaper._id,
                questionCount: totalQuestionsImported,
                sectionCount: questionPaper.sections.length
            });

            return res.status(200).json({
                success: true,
                message: `Successfully imported ${totalQuestionsImported} questions across ${questionPaper.sections.length} sections`,
                questionPaper: {
                    _id: questionPaper._id,
                    title: questionPaper.title,
                    questionCount: totalQuestionsImported,
                    sectionCount: questionPaper.sections.length,
                    sections: questionPaper.sections.map(section => ({
                        title: section.title,
                        questionCount: section.qCount,
                        maxM: section.maxM
                    }))
                }
            });
        } catch (error) {
            // Abort transaction on error
            await session.abortTransaction();
            session.endSession();

            logger.error('Error importing questions from CSV', {
                error: error.message,
                stack: error.stack
            });

            if (error instanceof ValidationError) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(500).json({
                success: false,
                message: "Failed to import questions from CSV",
                error: error.message
            });
        }
    }

    /**
     * Import questions from JSON and add them to a question paper
     * @route POST /question-papers/:testSeriesId/sections/:sectionId/question-papers/import-json
     */
    static async importQuestionsFromJSON(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { testSeriesId, sectionId } = req.params;
            const { questions, paperId, title, description } = req.body;


            logger.debug('Starting JSON import for questions', { 
                testSeriesId, 
                sectionId, 
                paperId, 
                questionCount: questions?.length 
            });

            if (!questions || !Array.isArray(questions) || questions.length === 0) {
                throw new ValidationError("No valid questions provided");
            }

            let questionPaper;

            // Find the test series section
            const testSeriesSection = await TestSeriesSection.findById(sectionId)
                .session(session);

            if (!testSeriesSection) {
                throw new ValidationError("Test series section not found");
            }

            // If paperId is provided, update existing paper, otherwise create a new one
            if (paperId) {
                questionPaper = await QuestionPaper.findById(paperId)
                    .session(session);

                if (!questionPaper) {
                    throw new ValidationError("Question paper not found");
                }

                // Verify the question paper belongs to the specified section
                if (questionPaper.testSeriesSectionId.toString() !== sectionId) {
                    throw new ValidationError("Question paper does not belong to the specified section");
                }
            } else {
                // Create a new question paper
                // We need to get the testId from the section
                const testId = testSeriesSection.testId;
                
                // Fetch the test to get its details
                const test = await Test.findById(testId).session(session);
                if (!test) {
                    throw new ValidationError("Test not found");
                }

                // Check if the test has sections
                if (!test.sections || test.sections.length === 0) {
                    throw new ValidationError("The selected test does not have any sections. Please select a test with at least one section or create sections for this test first.");
                }

                // Create a new question paper with default values
                questionPaper = new QuestionPaper({
                    testId,
                    testSeriesSectionId: sectionId,
                    title: title || `Imported JSON Paper - ${new Date().toLocaleDateString()}`,
                    description: description || `Imported from JSON for ${test.title}`,
                    sections: test.sections.map(testSection => ({
                        _id: new mongoose.Types.ObjectId(),
                        title: testSection.title,
                        time: testSection.time,
                        qCount: 0, // Will be updated as questions are added
                        maxM: testSection.maxM,
                        isQualifyingSection: testSection.isQualifyingSection,
                        instructions: Array.isArray(testSection.instructions) 
                            ? testSection.instructions.filter(Boolean)
                            : [],
                        hasOptionalQuestions: testSection.hasOptionalQuestions || false,
                        isOptional: testSection.isOptional || false,
                        isTimeShared: testSection.isTimeShared || false,
                        questions: [], // Will be populated with imported questions
                        SSNo: testSection.SSNo || 1
                    })),
                    languages: ["en"],
                    showCalculator: false,
                    isFree: false,
                    isActive: true,
                    status: "draft",
                    metadata: {
                        createdBy: req.user?._id,
                        lastModifiedBy: req.user?._id,
                        createdAt: new Date(),
                        lastModifiedAt: new Date()
                    }
                });
            }

            // Process each question and add to appropriate section
            for (const [index, question] of questions.entries()) {
                // Determine which section this question belongs to
                let sectionIndex = 0;
                
                if (question.sectionId) {
                    // Find matching section by ID
                    const matchingIndex = questionPaper.sections.findIndex(s => 
                        s._id.toString() === question.sectionId);
                    if (matchingIndex !== -1) {
                        sectionIndex = matchingIndex;
                    }
                } else if (question.sectionNumber !== undefined) {
                    // Map to section by SSNo
                    const matchingIndex = questionPaper.sections.findIndex(s => 
                        s.SSNo === parseInt(question.sectionNumber));
                    if (matchingIndex !== -1) {
                        sectionIndex = matchingIndex;
                    }
                } else if (question.sectionTitle) {
                    // Find by title
                    const matchingIndex = questionPaper.sections.findIndex(s => 
                        s.title.toLowerCase() === question.sectionTitle.toLowerCase());
                    if (matchingIndex !== -1) {
                        sectionIndex = matchingIndex;
                    }
                } else if (question.SSNo !== undefined) {
                    // Try to find by SSNo if available
                    const matchingIndex = questionPaper.sections.findIndex(s => 
                        s.SSNo === question.SSNo);
                    if (matchingIndex !== -1) {
                        sectionIndex = matchingIndex;
                    }
                }
                
                // Get the section
                        const section = questionPaper.sections[sectionIndex];
                        
                // Set question section properties
                question.SSNo = section.SSNo || 1;
                
                // Validate question format
                if (!question.content || !question.content.en || !question.content.en.value) {
                    throw new ValidationError(`Question at index ${index} is missing content.en.value`);
                }
                
                if (question.type === 'mcq') {
                    if (!question.content.en.options || !Array.isArray(question.content.en.options) || 
                        question.content.en.options.length < 2) {
                        throw new ValidationError(`MCQ question at index ${index} must have at least 2 options`);
                    }
                    
                    if (question.correctAnswer === undefined || 
                        question.correctAnswer < 0 || 
                        question.correctAnswer >= question.content.en.options.length) {
                        throw new ValidationError(`Question at index ${index} has an invalid correctAnswer`);
                    }
                }
                
                // Add the question to the section
                section.questions.push(question);
                
                // Update section metadata
                section.qCount = section.questions.length;
                section.maxM += (question.posMarks || 1);
                
                // Handle languages in the question
                Object.keys(question.content || {}).forEach(lang => {
                    if (!questionPaper.languages.includes(lang)) {
                        questionPaper.languages.push(lang);
                    }
                });
            }

            // Save the question paper
            await questionPaper.save({ session });

            // If this is a new paper, update the TestSeriesSection
            if (!paperId) {
                await TestSeriesSection.findByIdAndUpdate(
                    sectionId,
                    { 
                        $push: { questionPapers: questionPaper._id },
                        $set: { 
                            'metadata.lastQuestionPaperAdded': new Date(),
                            'metadata.totalQuestions': testSeriesSection.metadata.totalQuestions + (questionPaper.totalQuestions || 0),
                            'metadata.totalMarks': testSeriesSection.metadata.totalMarks + (questionPaper.totalMarks || 0)
                        }
                    },
                    { session }
                );
            }

            await session.commitTransaction();

            res.status(201).json({
                success: true,
                message: `Successfully imported ${questions.length} questions`,
                questionPaperId: questionPaper._id,
                totalQuestions: questionPaper.totalQuestions,
                sections: questionPaper.sections.map(s => ({
                    id: s._id,
                    title: s.title,
                    questionCount: s.questions.length
                }))
            });
        } catch (error) {
            await session.abortTransaction();
            logger.error('ImportJSON error:', {
                error: error.message,
                stack: error.stack,
                params: req.params,
                body: { ...req.body, questions: `[${req.body.questions?.length || 0} items]` }
            });
            res.status(error instanceof ValidationError ? 400 : 500).json({
                    success: false,
                    message: error.message
                });
        } finally {
            session.endSession();
        }
    }
}

module.exports = QuestionPaperController;