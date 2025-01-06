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
  options: [optionSchema],
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
  lang: { type: String, default: "" }, // for additional language flexibility
  subjectLang: { type: String, default: "English" },
  SSNo: { type: Number, required: true },
  SSSNo: { type: Number, required: true },
  QSNo: { type: Number, required: true },
});

const sectionSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true },
  qCount: { type: Number, required: true }, // Question Count
  title: { type: String, required: true }, // Section Title (e.g., English Language)
  time: { type: Number, required: true }, // Time allocated for the section (in seconds)
  questions: [questionSchema],
  isQualifyingSection: { type: Boolean, default: false }, // If the section is qualifying only
  instructions: [{ type: String }], // List of instructions related to the section
  SSSNo: { type: Number, default: 0 }, // Sub-section number (if applicable)
  SSNo: { type: Number, default: 1 }, // Section number
  langFilteredQuestions: { type: mongoose.Schema.Types.Mixed, default: null }, // Language-specific questions if applicable
  maxM: { type: Number, required: true }, // Maximum marks for the section
  hasOptionalQuestions: { type: Boolean, default: false }, // If section has optional questions
  isOptional: { type: Boolean, default: false }, // If the section itself is optional
  isTimeShared: { type: Boolean, default: false }, // If time is shared across sections
});

const testSchema = new mongoose.Schema({
  course: String,
  courseid: String,
  exam: String,
  examid: String,
  title: String,
  sectionTimeSharedFlag: Boolean,
  isSectionalSubmit: Boolean,
  duration: Number,
  skipDuration: Number,
  sections: [sectionSchema],
  examCutOffs: examCutOffsSchema,
  specificExams: [specificExamSchema],
  lang: String,
  showCalculator: Boolean,
  showNormalCalculator: Boolean,
  ContainMAMCQ: Boolean,
  isLive: Boolean,
  languages: [String],
  analysisAfter: Number,
  isAnalysisGenerated: Boolean,
  containOptionalSections: Boolean,
  isPyp: Boolean,
  isFree: Boolean,
  createdOn: { type: Date, default: Date.now },
  instructions: [
    {
      value: String,
    },
  ],
  IsFullTest: Boolean,
  patternId: String,
  hasSectionalRank: Boolean,
});

module.exports = mongoose.model("Test", testSchema);
