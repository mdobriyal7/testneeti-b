const Test = require("../models/Test");
const mongoose = require("mongoose");
const { performance } = require("perf_hooks");

class TestController {
  /**
   * Create a new test with comprehensive validation
   * @param {Object} testData - Complete test configuration data
   * @returns {Object} Created test document
   */
  static async createTest(testData) {
    try {
      console.log(testData.title, testData.duration);
      // Validate required fields
      if (!testData.title || !testData.duration) {
        throw new Error("Test title and duration are mandatory");
      }

      // Validate section configurations
      if (testData.sections && testData.sections.length > 0) {
        testData.sections.forEach((section) => {
          if (!section.title || !section.qCount || !section.time) {
            throw new Error(
              "Each section must have a title, question count, and allocated time"
            );
          }
        });
      }

      // Automatically set some default configurations
      const defaultConfigs = {
        isLive: false,
        isAnalysisGenerated: false,
        createdOn: new Date(),
        languages: testData.languages || ["English"],
        isFree: testData.isFree || false,
      };

      const finalTestData = { ...testData, ...defaultConfigs };

      const newTest = new Test(finalTestData);
      await newTest.validate(); // Mongoose schema validation

      return await newTest.save();
    } catch (error) {
      console.error("Test Creation Error:", error);
      throw new Error(`Failed to create test: ${error.message}`);
    }
  }

  /**
   * Retrieve tests with advanced filtering and pagination
   * @param {Object} filters - Search and filter options
   * @param {Object} options - Pagination and sorting options
   * @returns {Object} Paginated test results
   */
  static async getTests(filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdOn",
        sortOrder = "desc",
      } = options;

      // Dynamic filtering
      const query = {};
      if (filters.course) query.course = filters.course;
      if (filters.isLive !== undefined) query.isLive = filters.isLive;
      if (filters.isFree !== undefined) query.isFree = filters.isFree;

      const totalTests = await Test.countDocuments(query);
      const tests = await Test.find(query)
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-sections.questions"); // Exclude detailed question data

      return {
        tests,
        totalTests,
        currentPage: page,
        totalPages: Math.ceil(totalTests / limit),
      };
    } catch (error) {
      console.error("Fetch Tests Error:", error);
      throw new Error(`Failed to retrieve tests: ${error.message}`);
    }
  }

  /**
   * Retrieve a specific test by its MongoDB document ID with optional selection configurations
   * @param {String} testId - MongoDB document ID of the test
   * @param {Object} options - Optional configuration for selecting fields
   * @returns {Object} Detailed test document
   */
  static async getTestById(testId, options = {}) {
    try {
      // Validate that the provided testId is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(testId)) {
        throw new Error("Invalid test ID");
      }

      // Default options for selecting fields
      const defaultOptions = {
        includeQuestions: false, // Whether to include question details
        selectFields: null, // Optional additional field selection
      };

      // Merge provided options with defaults
      const mergedOptions = { ...defaultOptions, ...options };

      // Construct the selection string
      let selectString = mergedOptions.selectFields || "";

      // Conditionally exclude questions from sections if not requested
      if (!mergedOptions.includeQuestions) {
        selectString += " -sections.questions";
      }

      // Find the test by ID with selective projection
      const test = await Test.findById(testId).select(selectString.trim());

      // Handle case where test is not found
      if (!test) {
        throw new Error("Test not found");
      }

      return test;
    } catch (error) {
      console.error("Get Test by ID Error:", error);
      throw new Error(`Failed to retrieve test: ${error.message}`);
    }
  }

  /**
   * Update an existing test with intelligent merge strategy
   * @param {String} testId - MongoDB document ID
   * @param {Object} updateData - Fields to update
   * @returns {Object} Updated test document
   */
  static async updateTest(testId, updateData) {
    try {
      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(testId)) {
        throw new Error("Invalid test ID");
      }

      // Prevent direct overwrite of critical fields
      const restrictedFields = ["_id", "createdOn"];
      restrictedFields.forEach((field) => {
        if (updateData[field]) delete updateData[field];
      });

      // Intelligent section update strategy
      if (updateData.sections) {
        updateData.sections = updateData.sections.map((section) => {
          // Preserve existing section ID if not provided
          if (!section._id) {
            section._id = new mongoose.Types.ObjectId();
          }
          return section;
        });
      }

      const updatedTest = await Test.findByIdAndUpdate(
        testId,
        { $set: updateData },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedTest) {
        throw new Error("Test not found");
      }

      return updatedTest;
    } catch (error) {
      console.error("Test Update Error:", error);
      throw new Error(`Failed to update test: ${error.message}`);
    }
  }

  /**
   * Delete a test with optional soft delete
   * @param {String} testId - MongoDB document ID
   * @param {Boolean} softDelete - Flag for soft deletion
   * @returns {Object} Deletion result
   */
  static async deleteTest(testId, softDelete = false) {
    try {
      if (!mongoose.Types.ObjectId.isValid(testId)) {
        throw new Error("Invalid test ID");
      }

      if (softDelete) {
        // Implement soft delete if needed
        return await Test.findByIdAndUpdate(
          testId,
          { isLive: false },
          { new: true }
        );
      }

      const deletedTest = await Test.findByIdAndDelete(testId);

      if (!deletedTest) {
        throw new Error("Test not found");
      }

      return {
        message: "Test successfully deleted",
        deletedTestId: testId,
      };
    } catch (error) {
      console.error("Test Deletion Error:", error);
      throw new Error(`Failed to delete test: ${error.message}`);
    }
  }

  /**
   * Generate test statistics and insights
   * @param {String} testId - MongoDB document ID
   * @returns {Object} Test insights and metadata
   */
  static async getTestInsights(testId) {
    try {
      const test = await Test.findById(testId);

      if (!test) throw new Error("Test not found");

      return {
        totalSections: test.sections.length,
        totalQuestions: test.sections.reduce(
          (sum, section) => sum + section.qCount,
          0
        ),
        totalDuration: test.duration,
        cutoffInsights: test.examCutOffs?.overAll || null,
        languagesSupported: test.languages,
        isOptional: test.containOptionalSections,
      };
    } catch (error) {
      console.error("Test Insights Error:", error);
      throw new Error(`Failed to generate test insights: ${error.message}`);
    }
  }

  /**
   * Advanced test recommendation engine
   * Intelligently suggests tests based on user's profile, performance, and learning objectives
   * @param {Object} userProfile - Comprehensive user profile
   * @param {Object} learningGoals - User's learning objectives
   * @returns {Array} Recommended tests
   */
  static async recommendTests(userProfile, learningGoals) {
    try {
      const startTime = performance.now();

      // Intelligent recommendation algorithm
      const recommendationCriteria = {
        difficulty: this.calculateDifficultyMatch(userProfile, learningGoals),
        subjectAlignment: this.calculateSubjectRelevance(
          userProfile,
          learningGoals
        ),
        performanceGap: this.identifySkillGaps(userProfile),
      };

      // Multi-dimensional recommendation query
      const recommendedTests = await Test.aggregate([
        {
          $match: {
            isLive: true,
            isFree: { $in: [true, userProfile.isPremium] },
            course: { $in: learningGoals.interestedCourses },
          },
        },
        {
          $addFields: {
            recommendationScore: {
              $sum: [
                {
                  $multiply: ["$difficulty", recommendationCriteria.difficulty],
                },
                {
                  $multiply: [
                    "$subjectRelevance",
                    recommendationCriteria.subjectAlignment,
                  ],
                },
                {
                  $multiply: [
                    "$skillGapIndicator",
                    recommendationCriteria.performanceGap,
                  ],
                },
              ],
            },
          },
        },
        { $sort: { recommendationScore: -1 } },
        { $limit: 5 },
      ]);

      const endTime = performance.now();

      return {
        tests: recommendedTests,
        processingTime: endTime - startTime,
        recommendationMetrics: recommendationCriteria,
      };
    } catch (error) {
      console.error("Test Recommendation Error:", error);
      throw new Error(`Recommendation generation failed: ${error.message}`);
    }
  }

  /**
   * Advanced test analysis and performance tracking
   * @param {String} testId - Test document ID
   * @param {Array} userResponses - Comprehensive user response data
   * @returns {Object} Detailed test performance analysis
   */
  static async analyzeTestPerformance(testId, userResponses) {
    try {
      const test = await Test.findById(testId);
      if (!test) throw new Error("Test not found");

      const performanceAnalysis = {
        overallScore: 0,
        sectionBreakdown: {},
        intelligentInsights: {},
        weaknessIdentification: {},
      };

      // Detailed section-wise performance analysis
      test.sections.forEach((section) => {
        const sectionResponses = userResponses.filter(
          (response) => response.sectionId === section._id.toString()
        );

        const sectionPerformance = this.calculateSectionPerformance(
          section,
          sectionResponses
        );

        performanceAnalysis.sectionBreakdown[section.title] =
          sectionPerformance;
      });

      // Intelligent weakness identification
      performanceAnalysis.weaknessIdentification =
        this.identifyLearningWeaknesses(performanceAnalysis.sectionBreakdown);

      // Advanced scoring and percentile calculation
      performanceAnalysis.overallScore = this.calculateOverallScore(
        performanceAnalysis.sectionBreakdown
      );

      return performanceAnalysis;
    } catch (error) {
      console.error("Test Performance Analysis Error:", error);
      throw new Error(`Performance analysis failed: ${error.message}`);
    }
  }

  /**
   * Intelligent test cloning with advanced configuration options
   * @param {String} sourceTestId - Original test to clone
   * @param {Object} cloneOptions - Cloning configuration
   * @returns {Object} Newly created test
   */
  static async cloneTestIntelligently(sourceTestId, cloneOptions = {}) {
    try {
      const sourceTest = await Test.findById(sourceTestId);
      if (!sourceTest) throw new Error("Source test not found");

      // Deep clone with intelligent modifications
      const clonedTestConfig = JSON.parse(JSON.stringify(sourceTest));

      // Apply clone modifications
      delete clonedTestConfig._id;
      clonedTestConfig.title =
        cloneOptions.newTitle ||
        `Clone of ${sourceTest.title} - ${new Date().toLocaleDateString()}`;

      // Intelligent section randomization
      if (cloneOptions.randomizeSections) {
        clonedTestConfig.sections = this.randomizeSections(
          clonedTestConfig.sections
        );
      }

      // Optional difficulty adjustment
      if (cloneOptions.difficultyShift) {
        this.adjustTestDifficulty(
          clonedTestConfig,
          cloneOptions.difficultyShift
        );
      }

      return await this.createTest(clonedTestConfig);
    } catch (error) {
      console.error("Intelligent Test Cloning Error:", error);
      throw new Error(`Test cloning failed: ${error.message}`);
    }
  }

  // Placeholder methods for advanced features (would be implemented with complex logic)
  static calculateDifficultyMatch() {
    /* Implementation */
  }
  static calculateSubjectRelevance() {
    /* Implementation */
  }
  static identifySkillGaps() {
    /* Implementation */
  }
  static generateIntelligentSections() {
    /* Implementation */
  }
  static calibrateDifficulty() {
    /* Implementation */
  }
  static calculateSectionPerformance() {
    /* Implementation */
  }
  static identifyLearningWeaknesses() {
    /* Implementation */
  }
  static calculateOverallScore() {
    /* Implementation */
  }
  static randomizeSections() {
    /* Implementation */
  }
  static adjustTestDifficulty() {
    /* Implementation */
  }
}

module.exports = TestController;
