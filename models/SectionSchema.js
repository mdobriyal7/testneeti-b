// const sectionSchema = new Schema({
//     name: {
//       type: String,
//       required: true
//     },
//     duration: {
//       type: Number,
//       required: true
//     },
//     negativeMarking: {
//       type: Number,
//       default: 0
//     },
//     noOfQuestions: {
//       type: Number,
//       required: true
//     },
//     noOfOptions: {
//       type: Number,
//       required: true
//     },
//     questions: [{
//       type: Schema.Types.ObjectId,
//       ref: 'Question'
//     }]
//   });

const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema({
  sections: [
    {
      name: {
        type: String,
        required: true,
      },
      duration: {
        type: Number,
        required: true,
      },
      negativeMarking: {
        type: Number,
        default: 0,
      },
      noOfQuestions: {
        type: Number,
        required: true,
      },
      noOfOptions: {
        type: Number,
        required: true,
      },
    },
  ],
}).set("strictPopulate", false);

const Section = mongoose.model("SectionArray", sectionSchema);
module.exports = Section;
