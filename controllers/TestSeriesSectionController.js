const TestSeriesSection = require("../models/TestSeriesSection");
const TestSeries = require("../models/TestSeries");
const { ValidationError, NotFoundError } = require("../utils/errors");
const logger = require("../config/logger");
const mongoose = require("mongoose");

// First define all the methods separately
const createSection = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { testSeriesId } = req.params;
    const { title, description, settings, order, testId } = req.body;

    // Validate testSeriesId
    if (!mongoose.Types.ObjectId.isValid(testSeriesId)) {
      throw new ValidationError("Invalid testSeriesId format");
    }

    // Validate testId
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      throw new ValidationError("Invalid testId format");
    }

    // Check if test series exists
    const testSeries = await TestSeries.findById(testSeriesId);
    if (!testSeries) {
      throw new NotFoundError("Test series not found");
    }

    // Check if test exists and validate section title
    const Test = mongoose.model("Test");
    const test = await Test.findById(testId);
    if (!test) {
      throw new NotFoundError("Referenced test not found");
    }

    // Create section using the correct model
    const section = new TestSeriesSection({
      testSeriesId,
      testId,
      title,
      description,
      settings: {
        inheritTestProperties: false,
        allowPartialInheritance: false,
        overrideTestSettings: false,
        customization: {
          shuffleQuestions: true,
          showCalculator: null,
          sectionTimeShared: null,
        },
        ...settings,
      },
      order:
        order || (await TestSeriesSection.countDocuments({ testSeriesId })) + 1,
      questionPapers: [],
      isActive: true,
    });

    // Save the section
    await section.save({ session });

    await session.commitTransaction();

    logger.info(
      `Section created successfully for test series: ${testSeriesId}`
    );
    res.status(201).json(section);
  } catch (error) {
    await session.abortTransaction();
    logger.error(`Create Section Error: ${error.message}`, {
      testSeriesId: req.params.testSeriesId,
      body: req.body,
      stack: error.stack,
    });
    res.status(error.status || 400).json({
      error: error.message,
      type: error.name,
    });
  } finally {
    session.endSession();
  }
};

const addQuestionPaper = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const questionPaperData = req.body;

    // Validate sectionId
    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      throw new ValidationError("Invalid sectionId format");
    }

    const section = await TestSeriesSection.findById(sectionId);
    if (!section) {
      throw new NotFoundError("Section not found");
    }

    // Add question paper to section
    section.questionPapers.push(questionPaperData);
    await section.save();

    logger.info(`Question paper added to section: ${sectionId}`);
    res.json(section);
  } catch (error) {
    logger.error(`Add Question Paper Error: ${error.message}`, {
      sectionId: req.params.sectionId,
      body: req.body,
      stack: error.stack,
    });
    res.status(error.status || 400).json({
      error: error.message,
      type: error.name,
    });
  }
};

const getSection = async (req, res) => {
  try {
    const { sectionId } = req.params;

    // Validate sectionId
    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      throw new ValidationError("Invalid sectionId format");
    }

    const section = await TestSeriesSection.findById(sectionId).populate(
      "testSeriesId",
      "title description"
    );

    if (!section) {
      throw new NotFoundError("Section not found");
    }

    res.json(section);
  } catch (error) {
    logger.error(`Get Section Error: ${error.message}`, {
      sectionId: req.params.sectionId,
      stack: error.stack,
    });
    res.status(error.status || 400).json({
      error: error.message,
      type: error.name,
    });
  }
};

const updateSection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const updateData = req.body;

    // Validate sectionId
    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      throw new ValidationError("Invalid sectionId format");
    }

    const section = await TestSeriesSection.findByIdAndUpdate(
      sectionId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!section) {
      throw new NotFoundError("Section not found");
    }

    logger.info(`Section updated successfully: ${sectionId}`);
    res.json(section);
  } catch (error) {
    logger.error(`Update Section Error: ${error.message}`, {
      sectionId: req.params.sectionId,
      body: req.body,
      stack: error.stack,
    });
    res.status(error.status || 400).json({
      error: error.message,
      type: error.name,
    });
  }
};

const deleteSection = async (req, res) => {
  try {
    const { sectionId } = req.params;

    // Validate sectionId
    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      throw new ValidationError("Invalid sectionId format");
    }

    const section = await TestSeriesSection.findByIdAndDelete(sectionId);

    if (!section) {
      throw new NotFoundError("Section not found");
    }

    logger.info(`Section deleted successfully: ${sectionId}`);
    res.json({
      message: "Section deleted successfully",
      id: sectionId,
    });
  } catch (error) {
    logger.error(`Delete Section Error: ${error.message}`, {
      sectionId: req.params.sectionId,
      stack: error.stack,
    });
    res.status(error.status || 400).json({
      error: error.message,
      type: error.name,
    });
  }
};

// Get all sections for a test series
const getSections = async (req, res) => {
    try {
        const { testSeriesId } = req.params;

        // Validate testSeriesId
        if (!mongoose.Types.ObjectId.isValid(testSeriesId)) {
            throw new ValidationError("Invalid testSeriesId format");
        }

        // Check if test series exists
        const testSeries = await TestSeries.findById(testSeriesId);
        if (!testSeries) {
            throw new NotFoundError("Test series not found");
        }

        // Find all sections for the test series with proper population
        const sections = await TestSeriesSection.find({ testSeriesId })
            .populate('testId', 'title description')
            .sort({ order: 1 })
            .lean();

        // Get analytics for sections
        const sectionsWithAnalytics = await Promise.all(sections.map(async (section) => {
            const analytics = await TestSeriesSection.getSectionsWithAnalytics(section._id);
            return {
                ...section,
                analytics: analytics[0]?.analytics || {
                    totalQuestionPapers: 0,
                    activeQuestionPapers: 0,
                    totalAttempts: 0
                }
            };
        }));

        return res.json({
            success: true,
            sections: sectionsWithAnalytics,
            metadata: {
                totalSections: sections.length,
                activeSections: sections.filter(s => s.isActive).length
            }
        });
    } catch (error) {
        logger.error("Error in getSections:", {
            error: error.message,
            stack: error.stack,
            params: req.params
        });
        return res.status(error.status || 500).json({
            success: false,
            error: error.message
        });
    }
};

// Then export them directly
module.exports = {
  createSection,
  addQuestionPaper,
  getSection,
  updateSection,
  deleteSection,
  getSections,
};
