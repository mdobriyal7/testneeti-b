const mongoose = require("mongoose");

const cutOffSchema = new mongoose.Schema({
  category: String,
  lowerBound: Number,
  upperBound: Number,
  lowerBoundPercentile: Number,
  upperBoundPercentile: Number,
});

const examCutOffsSchema = new mongoose.Schema({
  overAll: {
    SNo: Number,
    secId: String,
    title: String,
    cutOffs: [cutOffSchema],
  },
  isSectionalCutOffsAbsent: Boolean,
});

const specificExamSchema = new mongoose.Schema({
  id: String,
  title: String,
});

const optionSchema = new mongoose.Schema({
  prompt: { type: String, required: true },
  value: { type: String, required: true },
});

const languageSchema = new mongoose.Schema({
  value: { type: String, required: false },
  comp: { type: String, required: false },
  options: [{ prompt: String, value: String }],
});

const questionSchema = new mongoose.Schema({
  isNum: { type: Boolean, default: false },
  type: {
    type: String,
    enum: ["mcq", "numerical", "descriptive"],
    required: true,
  },
  negMarks: { type: Number, default: 0 },
  posMarks: { type: Number, default: 1 },
  skipMarks: { type: Number, default: 0 },
  en: languageSchema, // English
  hn: languageSchema, // Hindi
  lang: { type: String, default: "" },
  subjectLang: { type: String, default: "English" },
  SSNo: { type: Number, required: true },
  SSSNo: { type: Number, required: true },
  QSNo: { type: Number, required: true },
});

const sectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  time: { type: Number, required: true },
  qCount: { type: Number, required: true },
  maxM: { type: Number, required: true },
  isQualifyingSection: { type: Boolean, default: false },
  hasOptionalQuestions: { type: Boolean, default: false },
  isOptional: { type: Boolean, default: false },
  isTimeShared: { type: Boolean, default: false },
  instructions: [String],
  questions: [questionSchema],
  SSNo: { type: Number, default: 1 },
});

const testSchema = new mongoose.Schema({
  course: { type: String, required: true },
  courseid: { type: String, required: true },
  exam: { type: String, required: true },
  examid: { type: String, required: true },
  title: { type: String, required: true },
  duration: { type: Number, required: true },
  skipDuration: { type: Number, default: 0 },
  maxM: { type: Number, required: true },
  sections: [sectionSchema],
  languages: [String],
  sectionTimeShared: { type: Boolean, default: false },
  isSectionalSubmit: { type: Boolean, default: false },
  showCalculator: { type: Boolean, default: false },
  showNormalCalculator: { type: Boolean, default: false },
  containMAMCQ: { type: Boolean, default: false },
  hasSectionalRank: { type: Boolean, default: false },
  isFree: { type: Boolean, default: false },
  createdOn: { type: Date, default: Date.now },
  instructions: [{ value: String }],
});

// Middleware to update parent exam after saving test
testSchema.post("save", async function (doc) {
  try {
    await mongoose.model("Exam").findByIdAndUpdate(doc.examid, {
      $push: {
        specificExams: {
          id: doc._id.toString(),
          title: doc.title,
        },
      },
    });
  } catch (error) {
    console.error("Error updating parent exam:", error);
    throw error;
  }
});

// Middleware to remove test from parent exam before deletion
testSchema.pre("deleteOne", { document: true }, async function () {
  try {
    await mongoose.model("Exam").findByIdAndUpdate(this.examId, {
      $pull: {
        specificExams: {
          id: this._id.toString(),
        },
      },
    });
  } catch (error) {
    console.error("Error removing test from parent exam:", error);
    throw error;
  }
});

module.exports = mongoose.model("Test", testSchema);
