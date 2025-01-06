const express = require("express");
const router = express.Router();
const courseController = require("../controllers/CourseController");

// Routes
router.post("/", courseController.createCourse);
router.get("/", courseController.getAllCourses);
router.get("/search", courseController.searchCourses);
router.get("/:slug", courseController.getCourseBySlug);
router.put("/:id", courseController.updateCourse);
router.delete("/:id", courseController.deleteCourse);

module.exports = router;
