const mongoose = require("mongoose");

const examCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true,
  },
  icon: {
    type: String,
    required: true,
    index: true,
  },
  tests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestChoices",
      index: true,
    },
  ],
}).set("strictPopulate", false);

const Exam = mongoose.model("ExamCategory", examCategorySchema);
module.exports = Exam;
