const Exam = require("../models/Exam"); // Adjust the path as needed
const mongoose = require("mongoose");

// Create a new exam
exports.createExam = async (req, res) => {
  try {
    // Generate a new ObjectId if not provided
    const examData = {
      ...req.body,
      _id: req.body._id || new mongoose.Types.ObjectId(),
      createdOn: new Date(),
    };

    const newExam = new Exam(examData);
    const savedExam = await newExam.save();

    res.status(201).json({
      message: "Exam created successfully",
      exam: savedExam,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error creating exam",
      error: error.message,
    });
  }
};

exports.getAllExams = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      fields,
      course,
      isFree,
      languages,
      duration,
      specificExamId,
    } = req.query;

    // Build query filters
    const query = {};

    // Course filter (case-insensitive partial match)
    if (course) query.course = { $regex: course, $options: "i" };

    // Free exam filter
    if (isFree !== undefined) query.isFree = isFree === "true";

    // Language filter
    if (languages) query.languages = languages;

    // Duration exact match filter
    if (duration) query.duration = parseInt(duration);

    // Specific exam filter
    if (specificExamId) {
      query["specificExams.id"] = specificExamId;
    }

    console.log("fields", fields);

    // Field selection
    let projection = {};
    if (fields) {
      let fieldArray;

      try {
        // Try parsing `fields` as JSON
        fieldArray = JSON.parse(fields);

        // If parsing succeeds but the result isn't an array, handle as a string
        if (!Array.isArray(fieldArray))
          throw new Error("Fields is not an array");
      } catch (error) {
        // If JSON.parse fails, treat it as a comma-separated string
        fieldArray = fields.split(",").map((field) => field.trim());
      }

      // Convert the field array into a projection object
      projection = fieldArray.reduce((acc, field) => {
        acc[field] = 1;
        return acc;
      }, {});
    }

    // Pagination and query execution
    const exams = await Exam.find(query, projection)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Exam.countDocuments(query);

    res.status(200).json({
      exams,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalExams: total,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching exams",
      error: error.message,
    });
  }
};

// Get single exam by ID
exports.getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    res.status(200).json(exam);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching exam",
      error: error.message,
    });
  }
};

// Update an exam
exports.updateExam = async (req, res) => {
  try {
    // Prevent updating _id
    const { _id, ...updateData } = req.body;

    const updatedExam = await Exam.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedExam) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    res.status(200).json({
      message: "Exam updated successfully",
      exam: updatedExam,
    });
  } catch (error) {
    res.status(400).json({
      message: "Error updating exam",
      error: error.message,
    });
  }
};

// Delete an exam
exports.deleteExam = async (req, res) => {
  try {
    const deletedExam = await Exam.findByIdAndDelete(req.params.id);

    if (!deletedExam) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    res.status(200).json({
      message: "Exam deleted successfully",
      exam: deletedExam,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting exam",
      error: error.message,
    });
  }
};

// Search exams with advanced filtering
exports.searchExams = async (req, res) => {
  try {
    const { course, minDuration, maxDuration, language, isFree } = req.query;

    const query = {};

    if (course) query.course = { $regex: course, $options: "i" };
    if (minDuration) query.duration = { $gte: parseInt(minDuration) };
    if (maxDuration)
      query.duration = {
        ...query.duration,
        $lte: parseInt(maxDuration),
      };
    if (language) query.languages = language;
    if (isFree !== undefined) query.isFree = isFree === "true";

    const exams = await Exam.find(query);

    res.status(200).json(exams);
  } catch (error) {
    res.status(500).json({
      message: "Error searching exams",
      error: error.message,
    });
  }
};

// Get all exams
// exports.getAllExams = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, course, isFree } = req.query;

//     // Build query filters
//     const query = {};
//     if (course) query.course = course;
//     if (isFree !== undefined) query.isFree = isFree === "true";

//     const exams = await Exam.find(query)
//       .limit(limit * 1)
//       .skip((page - 1) * limit)
//       .select("-__v"); // Exclude version key

//     const total = await Exam.countDocuments(query);

//     res.status(200).json({
//       exams,
//       totalPages: Math.ceil(total / limit),
//       currentPage: page,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Error fetching exams",
//       error: error.message,
//     });
//   }
// };
