const mongoose = require('mongoose');

// Schema for storing user responses to individual questions
const questionResponseSchema = new mongoose.Schema({
  questionIndex: {
    type: Number,
    required: true,
    min: 0
  },
  selectedOption: {
    type: mongoose.Schema.Types.Mixed,  // Could be Number for MCQ, String for descriptive
    default: null
  },
  isMarkedForReview: {
    type: Boolean,
    default: false
  },
  timeSpent: {
    type: Number,  // Time spent in seconds
    default: 0,
    min: 0
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  marksAwarded: {
    type: Number,
    default: 0
  }
}, { _id: false });

// Schema for section-wise responses
const sectionAttemptSchema = new mongoose.Schema({
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  sectionTitle: {
    type: String
  },
  responses: [questionResponseSchema],
  timeSpent: {
    type: Number,  // Time spent on this section in seconds
    default: 0,
    min: 0
  },
  score: {
    type: Number,
    default: 0
  },
  maxScore: {
    type: Number,
    default: 0
  }
}, { _id: false });

// Main schema for test attempts
const testAttemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  testSeriesId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestSeries',
    required: true,
    index: true
  },
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionPaper',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'abandoned', 'timed-out'],
    default: 'in-progress',
    required: true,
    index: true
  },
  // Test progress information
  progress: {
    currentSection: {
      type: Number,
      default: 0
    },
    currentQuestion: {
      type: Number,
      default: 0
    },
    visitedQuestions: {
      type: Map,
      of: Boolean,
      default: {}
    }
  },
  // Timing information
  timing: {
    startedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    submittedAt: {
      type: Date
    },
    lastActiveAt: {
      type: Date,
      default: Date.now
    },
    totalTimeSpent: {
      type: Number,  // Total time spent in seconds
      default: 0,
      min: 0
    },
    remainingTime: {
      type: Number,  // Time remaining at submission in seconds
      min: 0,
      default: 0
    }
  },
  // Section-wise attempts
  sections: [sectionAttemptSchema],
  // Summary scores and stats
  summary: {
    totalScore: {
      type: Number,
      default: 0
    },
    maxScore: {
      type: Number,
      default: 0
    },
    accuracy: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    questionsAttempted: {
      type: Number,
      default: 0,
      min: 0
    },
    questionsCorrect: {
      type: Number,
      default: 0,
      min: 0
    },
    questionsIncorrect: {
      type: Number,
      default: 0,
      min: 0
    },
    questionsSkipped: {
      type: Number,
      default: 0,
      min: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
testAttemptSchema.index({ userId: 1, testSeriesId: 1, paperId: 1 });
testAttemptSchema.index({ 'timing.startedAt': -1 });
testAttemptSchema.index({ status: 1 });

// Virtual for calculating percentage
testAttemptSchema.virtual('summary.percentage').get(function() {
  if (this.summary.maxScore > 0) {
    return (this.summary.totalScore / this.summary.maxScore * 100).toFixed(2);
  }
  return 0;
});

// Pre-save middleware for calculating summary stats
testAttemptSchema.pre('save', function(next) {
  // Skip calculations for in-progress tests
  if (this.status === 'in-progress') {
    return next();
  }
  
  // Calculate summary statistics from sections
  let totalScore = 0;
  let maxScore = 0;
  let questionsAttempted = 0;
  let questionsCorrect = 0;
  let questionsIncorrect = 0;
  let questionsSkipped = 0;
  
  this.sections.forEach(section => {
    totalScore += section.score || 0;
    maxScore += section.maxScore || 0;
    
    section.responses.forEach(response => {
      if (response.selectedOption !== null) {
        questionsAttempted++;
        if (response.isCorrect) {
          questionsCorrect++;
        } else {
          questionsIncorrect++;
        }
      } else {
        questionsSkipped++;
      }
    });
  });
  
  // Calculate accuracy
  const accuracy = questionsAttempted > 0 ? 
    (questionsCorrect / questionsAttempted * 100).toFixed(2) : 0;
  
  // Update summary object
  this.summary = {
    ...this.summary,
    totalScore,
    maxScore,
    accuracy,
    questionsAttempted,
    questionsCorrect,
    questionsIncorrect,
    questionsSkipped
  };
  
  next();
});

const TestAttempt = mongoose.model('TestAttempt', testAttemptSchema);

module.exports = TestAttempt; 