const mongoose = require("mongoose");
const { Schema } = mongoose;

const SectionalAnalysisSchema = new Schema({
  secId: { type: Schema.Types.ObjectId, required: true, ref: "Section" },
  average: {
    marks: { type: Number, required: true },
    totalStudents: { type: Number, required: true },
    time: {
      correct: { type: Number, required: true },
      incorrect: { type: Number, required: true },
      skipped: { type: Number, required: true },
    },
    questions: {
      correct: { type: Number, required: true },
      incorrect: { type: Number, required: true },
      skipped: { type: Number, required: true },
    },
  },
  isQualifyingSection: { type: Boolean, required: true },
});

const TestAnalysisSchema = new Schema({
  testId: { type: Schema.Types.ObjectId, required: true, ref: "Test" },
  analysis: {
    title: { type: String, required: true },
    maxMarks: { type: Number, required: true },
    avgMarks: { type: Number, required: true },
    totalStudents: { type: Number, required: true },
    rankMarksData: [
      {
        marks: { type: Number, required: true },
        count: { type: Number, required: true },
        per: { type: Number, required: true },
        rank: { type: Number, required: true },
      },
    ],
    marksDistData: {
      size: { type: Number, required: true },
      data: [
        {
          marks: { type: Number, required: true },
          count: { type: Number, required: true },
          per: { type: Number, required: true },
          rank: { type: Number, required: true },
        },
      ],
    },
    sectionalAnalysis: [SectionalAnalysisSchema],
    rankers: [
      {
        id: { type: Schema.Types.ObjectId, required: true, ref: "Student" },
        rank: { type: Number, required: true },
        marks: { type: Number, required: true },
        responses: {
          type: Map,
          of: {
            markedOption: { type: String, required: true },
            time: { type: Number, required: true },
            lang: { type: String, required: true },
            visits: [
              {
                nextQuestionId: {
                  type: Schema.Types.ObjectId,
                  required: true,
                  ref: "Question",
                },
                attempts: { type: Number, required: true },
                time: { type: Number, required: true },
                logs: [
                  {
                    type: { type: String, required: true },
                    at: { type: Number, required: true },
                    value: { type: String, required: true },
                  },
                ],
              },
            ],
          },
        },
        correctCount: { type: Number, required: true },
        inCorrectCount: { type: Number, required: true },
        accuracy: { type: Number, required: true },
        partialCount: { type: Number, required: true },
        totalAttemptedCount: { type: Number, required: true },
        totalTimeSpent: { type: Number, required: true },
        SkipOptionSelected: { type: Number, required: true },
        skipped: { type: Number, required: true },
      },
    ],
    cutOffs: {
      overAll: {
        SNo: { type: Number, required: true },
        secId: { type: String, default: "" },
        title: { type: String, default: "" },
        cutOffs: [
          {
            category: { type: String, required: true },
            lowerBound: { type: Number, required: true },
            upperBound: { type: Number, required: true },
            lowerBoundPercentile: { type: Number, default: 0 },
            upperBoundPercentile: { type: Number, default: 0 },
          },
        ],
      },
      sectional: [
        {
          SNo: { type: Number, required: true },
          secId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "Section",
          },
          title: { type: String, required: true },
          cutOffs: [
            {
              category: { type: String, required: true },
              lowerBound: { type: Number, required: true },
              upperBound: { type: Number, required: true },
              lowerBoundPercentile: { type: Number, default: 0 },
              upperBoundPercentile: { type: Number, default: 0 },
            },
          ],
        },
      ],
      isSectionalCutOffsAbsent: { type: Boolean, required: true },
      isAdminNotified: { type: Boolean, required: true },
    },
    testDiscussion: { type: String, default: null },
    mean: { type: Number, default: 0 },
    standardDeviation: { type: Number, default: 0 },
    isASM: { type: Boolean, required: true },
    reattemptPurchaseInfo: { type: Schema.Types.Mixed, default: null },
  },
  ts: {
    CA: { type: Number, required: true },
    SID: { type: Schema.Types.ObjectId, required: true, ref: "Subject" },
    attemptNo: { type: Number, required: true },
    accuracy: { type: Number, required: true },
    marks: { type: Number, required: true },
    startTime: { type: Date, required: true },
    actualEndTime: { type: Date, required: true },
    proposedEndTime: { type: Date, required: true },
    client: { type: String, required: true },
    lang: { type: String, required: true },
    isIgnored: { type: Boolean, required: true },
    subjectAnalysis: { type: Schema.Types.Mixed, default: null },
    strengthAndWeaknesses: [
      {
        title: { type: String, required: true },
        tags: [
          {
            tag: { type: String, required: true },
            score: { type: Number, required: true },
            time: { type: Number, required: true },
            questions: [
              {
                id: {
                  type: Schema.Types.ObjectId,
                  required: true,
                  ref: "Question",
                },
                status: { type: String, required: true }, // e.g., "correct", "incorrect", "skip"
                SSNo: { type: Number, required: true },
                QSNo: { type: Number, required: true },
              },
            ],
            correctPercentage: { type: Number, required: true },
          },
        ],
      },
    ],
  },
});

module.exports = mongoose.model("TestAnalysis", TestAnalysisSchema);
