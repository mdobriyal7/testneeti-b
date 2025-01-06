const mongoose = require("mongoose");
const Course = require("./Course");
const Schema = mongoose.Schema;

// Define the schema for Exam
const examSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, required: true },
  course: { type: String, required: true },
  courseid: { type: String, required: true },
  title: { type: String, required: true },
  duration: { type: Number, required: true },
  examCutOffs: {
    overAll: {
      cutOffs: [
        {
          category: { type: String, required: true },
          lowerBound: { type: Number, required: true },
          upperBound: { type: Number, required: true },
        },
      ],
    },
  },
  specificExams: [
    {
      id: { type: String, required: true },
      title: { type: String, required: true },
    },
  ],
  languages: [String],
  instructions: [
    {
      value: { type: String, required: true },
    },
  ],
  isFree: { type: Boolean, required: true },
  createdOn: { type: Date, required: true },
  logo: { type: String, required: true },
  purchaseInfo: [
    {
      type: { type: String, required: true },
      id: { type: String, required: true },
    },
  ],
});

// Handle document-level deleteOne
examSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function () {
    try {
      const doc = this;
      await Course.findByIdAndUpdate(
        doc.courseid,
        {
          $pull: {
            specificExams: {
              id: doc._id.toString(),
            },
          },
        },
        { new: true }
      );
    } catch (error) {
      console.error(
        "Error updating Course after Exam document deleteOne:",
        error
      );
    }
  }
);

// Handle query-level deleteOne
examSchema.pre(
  "deleteOne",
  { document: false, query: true },
  async function () {
    try {
      // Get the document that's about to be deleted
      const doc = await this.model.findOne(this.getQuery());
      if (doc) {
        await Course.findByIdAndUpdate(
          doc.courseid,
          {
            $pull: {
              specificExams: {
                id: doc._id.toString(),
              },
            },
          },
          { new: true }
        );
      }
    } catch (error) {
      console.error("Error updating Course after Exam query deleteOne:", error);
    }
  }
);

// Also add findByIdAndDelete middleware since it's commonly used
examSchema.pre("findOneAndDelete", async function () {
  try {
    const doc = await this.model.findOne(this.getQuery());
    if (doc) {
      await Course.findByIdAndUpdate(
        doc.courseid,
        {
          $pull: {
            specificExams: {
              id: doc._id.toString(),
            },
          },
        },
        { new: true }
      );
    }
  } catch (error) {
    console.error("Error updating Course after Exam findOneAndDelete:", error);
  }
});

// The save middleware remains the same
examSchema.post("save", async function (doc) {
  try {
    await Course.findByIdAndUpdate(
      doc.courseid,
      {
        $addToSet: {
          specificExams: {
            id: doc._id.toString(),
            title: doc.title,
            logo: doc.logo,
          },
        },
      },
      { new: true }
    );
  } catch (error) {
    console.error("Error updating Course after Exam save:", error);
  }
});

// Create and export the model
const Exam = mongoose.model("Exam", examSchema);
module.exports = Exam;
