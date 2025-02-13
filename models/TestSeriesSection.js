const mongoose = require("mongoose");
const { ValidationError } = require("../utils/errors");
const QuestionPaper = require('./QuestionPaper'); // Import the QuestionPaper model

// Question schema inherits structure from Test model but adds answer
const questionSchema = new mongoose.Schema(
  {
    isNum: { type: Boolean, default: false },
    type: {
      type: String,
      enum: ["mcq", "numerical", "descriptive"],
      required: true,
    },
    negMarks: { type: Number, default: 0 },
    posMarks: { type: Number, default: 1 },
    skipMarks: { type: Number, default: 0 },
    en: {
      prompt: { type: String, required: true },
      value: { type: String, required: true },
      options: [
        {
          prompt: { type: String, required: true },
          value: { type: String, required: true },
        },
      ],
    },
    hn: {
      prompt: { type: String },
      value: { type: String },
      options: [
        {
          prompt: { type: String },
          value: { type: String },
        },
      ],
    },
    correctAnswer: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    SSNo: { type: Number, required: true },
    SSSNo: { type: Number, required: true },
    QSNo: { type: Number, required: true },
  },
  { _id: false }
);

const testSeriesSectionSchema = new mongoose.Schema(
  {
    testSeriesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestSeries",
      required: true,
      index: true
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: [3, "Title must be at least 3 characters long"]
    },
    description: {
      type: String,
      trim: true
    },
    order: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isInteger
    },
    questionPapers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuestionPaper"
    }],
    settings: {
      inheritTestProperties: {
        type: Boolean,
        default: true
      },
      allowPartialInheritance: {
        type: Boolean,
        default: false
      },
      overrideTestSettings: {
        type: Boolean,
        default: false
      },
      customization: {
        shuffleQuestions: {
          type: Boolean,
          default: true
        },
        showCalculator: {
          type: Boolean,
          default: null // Inherit from test if null
        },
        sectionTimeShared: {
          type: Boolean,
          default: null // Inherit from test if null
        }
      }
    },
    metadata: {
      totalQuestions: {
        type: Number,
        default: 0,
        min: 0
      },
      totalMarks: {
        type: Number,
        default: 0,
        min: 0
      },
      averageAttempts: {
        type: Number,
        default: 0,
        min: 0
      },
      lastQuestionPaperAdded: Date,
      lastUpdated: Date
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
testSeriesSectionSchema.index({ testSeriesId: 1, order: 1 }, { unique: true });
testSeriesSectionSchema.index({ testId: 1 });
testSeriesSectionSchema.index({ isActive: 1 });

// Virtual for total question papers
testSeriesSectionSchema.virtual("totalQuestionPapers").get(function() {
  return this.questionPapers?.length || 0;
});

// Pre-save middleware for validation and inheritance
testSeriesSectionSchema.pre("save", async function(next) {
  try {
    const Test = mongoose.model("Test");
    const TestSeries = mongoose.model("TestSeries");

    console.log("Starting pre-save validation");
    console.log("TestId:", this.testId);
    console.log("TestSeriesId:", this.testSeriesId);

    // Validate references exist
    const [test, testSeries] = await Promise.all([
      Test.findById(this.testId).select("+isActive +settings +title +exam +course").lean(),
      TestSeries.findById(this.testSeriesId).select("+isActive +title").lean()
    ]);

    console.log("Test object:", test);
    console.log("Test isActive:", test?.isActive);
    console.log("TestSeries object:", testSeries);
    console.log("TestSeries isActive:", testSeries?.isActive);

    if (!test) {
      throw new ValidationError("Referenced test not found");
    }
    if (!testSeries) {
      throw new ValidationError("Referenced test series not found");
    }
    if (!test.isActive) {
      console.log("Test isActive check failed:", { testId: test._id, isActive: test.isActive });
      throw new ValidationError("Cannot use inactive test");
    }
    if (!testSeries.isActive) {
      throw new ValidationError("Cannot modify section in inactive test series");
    }

    // Validate order is unique within test series
    if (this.isModified("order") || this.isNew) {
      const existingSection = await this.constructor.findOne({
        testSeriesId: this.testSeriesId,
        order: this.order,
        _id: { $ne: this._id }
      });
      
      if (existingSection) {
        throw new ValidationError(`Section with order ${this.order} already exists in this test series`);
      }
    }

    // Inherit properties from test if needed
    if (this.settings?.inheritTestProperties && !this.settings.overrideTestSettings) {
      this.settings.customization = {
        ...this.settings.customization,
        showCalculator: this.settings.customization.showCalculator ?? test.settings?.showCalculator,
        sectionTimeShared: this.settings.customization.sectionTimeShared ?? test.settings?.sectionTimeShared
      };
    }

    // Update metadata
    this.metadata.lastUpdated = new Date();

    console.log("Pre-save validation completed successfully");
    next();
  } catch (error) {
    console.error("Error in pre-save middleware:", error);
    next(error);
  }
});

// Post-save hook to update test series metadata
testSeriesSectionSchema.post("save", async function(doc) {
  try {
    const TestSeries = mongoose.model("TestSeries");
    await TestSeries.updateOne(
      { _id: doc.testSeriesId },
      { 
        $inc: { 
          "metadata.totalSections": doc.isNew ? 1 : 0,
          "metadata.totalQuestionPapers": doc.isNew ? doc.questionPapers.length : 0
        },
        $set: { "metadata.lastUpdated": new Date() }
      }
    );
  } catch (error) {
    console.error("Error updating test series metadata:", error);
  }
});

// Method to add question paper
testSeriesSectionSchema.methods.addQuestionPaper = async function(questionPaperId) {
  if (!mongoose.Types.ObjectId.isValid(questionPaperId)) {
    throw new ValidationError("Invalid question paper ID");
  }

  const questionPaper = await QuestionPaper.findById(questionPaperId);
  
  if (!questionPaper) {
    throw new ValidationError("Question paper not found");
  }
  if (questionPaper.testSeriesSectionId.toString() !== this._id.toString()) {
    throw new ValidationError("Question paper does not belong to this section");
  }

  if (!this.questionPapers.includes(questionPaperId)) {
    this.questionPapers.push(questionPaperId);
    this.metadata.lastQuestionPaperAdded = new Date();
    this.metadata.totalQuestions += questionPaper.totalQuestions || 0;
    this.metadata.totalMarks += questionPaper.maxMarks || 0;
    await this.save();
  }

  return this;
};

// Method to remove question paper
testSeriesSectionSchema.methods.removeQuestionPaper = async function(questionPaperId) {
  const index = this.questionPapers.indexOf(questionPaperId);
  if (index > -1) {
    const questionPaper = await QuestionPaper.findById(questionPaperId);
    
    if (questionPaper) {
      this.metadata.totalQuestions -= questionPaper.totalQuestions || 0;
      this.metadata.totalMarks -= questionPaper.maxMarks || 0;
    }

    this.questionPapers.splice(index, 1);
    await this.save();
  }
  return this;
};

// Static method to get sections with analytics
testSeriesSectionSchema.statics.getSectionsWithAnalytics = async function(testSeriesId) {
  return this.aggregate([
    { $match: { testSeriesId: mongoose.Types.ObjectId(testSeriesId) } },
    {
      $lookup: {
        from: "questionpapers",
        localField: "questionPapers",
        foreignField: "_id",
        as: "questionPaperDetails"
      }
    },
    {
      $addFields: {
        analytics: {
          totalQuestionPapers: { $size: "$questionPapers" },
          activeQuestionPapers: {
            $size: {
              $filter: {
                input: "$questionPaperDetails",
                as: "qp",
                cond: { $eq: ["$$qp.isActive", true] }
              }
            }
          },
          totalAttempts: {
            $sum: "$questionPaperDetails.attempts"
          }
        }
      }
    },
    { $sort: { order: 1 } }
  ]);
};

const TestSeriesSection = mongoose.model("TestSeriesSection", testSeriesSectionSchema);

module.exports = TestSeriesSection;
