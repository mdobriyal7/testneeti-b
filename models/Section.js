const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sectionSchema = new Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true },
  qCount: { type: Number, required: true }, // Question Count
  title: { type: String, required: true },  // Section Title (e.g., English Language)
  time: { type: Number, required: true },   // Time allocated for the section (in seconds)
  isQualifyingSection: { type: Boolean, default: false },  // If the section is qualifying only
  instructions: [{ type: String }],  // List of instructions related to the section
  SSSNo: { type: Number, default: 0 },  // Sub-section number (if applicable)
  SSNo: { type: Number, default: 1 },   // Section number
  langFilteredQuestions: { type: Schema.Types.Mixed, default: null }, // Language-specific questions if applicable
  maxM: { type: Number, required: true },  // Maximum marks for the section
  hasOptionalQuestions: { type: Boolean, default: false },  // If section has optional questions
  isOptional: { type: Boolean, default: false },  // If the section itself is optional
  isTimeShared: { type: Boolean, default: false },  // If time is shared across sections
});

module.exports = mongoose.model('Section', sectionSchema);
