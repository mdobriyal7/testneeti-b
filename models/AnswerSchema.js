const mongoose = require("mongoose");

const globalConceptSchema = new mongoose.Schema({
  s: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
    title: { type: String, required: true },
  },
  c: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "Concept" },
    title: { type: String, required: true },
  },
  t: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "Topic" },
    title: { type: String, required: true },
  },
});

const solutionSchema = new mongoose.Schema({
  en: {
    value: { type: String, required: true },
  },
});

const statsSchema = new mongoose.Schema({
  totalStudents: { type: Number, default: 0 },
  bestTime: { type: Number, default: 0 },
  averageTime: { type: Number, default: 0 },
  attempts: {
    correct: { type: Number, default: 0 },
    incorrect: { type: Number, default: 0 },
    partial: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    skipOptionSelected: { type: Number, default: 0 },
  },
});

const studentResponseSchema = new mongoose.Schema({
  time: { type: Number, default: 0 },
  visits: { type: Number, default: 0 },
});

// Define the answer schema as a map
const answerSchema = new mongoose.Schema(
  {
    answers: {
      type: Map,
      of: new mongoose.Schema({
        correctOption: { type: String, required: true },
        multiCorrectOptions: { type: [String], default: null },
        negMarks: { type: Number, default: 0 },
        posMarks: { type: Number, required: true },
        skipMarks: { type: Number, default: 0 },
        partialM: {
          type: { type: String, default: "" },
          marks: { type: Number, default: 0 },
        },
        isPartialMarking: { type: Boolean, default: false },
        sol: solutionSchema,
        tags: { type: [String], default: [] },
        globalConcept: [globalConceptSchema],
        stats: statsSchema,
        votes: { type: Number, default: 0 },
        SSNo: { type: Number, required: true },
        SSSNo: { type: Number, default: 0 },
        marksObtained: { type: Number, default: 0 },
        studentResStatus: { type: String, default: "" },
        studentResponse: studentResponseSchema,
      }),
    },
  },
  { timestamps: true }
);

const Answer = mongoose.model("Answer", answerSchema);

module.exports = Answer;
