const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    paidTestCount: {
      type: Number,
      default: 0,
    },
    freeTestCount: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const detailsSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    languages: [
      {
        type: String,
      },
    ],
    sections: [sectionSchema],
    paidTestCount: {
      type: Number,
      default: 0,
    },
    freeTestCount: {
      type: Number,
      default: 0,
    },
    slug: {
      type: String,
      required: true,
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    totalAttempts: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const studentStatsSchema = new mongoose.Schema(
  {
    testsAttempted: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const testSeriesSchema = new mongoose.Schema(
  {
    details: {
      type: detailsSchema,
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    studentStats: {
      type: studentStatsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to calculate total test counts and ensure slug is set
testSeriesSchema.pre("save", function (next) {
  if (this.details.sections && this.details.sections.length > 0) {
    this.details.paidTestCount = this.details.sections.reduce(
      (sum, section) => sum + (section.paidTestCount || 0),
      0
    );
    this.details.freeTestCount = this.details.sections.reduce(
      (sum, section) => sum + (section.freeTestCount || 0),
      0
    );
  }

  // Ensure slug is never null
  if (!this.details.slug) {
    this.details.slug = this.details.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  next();
});

// Indexes
testSeriesSchema.index({ "details.slug": 1 }, { unique: true, sparse: true });
testSeriesSchema.index({ courseId: 1, examId: 1 });
testSeriesSchema.index({ "details.totalAttempts": -1 });

const TestSeries = mongoose.model("TestSeries", testSeriesSchema);

module.exports = TestSeries;
