const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const courseSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, required: true },
  title: { type: String, required: true }, // e.g., "Banking Examinations"
  slug: { type: String, required: true, unique: true }, // URL-friendly version of title
  description: { type: String, required: true },
  logo: { type: String, required: true }, // URL of the logo
  isActive: { type: Boolean, default: true },
  createdOn: { type: Date, required: true, default: Date.now },
  updatedOn: { type: Date, required: true, default: Date.now },
  specificExams: [
    {
      id: { type: String },
      title: { type: String },
      logo: { type: String },
    },
  ],
});

// Middleware to update the updatedOn timestamp
courseSchema.pre("save", function (next) {
  this.updatedOn = new Date();
  next();
});

// Create indexes for better query performance
courseSchema.index({ title: 1 });
courseSchema.index({ slug: 1 }, { unique: true });

const Course = mongoose.model("Course", courseSchema);
module.exports = Course;
