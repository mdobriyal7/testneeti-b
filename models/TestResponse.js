const mongoose = require("mongoose");

// Schema for each visit to the question
const visitSchema = new mongoose.Schema(
  {
    nextqid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    }, // ID of the next question visited
    attempts: { type: Number, required: true }, // Number of attempts on this question
    time: { type: Number, required: true }, // Time spent on the question during this visit
  },
  { _id: false }
);

// Main schema for a question's user response data
const questionResponseSchema = new mongoose.Schema({
  markedOption: { type: String, required: true }, // The option marked by the user
  time: { type: Number, required: true }, // Total time spent on the question
  lang: { type: String, enum: ["en", "hn"], required: true }, // Language in which the user attempted the question
  visits: [visitSchema], // Array of visits to the question
});

// Schema for the entire test (could hold responses for multiple questions)
const testResponseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to the user
  responses: {
    // Object holding question responses
    type: Map, // Use Map to store multiple question responses by their IDs
    of: questionResponseSchema, // Value of each key is the question response data
  },
  submittedAt: { type: Date, default: Date.now }, // Timestamp of submission
});

// Create the Mongoose model
const TestResponse = mongoose.model("TestResponse", testResponseSchema);

module.exports = TestResponse;
