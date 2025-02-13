const TestSeries = require("../models/TestSeries");
const TestSeriesSection = require("../models/TestSeriesSection");
const Course = require("../models/Course");
const Exam = require("../models/Exam");
const mongoose = require("mongoose");
const { ValidationError } = require("../utils/errors");
const cache = require("../utils/cache");
const logger = require("../config/logger");

const TestSeriesController = {
  validateTestSeries: async (req, res, next) => {
    try {
      console.log("Request Body:", JSON.stringify(req.body, null, 2));

      // Required fields validation with detailed messages
      const requiredFields = {
        title: "Test series title",
        courseId: "Course ID",
        examId: "Exam ID",
        price: "Price",
      };

      const missingFields = Object.entries(requiredFields)
        .filter(([key]) => {
          const value = key === "price" ? req.body.price : req.body[key];
          console.log(`Checking ${key}:`, value);
          return !value && value !== 0;
        })
        .map(([, label]) => label);

      if (missingFields.length > 0) {
        throw new ValidationError(
          `Missing required fields: ${missingFields.join(", ")}`
        );
      }

      // Validate ObjectIds
      const invalidIds = [];
      if (!mongoose.Types.ObjectId.isValid(req.body.courseId))
        invalidIds.push("courseId");
      if (!mongoose.Types.ObjectId.isValid(req.body.examId))
        invalidIds.push("examId");
      if (invalidIds.length > 0) {
        throw new ValidationError(
          `Invalid format for: ${invalidIds.join(", ")}`
        );
      }

      // Check if course and exam exist and are active
      const [course, exam] = await Promise.all([
        Course.findById(req.body.courseId).select("isActive title").lean(),
        Exam.findById(req.body.examId).select("isActive title").lean(),
      ]);

      const notFound = [];
      if (!course) notFound.push("Course");
      if (!exam) notFound.push("Exam");
      if (notFound.length > 0) {
        throw new ValidationError(`${notFound.join(" and ")} not found`);
      }

      // Check if course and exam are active
      const inactive = [];
      if (!course?.isActive) inactive.push(course.title);
      if (!exam?.isActive) inactive.push(exam.title);

      if (inactive.length > 0) {
        throw new ValidationError(
          `Cannot create test series for inactive ${inactive.join(" and ")}`
        );
      }

      // Validate numeric fields
      if (req.body.price < 0) {
        throw new ValidationError("Price cannot be negative");
      }

      // Generate slug from title
      const slug = req.body.title
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      // Check slug uniqueness
      console.log("Checking for existing test series with slug:", slug);
      const existingTestSeries = await TestSeries.findOne({
        "details.slug": slug,
        _id: { $ne: req.params?.id }, // Only exclude if we have an ID (for updates)
      }).lean();

      // Log the result of the query
      console.log("Existing Test Series:", existingTestSeries);

      if (existingTestSeries) {
        throw new ValidationError(`Slug '${slug}' is already in use`);
      }

      // Add metadata to request
      req.validatedData = {
        course,
        exam,
        slug,
      };

      next();
    } catch (error) {
      logger.error(`Validation Error: ${error.message}`, {
        stack: error.stack,
        body: req.body,
      });
      res.status(error.status || 400).json({
        error: error.message,
        type: error.name,
      });
    }
  },

  cacheMiddleware: async (req, res, next) => {
    try {
      const cacheKey = `test-series:${req.params.id}`;
      const cachedData = await cache.get(cacheKey);

      if (cachedData) {
        logger.info(`Cache hit for test series ${req.params.id}`);
        return res.json(JSON.parse(cachedData));
      }

      req.cacheKey = cacheKey;
      next();
    } catch (error) {
      logger.error(`Cache Error: ${error.message}`);
      next(); // Continue without cache on error
    }
  },

  create: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { course, exam, slug } = req.validatedData;
      console.log("Validated Data:", req.validatedData);

      // Prepare test series data according to schema
      const testSeriesData = {
        details: {
          id: new mongoose.Types.ObjectId().toString(),
          name: req.body.title,
          languages: req.body.details?.languages || [],
          sections: req.body.details?.sections || [],
          paidTestCount:
            req.body.details?.sections?.reduce(
              (sum, section) => sum + (section.paidTestCount || 0),
              0
            ) || 0,
          freeTestCount:
            req.body.details?.sections?.reduce(
              (sum, section) => sum + (section.freeTestCount || 0),
              0
            ) || 0,
          slug: slug, // Use the validated slug directly
          isFree: req.body.details?.isFree || false,
          isActive: true,
          totalAttempts: 0,
          price: req.body.price,
        },
        courseId: course._id,
        examId: exam._id,
        studentStats: {
          testsAttempted: 0,
        },
      };

      console.log(
        "Creating test series with data:",
        JSON.stringify(testSeriesData, null, 2)
      );

      // Create test series
      const [testSeries] = await TestSeries.create([testSeriesData], {
        session,
      });

      // Log the creation with relevant details
      logger.info(`Test series created`, {
        id: testSeries._id,
        title: testSeriesData.details.name,
        course: course.title,
        exam: exam.title,
        sections: testSeriesData.details.sections?.length || 0,
      });

      await session.commitTransaction();

      // Get complete test series with populated references
      const completeTestSeries = await TestSeries.findById(testSeries._id)
        .populate("courseId", "title description isActive")
        .populate("examId", "title description isActive");

      res.status(201).json(completeTestSeries);
    } catch (error) {
      await session.abortTransaction();
      logger.error(`Create Error: ${error.message}`, {
        stack: error.stack,
        body: req.body,
      });
      res.status(400).json({
        error: error.message,
        type: error.name,
      });
    } finally {
      session.endSession();
    }
  },

  get: async (req, res) => {
    try {
      // Validate ID format first
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ValidationError("Invalid test series ID format");
      }

      const testSeries = await TestSeries.findById(req.params.id)
        .populate("courseId", "name description isActive")
        .populate("examId", "name description isActive")
        .lean(); // Use lean() for better performance since we don't need mongoose document

      if (!testSeries) {
        throw new ValidationError("Test series not found", 404);
      }

      // Add computed fields
      const computedData = {
        totalTests:
          testSeries.details.paidTestCount + testSeries.details.freeTestCount,
        completionRate:
          testSeries.details.totalAttempts > 0
            ? (
                (testSeries.studentStats.testsAttempted /
                  testSeries.details.totalAttempts) *
                100
              ).toFixed(2)
            : 0,
        isAvailable:
          testSeries.details.isActive &&
          testSeries.courseId.isActive &&
          testSeries.examId.isActive,
      };

      const enrichedTestSeries = {
        ...testSeries,
        computed: computedData,
      };

      // Cache the result with computed data
      if (req.cacheKey) {
        await cache.set(
          req.cacheKey,
          JSON.stringify(enrichedTestSeries),
          3600 // 1 hour
        );
        logger.debug(`Cache set for test series ${req.params.id}`);
      }

      res.json(enrichedTestSeries);
    } catch (error) {
      logger.error(`Get Error: ${error.message}`, {
        id: req.params.id,
        stack: error.stack,
      });
      res.status(error.status || 400).json({
        error: error.message,
        type: error.name,
      });
    }
  },

  getByCourseAndExam: async (req, res) => {
    try {
      const {
        courseId,
        examId,
        page = 1,
        limit = 10,
        sort = "-createdAt",
        search,
        language,
        minPrice,
        maxPrice,
        isActive,
      } = req.query;

      // Build advanced query
      const query = {};
      const filters = [];

      // Handle course and exam filtering
      if (courseId) {
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
          throw new ValidationError("Invalid courseId format");
        }
        filters.push({ courseId: mongoose.Types.ObjectId(courseId) });
      }

      if (examId) {
        if (!mongoose.Types.ObjectId.isValid(examId)) {
          throw new ValidationError("Invalid examId format");
        }
        filters.push({ examId: mongoose.Types.ObjectId(examId) });
      }

      // Handle text search
      if (search) {
        filters.push({
          $or: [
            { "details.name": { $regex: search, $options: "i" } },
            { "details.slug": { $regex: search, $options: "i" } },
          ],
        });
      }

      // Handle language filter
      if (language) {
        filters.push({ "details.languages": language });
      }

      // Handle price range
      if (minPrice !== undefined || maxPrice !== undefined) {
        const priceFilter = {};
        if (minPrice !== undefined) priceFilter.$gte = Number(minPrice);
        if (maxPrice !== undefined) priceFilter.$lte = Number(maxPrice);
        filters.push({ "details.price": priceFilter });
      }

      // Handle active status
      if (isActive !== undefined) {
        filters.push({ "details.isActive": isActive === "true" });
      }

      // Combine all filters
      if (filters.length > 0) {
        query.$and = filters;
      }

      // Calculate skip value for pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Prepare sort object
      let sortObj = {};
      if (sort === "-createdAt") {
        sortObj = { createdAt: -1 };
      } else if (sort.startsWith("-")) {
        sortObj[`details.${sort.substring(1)}`] = -1;
      } else {
        sortObj[`details.${sort}`] = 1;
      }

      // Execute query with pagination
      const [total, testSeries] = await Promise.all([
        TestSeries.countDocuments(query),
        TestSeries.find(query)
          .populate("courseId", "name description isActive")
          .populate("examId", "name description isActive")
          .sort(sortObj)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
      ]);

      // Enrich results with computed fields
      const enrichedTestSeries = testSeries.map((ts) => ({
        ...ts,
        computed: {
          totalTests: ts.details.paidTestCount + ts.details.freeTestCount,
          completionRate:
            ts.details.totalAttempts > 0
              ? (
                  (ts.studentStats.testsAttempted / ts.details.totalAttempts) *
                  100
                ).toFixed(2)
              : 0,
          isAvailable:
            ts.details.isActive && ts.courseId.isActive && ts.examId.isActive,
        },
      }));

      res.json({
        data: enrichedTestSeries,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
        },
        filters: {
          applied: Object.keys(query.$and || {}).length,
        },
      });
    } catch (error) {
      logger.error(`Query Error: ${error.message}`, {
        query: req.query,
        stack: error.stack,
      });
      res.status(error.status || 400).json({
        error: error.message,
        type: error.name,
      });
    }
  },

  update: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { course, exam } = req.validatedData;

      // Prepare update data with intelligent handling of nested fields
      const updateData = {
        $set: {
          courseId: course._id,
          examId: exam._id,
        },
      };

      // Handle details fields individually to avoid overwriting unspecified fields
      const detailsFields = [
        "name",
        "languages",
        "sections",
        "price",
        "slug",
        "isFree",
        "isActive",
      ];

      detailsFields.forEach((field) => {
        if (req.body.details?.[field] !== undefined) {
          updateData.$set[`details.${field}`] = req.body.details[field];
        }
      });

      // Recalculate test counts if sections are updated
      if (req.body.details?.sections) {
        updateData.$set["details.paidTestCount"] =
          req.body.details.sections.reduce(
            (sum, section) => sum + (section.paidTestCount || 0),
            0
          );
        updateData.$set["details.freeTestCount"] =
          req.body.details.sections.reduce(
            (sum, section) => sum + (section.freeTestCount || 0),
            0
          );
      }

      // Update test series with optimistic concurrency control
      const testSeries = await TestSeries.findOneAndUpdate(
        {
          _id: req.params.id,
          __v: req.body.__v, // Ensure version matches
        },
        updateData,
        {
          new: true,
          session,
          runValidators: true,
          lean: true,
        }
      );

      if (!testSeries) {
        throw new ValidationError(
          "Test series not found or has been modified. Please refresh and try again.",
          404
        );
      }

      await session.commitTransaction();

      // Invalidate cache
      await cache.del(`test-series:${req.params.id}`);

      // Get updated test series with computed fields
      const computedData = {
        totalTests:
          testSeries.details.paidTestCount + testSeries.details.freeTestCount,
        completionRate:
          testSeries.details.totalAttempts > 0
            ? (
                (testSeries.studentStats.testsAttempted /
                  testSeries.details.totalAttempts) *
                100
              ).toFixed(2)
            : 0,
        isAvailable:
          testSeries.details.isActive && course.isActive && exam.isActive,
      };

      const enrichedTestSeries = {
        ...testSeries,
        courseId: course,
        examId: exam,
        computed: computedData,
      };

      logger.info(`Test series updated successfully`, {
        id: testSeries._id,
        name: testSeries.details.name,
        updatedFields: Object.keys(updateData.$set),
      });

      res.json(enrichedTestSeries);
    } catch (error) {
      await session.abortTransaction();
      logger.error(`Update Error: ${error.message}`, {
        id: req.params.id,
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
  },

  updateStudentStats: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { testSeriesId, studentId } = req.params;
      const { score, timeTaken, questionsAttempted } = req.body;

      // Validate IDs
      if (
        !mongoose.Types.ObjectId.isValid(testSeriesId) ||
        !mongoose.Types.ObjectId.isValid(studentId)
      ) {
        throw new ValidationError("Invalid testSeriesId or studentId format");
      }

      // Validate stats data
      if (score < 0 || timeTaken < 0 || questionsAttempted < 0) {
        throw new ValidationError("Invalid statistics values");
      }

      // Update test series stats atomically
      const testSeries = await TestSeries.findOneAndUpdate(
        { _id: testSeriesId },
        {
          $inc: {
            "studentStats.testsAttempted": 1,
            "details.totalAttempts": 1,
          },
          $max: {
            "studentStats.highestScore": score,
          },
          $avg: {
            "studentStats.averageTimeTaken": timeTaken,
            "studentStats.averageQuestionsAttempted": questionsAttempted,
          },
        },
        { new: true, session, lean: true }
      );

      if (!testSeries) {
        throw new ValidationError("Test series not found", 404);
      }

      await session.commitTransaction();

      // Invalidate cache
      await cache.del(`test-series:${testSeriesId}`);

      // Log the stats update
      logger.info(`Student stats updated`, {
        testSeriesId,
        studentId,
        score,
        timeTaken,
        questionsAttempted,
      });

      res.json({
        message: "Student stats updated successfully",
        testSeries,
      });
    } catch (error) {
      await session.abortTransaction();
      logger.error(`Update Student Stats Error: ${error.message}`, {
        testSeriesId: req.params.testSeriesId,
        studentId: req.params.studentId,
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
  },

  deleteTestSeries: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Delete test series and its sections
      const [testSeries] = await Promise.all([
        TestSeries.findByIdAndDelete(req.params.id, { session }),
        TestSeriesSection.deleteMany(
          { testSeriesId: req.params.id },
          { session }
        ),
      ]);

      if (!testSeries) {
        throw new ValidationError("Test series not found", 404);
      }

      await session.commitTransaction();

      // Invalidate cache
      await cache.del(`test-series:${req.params.id}`);

      logger.info(`Test series deleted successfully: ${req.params.id}`);
      res.json({
        message: "Test series deleted successfully",
        id: req.params.id,
      });
    } catch (error) {
      await session.abortTransaction();
      logger.error(`Delete Error: ${error.message}`, {
        id: req.params.id,
        stack: error.stack,
      });
      res.status(error.status || 400).json({
        error: error.message,
        type: error.name,
      });
    } finally {
      session.endSession();
    }
  },

  getAnalytics: async (req, res) => {
    try {
      const { courseId, examId, startDate, endDate } = req.query;

      // Build match stage for aggregation
      const matchStage = {};
      if (courseId) {
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
          throw new ValidationError("Invalid courseId format");
        }
        matchStage.courseId = mongoose.Types.ObjectId(courseId);
      }
      if (examId) {
        if (!mongoose.Types.ObjectId.isValid(examId)) {
          throw new ValidationError("Invalid examId format");
        }
        matchStage.examId = mongoose.Types.ObjectId(examId);
      }
      if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
      }

      const analytics = await TestSeries.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalTestSeries: { $sum: 1 },
            activeTestSeries: {
              $sum: { $cond: ["$details.isActive", 1, 0] },
            },
            totalAttempts: { $sum: "$details.totalAttempts" },
            averagePrice: { $avg: "$details.price" },
            totalPaidTests: { $sum: "$details.paidTestCount" },
            totalFreeTests: { $sum: "$details.freeTestCount" },
            averageTestsPerSeries: {
              $avg: {
                $add: ["$details.paidTestCount", "$details.freeTestCount"],
              },
            },
            popularLanguages: {
              $addToSet: "$details.languages",
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalTestSeries: 1,
            activeTestSeries: 1,
            totalAttempts: 1,
            averagePrice: { $round: ["$averagePrice", 2] },
            totalPaidTests: 1,
            totalFreeTests: 1,
            averageTestsPerSeries: { $round: ["$averageTestsPerSeries", 2] },
            popularLanguages: {
              $reduce: {
                input: "$popularLanguages",
                initialValue: [],
                in: { $setUnion: ["$$value", "$$this"] },
              },
            },
            activePercentage: {
              $multiply: [
                { $divide: ["$activeTestSeries", "$totalTestSeries"] },
                100,
              ],
            },
          },
        },
      ]);

      res.json(
        analytics[0] || {
          totalTestSeries: 0,
          activeTestSeries: 0,
          totalAttempts: 0,
          averagePrice: 0,
          totalPaidTests: 0,
          totalFreeTests: 0,
          averageTestsPerSeries: 0,
          popularLanguages: [],
          activePercentage: 0,
        }
      );
    } catch (error) {
      logger.error(`Analytics Error: ${error.message}`, {
        query: req.query,
        stack: error.stack,
      });
      res.status(error.status || 500).json({
        error: error.message,
        type: error.name,
      });
    }
  },

  getAllTestSeries: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        sort = "-createdAt",
        search,
        isActive,
        language,
        priceRange,
        courseId,
        examId,
        includeCourse,
        includeExam,
      } = req.query;

      // Build query with advanced filtering
      const query = {};
      const aggregatePipeline = [];

      // Match stage for filtering
      const matchStage = {};

      // Search functionality
      if (search) {
        matchStage.$or = [
          { "details.name": { $regex: search, $options: "i" } },
          { "details.slug": { $regex: search, $options: "i" } },
        ];
      }

      // Active status filter
      if (isActive !== undefined) {
        matchStage["details.isActive"] = isActive === "true";
      }

      // Price range filter
      if (priceRange) {
        const [min, max] = priceRange.split("-").map(Number);
        if (!isNaN(min) && !isNaN(max)) {
          matchStage["details.price"] = { $gte: min, $lte: max };
        }
      }

      // Course and Exam filters
      if (courseId) {
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
          throw new ValidationError("Invalid courseId format");
        }
        matchStage.courseId = mongoose.Types.ObjectId(courseId);
      }

      if (examId) {
        if (!mongoose.Types.ObjectId.isValid(examId)) {
          throw new ValidationError("Invalid examId format");
        }
        matchStage.examId = mongoose.Types.ObjectId(examId);
      }

      // Add match stage if there are any filters
      if (Object.keys(matchStage).length > 0) {
        aggregatePipeline.push({ $match: matchStage });
      }

      // Add lookup stages for course and exam data only if requested
      if (includeCourse === "true" || courseId) {
        aggregatePipeline.push(
          {
            $lookup: {
              from: "courses",
              localField: "courseId",
              foreignField: "_id",
              as: "course",
            },
          },
          {
            $unwind: {
              path: "$course",
              preserveNullAndEmptyArrays: true,
            },
          }
        );
      }

      if (includeExam === "true" || examId) {
        aggregatePipeline.push(
          {
            $lookup: {
              from: "exams",
              localField: "examId",
              foreignField: "_id",
              as: "exam",
            },
          },
          {
            $unwind: {
              path: "$exam",
              preserveNullAndEmptyArrays: true,
            },
          }
        );
      }

      // Add computed fields
      aggregatePipeline.push({
        $addFields: {
          totalTests: {
            $add: ["$details.paidTestCount", "$details.freeTestCount"],
          },
          completionRate: {
            $cond: {
              if: { $gt: ["$details.totalAttempts", 0] },
              then: {
                $multiply: [
                  {
                    $divide: [
                      "$studentStats.testsAttempted",
                      "$details.totalAttempts",
                    ],
                  },
                  100,
                ],
              },
              else: 0,
            },
          },
          isAvailable: "$details.isActive",
        },
      });

      // Sorting
      const sortField = sort.startsWith("-") ? sort.substring(1) : sort;
      const sortOrder = sort.startsWith("-") ? -1 : 1;
      const sortStage = {
        $sort: {
          [sortField]: sortOrder,
        },
      };
      aggregatePipeline.push(sortStage);

      // Execute count query for pagination
      const countPipeline = [...aggregatePipeline];
      countPipeline.push({ $count: "total" });
      const [countResult] = await TestSeries.aggregate(countPipeline);
      const total = countResult ? countResult.total : 0;

      // Add pagination
      aggregatePipeline.push(
        { $skip: (parseInt(page) - 1) * parseInt(limit) },
        { $limit: parseInt(limit) }
      );

      // Execute main query
      const testSeries = await TestSeries.aggregate(aggregatePipeline);

      // Prepare statistics
      const stats = {
        totalTestSeries: total,
        activeTestSeries: testSeries.filter((ts) => ts.isAvailable).length,
        averagePrice:
          testSeries.reduce((acc, ts) => acc + (ts.details.price || 0), 0) /
          (testSeries.length || 1),
        totalTests: testSeries.reduce(
          (acc, ts) => acc + (ts.totalTests || 0),
          0
        ),
      };

      logger.info(`Retrieved test series list`, {
        filters: Object.keys(matchStage),
        total,
        page,
        limit,
      });

      res.json({
        data: testSeries,
        stats,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          hasMore: page * limit < total,
        },
        filters: {
          applied: Object.keys(matchStage).length,
          available: {
            priceRange: {
              min: Math.min(...testSeries.map((ts) => ts.details.price || 0)),
              max: Math.max(...testSeries.map((ts) => ts.details.price || 0)),
            },
          },
        },
      });
    } catch (error) {
      logger.error(`Get All Test Series Error: ${error.message}`, {
        query: req.query,
        stack: error.stack,
      });
      res.status(error.status || 500).json({
        error: error.message,
        type: error.name,
      });
    }
  },
};

module.exports = TestSeriesController;
