const mongoose = require("mongoose");
const Course = require("../models/Course"); // Adjust path as needed

class CourseController {
  // Create a new course
  async createCourse(req, res) {
    try {
      console.log("Request body:", req.body);
      const { title, description, logo, specificExams = [] } = req.body;

      // Generate slug from title
      const slug = title
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, "-")
        .replace(/-+/g, "-");

      const course = new Course({
        _id: new mongoose.Types.ObjectId(),
        title,
        slug,
        description,
        logo,
        specificExams, // Add specificExams array
      });

      const savedCourse = await course.save();

      res.status(201).json({
        success: true,
        data: savedCourse,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          error: "A course with this title already exists",
        });
      }

      res.status(500).json({
        success: false,
        error: "Error creating course",
      });
    }
  }

  // Get all active courses
  async getAllCourses(req, res) {
    try {
      const courses = await Course.find({ isActive: true })
        .select("title description slug logo isActive createdOn specificExams") // Added specificExams
        .sort({ createdOn: -1 });

      res.status(200).json({
        success: true,
        count: courses.length,
        data: courses,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error fetching courses",
      });
    }
  }

  // Get a single course by slug and its related Exams data
  async getCourseBySlug(req, res) {
    try {
      const course = await Course.findOne({
        slug: req.params.slug,
        isActive: true,
      });

      if (!course) {
        return res.status(404).json({
          success: false,
          error: "Course not found",
        });
      }

      res.status(200).json({
        success: true,
        data: course,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error fetching course",
      });
    }
  }

  // Update a course by ID
  async updateCourse(req, res) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid course ID",
        });
      }

      const { title, description, logo, isActive, specificExams } = req.body;
      const updateData = { description, logo, isActive };

      // If specificExams is provided, update it
      if (specificExams) {
        updateData.specificExams = specificExams;
      }

      // If title is being updated, update slug as well
      if (title) {
        updateData.title = title;
        updateData.slug = title
          .toLowerCase()
          .replace(/[^a-zA-Z0-9]/g, "-")
          .replace(/-+/g, "-");
      }

      const course = await Course.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!course) {
        return res.status(404).json({
          success: false,
          error: "Course not found",
        });
      }

      res.status(200).json({
        success: true,
        data: course,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          error: "A course with this title already exists",
        });
      }

      res.status(500).json({
        success: false,
        error: "Error updating course",
      });
    }
  }

  // Add specific exams to a course
  async addSpecificExams(req, res) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid course ID",
        });
      }

      const { exams } = req.body; // Array of exam objects

      if (!Array.isArray(exams)) {
        return res.status(400).json({
          success: false,
          error: "Exams must be provided as an array",
        });
      }

      const course = await Course.findByIdAndUpdate(
        req.params.id,
        {
          $addToSet: { specificExams: { $each: exams } },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!course) {
        return res.status(404).json({
          success: false,
          error: "Course not found",
        });
      }

      res.status(200).json({
        success: true,
        data: course,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error adding specific exams",
      });
    }
  }

  // Remove specific exams from a course
  async removeSpecificExams(req, res) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid course ID",
        });
      }

      const { examIds } = req.body; // Array of exam IDs to remove

      if (!Array.isArray(examIds)) {
        return res.status(400).json({
          success: false,
          error: "Exam IDs must be provided as an array",
        });
      }

      const course = await Course.findByIdAndUpdate(
        req.params.id,
        {
          $pull: { specificExams: { id: { $in: examIds } } },
        },
        {
          new: true,
        }
      );

      if (!course) {
        return res.status(404).json({
          success: false,
          error: "Course not found",
        });
      }

      res.status(200).json({
        success: true,
        data: course,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error removing specific exams",
      });
    }
  }

  // Delete a course by ID (full delete)
  async deleteCourse(req, res) {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid course ID",
        });
      }

      const course = await Course.findByIdAndDelete(req.params.id);

      if (!course) {
        return res.status(404).json({
          success: false,
          error: "Course not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Course successfully deleted",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error deleting course",
      });
    }
  }

  // Search courses
  async searchCourses(req, res) {
    try {
      const { query } = req.query;

      const courses = await Course.find({
        isActive: true,
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ],
      })
        .select("title description slug logo isActive createdOn specificExams") // Added specificExams
        .sort({ createdOn: -1 });

      res.status(200).json({
        success: true,
        count: courses.length,
        data: courses,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error searching courses",
      });
    }
  }
}

module.exports = new CourseController();
