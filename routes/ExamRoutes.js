const express = require("express");
const router = express.Router();
const {
  createExam,
  getAllExams,
  getExamById,
  searchExams,
  updateExam,
  deleteExam,
} = require("../controllers/ExamControlller");

// Create a new exam
router.post("/create", createExam);

// Get all exams
router.get("/", getAllExams);

// Search exams
router.get("/search", searchExams);

// Get single exam by ID
router.get("/:id", getExamById);

// Update an exam
router.put("/:id", updateExam);

// Delete an exam
router.delete("/:id", deleteExam);

module.exports = router;
