const mongoose = require("mongoose");

const TestPaperSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    testInfo: {
      exam: {
        type: String,
        required: true,
      },
      test: {
        type: String,
        required: true,
      },
      phase: {
        type: String,
        required: true,
      },
    },
    sections: [
      {
        sectionName: {
          type: String,
          required: true,
        },
        questionLimit: {
          type: Number,
          required: true,
        },
        negativeMarking: {
          type: Number,
          required: true,
        },
        duration: {
          type: Number,
          required: true,
        },
        noOfOptions: {
          type: Number,
          required: true,
        },
        questions: [
          {
            questionNo: {
              type: Number,
              required: true,
            },
            question: {
              type: Map,
              of: String,
              required: true,
            },
            options: {
              type: Map,
              of: [Map],
            },
            correctOption: {
              type: Map,
              of: Number,
              required: true,
            },
            marks: {
              type: Number,
              required: true,
              default: 1,
            },
          },
        ],
      },
    ],
  },
  { timestamps: true }
).set("strictPopulate", false);

const TestPaper = mongoose.model("TestPaper", TestPaperSchema);
module.exports = TestPaper;

// {
//   "sectionName":"maths",
//   "questionNo": 1,
//   "question": [
//     { "type": "english", "value": "What is your name?" },
//     { "type": "hindi", "value": "तुम्हारा नाम क्या है?" }
//   ],
//   "options": [
//     { "optionId": "opt1", "type": "english", "value": "Option 1 in English" },
//     { "optionId": "opt2", "type": "english", "value": "Option 2 in English" },
//     { "optionId": "opt3", "type": "hindi", "value": "विकल्प 1 हिंदी में" },
//     { "optionId": "opt4", "type": "hindi", "value": "विकल्प 2 हिंदी में" }
//   ],
//   "correctOption": "opt1",
//   "marks": 2
// }
