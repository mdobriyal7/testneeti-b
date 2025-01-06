const mongoose = require("mongoose");

const testChoicesSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
  phases: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamPhases",
    },
  ],
}).set("strictPopulate", false);

const Test = mongoose.model("TestChoices", testChoicesSchema);
module.exports = Test;
