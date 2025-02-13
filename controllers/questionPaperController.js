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

            const invalidSections = sections.filter(section => 
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
                sections: sections.map(section => {
                    console.log('Processing section:', section);
                    const testSection = test.sections.find(s => s._id?.toString() === section._id);
                    console.log('Found test section:', testSection);
                    if (!testSection) {
                        throw new ValidationError(`Test section not found for section: ${section._id}`);
                    }
                    return {
                        title: testSection.title,
                        duration: testSection.time || 30, // Map time to duration
                        maxMarks: testSection.maxM || 0, // Map maxM to maxMarks
                        qCount: testSection.qCount || 0,
                        isQualifyingSection: testSection.isQualifyingSection || false,
                        instructions: Array.isArray(testSection.instructions) 
                            ? testSection.instructions.filter(Boolean)  // Keep it as array, just filter out empty strings
                            : [], // Default to empty array if not provided
                        SSSNo: testSection.SSSNo || 1,
                        SSNo: testSection.SSNo || 1,
                        langFilteredQuestions: testSection.langFilteredQuestions || false,
                        hasOptionalQuestions: testSection.hasOptionalQuestions || false,
                        isOptional: testSection.isOptional || false,
                        isTimeShared: testSection.isTimeShared || false,
                        questions: [],
                        settings: {
                            shuffleQuestions: section.settings?.shuffleQuestions ?? true,
                            showCalculator: section.settings?.showCalculator ?? test.showCalculator,
                            sectionTimeShared: section.settings?.sectionTimeShared ?? testSection.isTimeShared,
                            isOptional: section.settings?.isOptional ?? testSection.isOptional,
                            hasOptionalQuestions: section.settings?.hasOptionalQuestions ?? testSection.hasOptionalQuestions,
                            isQualifyingSection: section.settings?.isQualifyingSection ?? testSection.isQualifyingSection
                        }
                    };
                }),
                languages: languages || test.languages,
                showCalculator: showCalculator ?? test.showCalculator,
                isFree: isFree ?? false,
                isActive: isActive ?? true,
                metadata: {
                    createdBy: req.user?._id || new mongoose.Types.ObjectId()
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
            const updates = req.body;

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

            // Apply updates
            Object.assign(paper, updates);
            paper.metadata.lastModifiedBy = req.user._id;

            // Save changes
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
}

module.exports = QuestionPaperController;