const mongoose = require("mongoose");

const testTemplateSchema = new mongoose.Schema(
  {
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestSeriesSection",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    sourceTestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },
    settings: {
      duration: {
        type: Number,
        required: true,
      },
      totalQuestions: {
        type: Number,
        required: true,
      },
      maxMarks: {
        type: Number,
        required: true,
      },
      sections: [
        {
          SSNo: Number,
          title: String,
          qCount: Number,
          time: Number,
          maxM: Number,
          isQualifyingSection: Boolean,
          instructions: [String],
          hasOptionalQuestions: Boolean,
          isOptional: Boolean,
          isTimeShared: Boolean,
        },
      ],
      sectionTimeSharedFlag: Boolean,
      isSectionalSubmit: Boolean,
      skipDuration: Number,
      showCalculator: Boolean,
      showNormalCalculator: Boolean,
      ContainMAMCQ: Boolean,
      languages: [String],
      analysisAfter: Number,
      containOptionalSections: Boolean,
      instructions: [
        {
          value: String,
        },
      ],
      hasSectionalRank: Boolean,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for getting total duration
testTemplateSchema.virtual("totalDuration").get(function () {
  return this.settings.duration || 0;
});

// Virtual for getting total marks
testTemplateSchema.virtual("totalMarks").get(function () {
  return this.settings.maxMarks || 0;
});

// Add a virtual to get testSeriesId if needed
testTemplateSchema.virtual('testSeriesId').get(function() {
  // This will be populated when you explicitly populate the sectionId
  return this.sectionId?.testSeriesId;
});

// Modify the pre-save middleware to validate through sectionId
testTemplateSchema.pre("save", async function (next) {
  if (this.isNew || this.isModified("title")) {
    // First verify that section exists
    const section = await mongoose.model('TestSeriesSection').findById(this.sectionId);
    if (!section) {
      throw new Error("Invalid section ID");
    }

    const existingTemplate = await this.constructor.findOne({
      sectionId: this.sectionId,
      title: this.title,
      _id: { $ne: this._id },
    });

    if (existingTemplate) {
      throw new Error(
        "Template with this title already exists in this section"
      );
    }
  }
  next();
});

module.exports = mongoose.model("TestTemplate", testTemplateSchema);
