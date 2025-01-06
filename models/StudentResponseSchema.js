const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Define the schema for the student's question responses
const responseSchema = new Schema({
  quesNum: { type: Number, required: true },
  answer: {
    correctOption: { type: String },
    multiCorrectOptions: { type: [String], default: null },
    negMarks: { type: Number, default: 0 },
    posMarks: { type: Number, default: 1 },
    sol: {
      value: { type: String },
      type: { type: String, default: "tb" },
      videoSol: { type: String, default: "" },
    },
    tags: [{ type: String }],
    stats: {
      totalStudents: { type: Number },
      bestTime: { type: Number },
      averageTime: { type: Number },
      attempts: {
        correct: { type: Number },
        incorrect: { type: Number },
        partial: { type: Number },
        skipped: { type: Number },
        skipOptionSelected: { type: Number },
      },
    },
    votes: { type: Number, default: 0 },
    marksObtained: { type: Number, default: 0 },
    studentResStatus: { type: String, default: "Unattempted" },
    studentResponse: {
      time: { type: Number },
      lang: { type: String },
      visits: [
        {
          nextqid: { type: String },
          attempts: { type: Number },
          time: { type: Number },
        },
      ],
    },
    lang: { type: String, default: "English" },
    isOvertime: { type: Boolean, default: false },
  },
  question: {
    isNum: { type: Boolean, default: false },
    type: { type: String, default: "mcq" },
    negMarks: { type: Number, default: 0.25 },
    posMarks: { type: Number, default: 1 },
    skipMarks: { type: Number, default: 0 },
    partialMarks: {
      type: { type: String },
      marks: { type: Number, default: 0 },
    },
    isPartialMarking: { type: Boolean, default: false },
    _id: { type: String },
    ques: {
      value: { type: String },
      comp: { type: String },
      options: [
        {
          prompt: { type: String },
          value: { type: String },
        },
      ],
    },
    lang: { type: String, default: "English" },
    singlePageComp: { type: Boolean, default: false },
    isFixedComp: { type: Boolean, default: false },
    subjectLang: { type: String },
    QSNo: { type: Number },
    isPersonality: { type: Boolean, default: false },
    SSSNo: { type: Number },
  },
});

// Define the schema for sections of the test
const sectionPersonalizedStatsSchema = new Schema({
  _id: { type: String },
  ssNo: { type: Number },
  title: { type: String },
  responses: [responseSchema],
  totalMarks: { type: Number },
  accuracy: { type: Number, default: 0 },
  correct: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  timeSpent: { type: Number },
  totalTimeAllotted: { type: Number },
  totalAttemptedCount: { type: Number, default: 0 },
  totalQuesCount: { type: Number },
  incorrect: { type: Number, default: 0 },
  cutoff: { type: Number, default: 0 },
  isPersonality: { type: Boolean, default: false },
  hasOptionalQuestions: { type: Boolean, default: false },
  skipped: { type: Number, default: 0 },
});

// Define the main schema for the student test response
const testResponseSchema = new Schema({
  success: { type: Boolean, default: true },
  filters: [
    {
      Overtime: { type: Number, default: 0 },
      Unattempted: { type: Number, default: 0 },
    },
  ],
  subjectFilters: [{ type: String }],
  sections: [sectionPersonalizedStatsSchema],
});

// Export the model
const TestResponse = mongoose.model("TestResponse", testResponseSchema);
module.exports = TestResponse;
