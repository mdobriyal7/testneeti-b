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
      console.log("Creating test with data:", testData);
      
      // Validate required fields
      if (!testData.title || testData.title.trim() === '') {
        throw new Error("Test title is required and cannot be empty");
      }
      
      // Convert and validate duration
      const duration = Number(testData.duration);
      if (isNaN(duration) || duration <= 0) {
        throw new Error("Test duration must be a positive number");
      }
      testData.duration = duration;

      // Convert and validate maxM
      const maxM = Number(testData.maxM);
      if (isNaN(maxM) || maxM <= 0) {
        throw new Error("Maximum marks must be a positive number");
      }
      testData.maxM = maxM;

      // Validate section configurations
      if (testData.sections && testData.sections.length > 0) {
        testData.sections.forEach((section, index) => {
          if (!section.title || section.title.trim() === '') {
            throw new Error(`Section ${index + 1} must have a title`);
          }
          
          // Convert and validate qCount
          const qCount = Number(section.qCount);
          if (isNaN(qCount) || qCount <= 0) {
            throw new Error(`Section ${index + 1} must have a positive question count`);
          }
          section.qCount = qCount;
          
          // Convert and validate time
          const time = Number(section.time);
          if (isNaN(time) || time <= 0) {
            throw new Error(`Section ${index + 1} must have a positive time allocation`);
          }
          section.time = time;

          // Convert and validate section maxM
          const sectionMaxM = Number(section.maxM);
          if (isNaN(sectionMaxM) || sectionMaxM <= 0) {
            throw new Error(`Section ${index + 1} must have a positive maximum marks`);
          }
          section.maxM = sectionMaxM;
        });
      }

      // Set default configurations
      const defaultConfigs = {
        isFree: testData.isFree || false,
        createdOn: new Date(),
        languages: testData.languages || ["English"],
      };

      const finalTestData = { ...testData, ...defaultConfigs };
      const newTest = new Test(finalTestData);
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
      const { page = 1, limit = 10, sortBy = "createdOn", sortOrder = "desc" } = options;

      const query = {};
      if (filters.examId) query.examid = filters.examId;
      if (filters.isFree !== undefined) query.isFree = filters.isFree;

      const totalTests = await Test.countDocuments(query);
      const tests = await Test.find(query)
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-sections.questions");

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
  static async getTestById(testId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(testId)) {
        throw new Error("Invalid test ID");
      }

      const test = await Test.findById(testId);
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
      if (!mongoose.Types.ObjectId.isValid(testId)) {
        throw new Error("Invalid test ID");
      }

      // Prevent modification of critical fields
      const restrictedFields = ["_id", "createdOn"];
      restrictedFields.forEach(field => {
        if (updateData[field]) delete updateData[field];
      });

      const updatedTest = await Test.findByIdAndUpdate(
        testId,
        { $set: updateData },
        { new: true, runValidators: true }
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
  static async deleteTest(testId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(testId)) {
        throw new Error("Invalid test ID");
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

  // Get tests by exam ID
  static async getTestsByExamId(req, res) {
    try {
      const { examId } = req.params;
      console.log("Fetching tests for examId:", examId); // Debug log

      // Validate examId
      if (!examId) {
        return res.status(400).json({
          success: false,
          message: "Exam ID is required",
        });
      }

      // Find all tests for the given exam
      const tests = await Test.find({ examid: examId })
        .select("_id title description")
        .lean();

      console.log("Found tests:", tests); // Debug log

      return res.status(200).json({
        success: true,
        tests,
      });
    } catch (error) {
      console.error("Error in getTestsByExamId:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Get all tests with pagination
  static async getTests(req, res) {
    try {
      const { page = 1, limit = 10, ...filters } = req.query;
      const query = {};

      if (filters.examId) query.examId = filters.examId;
      if (filters.isFree !== undefined) query.isFree = filters.isFree;

      const totalTests = await Test.countDocuments(query);
      const tests = await Test.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-sections.questions")
        .lean();

      return res.status(200).json({
        success: true,
        tests,
        totalTests,
        currentPage: page,
        totalPages: Math.ceil(totalTests / limit),
      });
    } catch (error) {
      console.error("Error in getTests:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Get test by ID
  static async getTestById(req, res) {
    try {
      const { id } = req.params;
      const test = await Test.findById(id).lean();

      if (!test) {
        return res.status(404).json({
          success: false,
          message: "Test not found",
        });
      }

      return res.status(200).json({
        success: true,
        test,
      });
    } catch (error) {
      console.error("Error in getTestById:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
}

module.exports = TestController;
