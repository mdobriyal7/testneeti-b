const mongoose = require("mongoose");

const examPhasesSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
  uniqueSectionID: {
    // Change from sectionArray to section
    type: mongoose.Schema.Types.ObjectId,
    ref: "SectionArray",
  },
}).set("strictPopulate", false);

const ExamPhases = mongoose.model("ExamPhases", examPhasesSchema);
module.exports = ExamPhases;
