const TestTemplate = require("../models/TestTemplate");
const Test = require("../models/Test");
const { ValidationError, NotFoundError } = require("../utils/errors");
const logger = require("../config/logger");
const mongoose = require("mongoose");

// Import test settings and create template
const importTestSettings = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { sectionId } = req.params;
    const { testId, title, description, importType, sections = [] } = req.body;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      throw new ValidationError("Invalid testId format");
    }

    // Get source test and section
    const [sourceTest, section] = await Promise.all([
      Test.findById(testId),
      mongoose.model('TestSeriesSection').findById(sectionId)
    ]);

    if (!sourceTest) {
      throw new NotFoundError("Source test not found");
    }
    if (!section) {
      throw new NotFoundError("Section not found");
    }

    // Prepare template settings
    let templateSettings = {
      duration: sourceTest.duration,
      totalQuestions: sourceTest.sections.reduce((acc, s) => acc + s.qCount, 0),
      maxMarks: sourceTest.sections.reduce((acc, s) => acc + s.maxM, 0),
      sectionTimeSharedFlag: sourceTest.sectionTimeSharedFlag,
      isSectionalSubmit: sourceTest.isSectionalSubmit,
      skipDuration: sourceTest.skipDuration,
      showCalculator: sourceTest.showCalculator,
      showNormalCalculator: sourceTest.showNormalCalculator,
      ContainMAMCQ: sourceTest.ContainMAMCQ,
      languages: sourceTest.languages,
      analysisAfter: sourceTest.analysisAfter,
      containOptionalSections: sourceTest.containOptionalSections,
      instructions: sourceTest.instructions,
      hasSectionalRank: sourceTest.hasSectionalRank,
    };

    // Handle section import
    if (importType === "section") {
      templateSettings.sections = sourceTest.sections.filter((section) =>
        sections.includes(section.SSNo)
      );

      // Recalculate totals for selected sections
      templateSettings.totalQuestions = templateSettings.sections.reduce(
        (acc, s) => acc + s.qCount,
        0
      );
      templateSettings.maxMarks = templateSettings.sections.reduce(
        (acc, s) => acc + s.maxM,
        0
      );
      templateSettings.duration = templateSettings.sections.reduce(
        (acc, s) => acc + s.time,
        0
      );
    } else {
      templateSettings.sections = sourceTest.sections;
    }

    // Create template without testSeriesId
    const template = new TestTemplate({
      sectionId,
      title: title || sourceTest.title,
      description: description || `Template created from ${sourceTest.title}`,
      sourceTestId: testId,
      settings: templateSettings,
      isActive: true,
    });

    await template.save({ session });
    await session.commitTransaction();

    logger.info(`Template created successfully from test: ${testId}`);
    res.status(201).json(template);
  } catch (error) {
    await session.abortTransaction();
    logger.error(`Import Test Settings Error: ${error.message}`, {
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

// Get all templates for a section
const getTemplates = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const templates = await TestTemplate.find({ sectionId }).sort({ createdAt: -1 });

    res.json(templates);
  } catch (error) {
    logger.error(`Get Templates Error: ${error.message}`, {
      params: req.params,
      stack: error.stack,
    });
    res.status(500).json({
      error: error.message,
      type: error.name,
    });
  }
};

// Get single template
const getTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = await TestTemplate.findById(templateId);

    if (!template) {
      throw new NotFoundError("Template not found");
    }

    res.json(template);
  } catch (error) {
    logger.error(`Get Template Error: ${error.message}`, {
      templateId: req.params.templateId,
      stack: error.stack,
    });
    res.status(error.status || 400).json({
      error: error.message,
      type: error.name,
    });
  }
};

// Update template
const updateTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const updateData = req.body;

    const template = await TestTemplate.findByIdAndUpdate(
      templateId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!template) {
      throw new NotFoundError("Template not found");
    }

    logger.info(`Template updated successfully: ${templateId}`);
    res.json(template);
  } catch (error) {
    logger.error(`Update Template Error: ${error.message}`, {
      templateId: req.params.templateId,
      body: req.body,
      stack: error.stack,
    });
    res.status(error.status || 400).json({
      error: error.message,
      type: error.name,
    });
  }
};

// Delete template
const deleteTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = await TestTemplate.findByIdAndDelete(templateId);

    if (!template) {
      throw new NotFoundError("Template not found");
    }

    logger.info(`Template deleted successfully: ${templateId}`);
    res.json({
      message: "Template deleted successfully",
      id: templateId,
    });
  } catch (error) {
    logger.error(`Delete Template Error: ${error.message}`, {
      templateId: req.params.templateId,
      stack: error.stack,
    });
    res.status(error.status || 400).json({
      error: error.message,
      type: error.name,
    });
  }
};

module.exports = {
  importTestSettings,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
};
