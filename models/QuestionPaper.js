const mongoose = require('mongoose');
const { ValidationError } = require("../utils/errors");

// Language-specific content schema
const languageContentSchema = new mongoose.Schema({
    value: { 
        type: String, 
        default: '',
        trim: true 
    },
    comp: {
        type: String,
        default: '',
        trim: true 
    },
    solution: {
        type: String,
        default: '',
        trim: true
    },
    options: [{
        prompt: { 
            type: String, 
            default: '',
            trim: true 
        },
        value: { 
            type: String, 
            default: '',
            trim: true 
        }
    }]
}, { _id: false });

// Question schema with proper validation and typing
const questionSchema = new mongoose.Schema(
    {
        isNum: { 
            type: Boolean, 
            default: false,
            required: true
        },
        type: {
            type: String,
            enum: ["mcq", "numerical", "descriptive"],
            required: true,
            index: true
        },
        isComplete: {
            type: Boolean,
            default: false,
            required: true,
            index: true
        },
        negMarks: { 
            type: Number, 
            default: 0,
            min: 0,
            validate: {
                validator: Number.isFinite,
                message: "Negative marks must be a valid number"
            }
        },
        posMarks: { 
            type: Number, 
            default: 1,
            min: 0,
            validate: {
                validator: Number.isFinite,
                message: "Positive marks must be a valid number"
            }
        },
        skipMarks: { 
            type: Number, 
            default: 0,
            validate: {
                validator: Number.isFinite,
                message: "Skip marks must be a valid number"
            }
        },
        content: {
            type: Map,
            of: languageContentSchema,
            required: true,
            validate: {
                validator: function(content) {
                    return content && content.size > 0;
                },
                message: "At least one language content must be provided"
            }
        },
        correctAnswer: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
            validate: {
                validator: function(value) {
                    if (this.type === "mcq") {
                        return Number.isInteger(value) && value >= 0;
                    } else if (this.type === "numerical") {
                        return Number.isFinite(value);
                    }
                    return typeof value === "string" && value.trim().length > 0;
                },
                message: "Invalid answer format for question type"
            }
        },
        SSNo: { 
            type: Number, 
            required: true,
            min: 1,
            validate: Number.isInteger
        },
        QSNo: { 
            type: Number, 
            required: true,
            min: 1,
            validate: Number.isInteger
        }
    },
    { 
        _id: false,
        timestamps: true
    }
);

// Add pre-save middleware to validate and set isComplete
questionSchema.pre('save', function(next) {
    // Check if question is complete based on type
    if (this.type === 'mcq') {
        this.isComplete = !!(
            this.content?.get('en')?.value?.trim() && 
            this.content.get('en').options?.some(opt => opt.value?.trim()) &&
            typeof this.correctAnswer === 'number'
        );
    } else if (this.type === 'numerical') {
        this.isComplete = !!(
            this.content?.get('en')?.value?.trim() && 
            typeof this.correctAnswer === 'number'
        );
    } else if (this.type === 'descriptive') {
        this.isComplete = !!(
            this.content?.get('en')?.value?.trim() && 
            typeof this.correctAnswer === 'string' &&
            this.correctAnswer.trim().length > 0
        );
    }
    next();
});

// Section schema for question paper
const sectionSchema = new mongoose.Schema({
    _id: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true, 
        default: () => new mongoose.Types.ObjectId(),
        auto: true  // Ensure auto-generation
    },
    title: { type: String, required: true },
    time: { type: Number, required: true },
    qCount: { type: Number, required: true },
    maxM: { type: Number, required: true },
    isQualifyingSection: { type: Boolean, default: false },
    hasOptionalQuestions: { type: Boolean, default: false },
    isOptional: { type: Boolean, default: false },
    isTimeShared: { type: Boolean, default: false },
    instructions: [String],
    questions: [questionSchema],
    SSNo: { type: Number, default: 1 }
});

const questionPaperSchema = new mongoose.Schema(
    {
        testId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Test",
            required: true,
            index: true
        },
        testSeriesSectionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TestSeriesSection",
            required: true,
            index: true
        },
        title: {
            type: String,
            required: true,
            trim: true,
            minlength: [3, "Title must be at least 3 characters long"]
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        sections: [sectionSchema],
        languages: [{
            type: String,
            lowercase: true,
            trim: true
        }],
        showCalculator: {
            type: Boolean,
            default: false
        },
        isFree: {
            type: Boolean,
            default: false,
            required: true
        },
        isActive: {
            type: Boolean,
            default: true,
            required: true
        },
        attempts: {
            type: Number,
            default: 0,
            min: 0,
            validate: Number.isInteger
        },
        status: {
            type: String,
            enum: ["draft", "published", "archived"],
            default: "draft",
            required: true,
            index: true
        },
        metadata: {
            createdBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: false
            },
            lastModifiedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            publishedAt: Date,
            archivedAt: Date
        }
    },
    { 
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Virtual for calculating total duration
questionPaperSchema.virtual("totalDuration").get(function() {
    return this.sections.reduce((total, section) => total + section.time, 0);
});

// Virtual for calculating total marks
questionPaperSchema.virtual("totalMarks").get(function() {
    return this.sections.reduce((total, section) => total + section.maxM, 0);
});

// Virtual for calculating total questions
questionPaperSchema.virtual("totalQuestions").get(function() {
    return this.sections.reduce((total, section) => total + section.questions.length, 0);
});

// Method to get test information
questionPaperSchema.methods.getTestInfo = async function() {
    return await this.model('Test').findById(this.testId)
        .select('course exam title')
        .lean();
};

// Add pre-save middleware to update TestSeriesSection
questionPaperSchema.pre('save', async function(next) {
    try {
        console.log('Starting pre-save middleware');
        console.log('TestSeriesSectionId:', this.testSeriesSectionId);
        console.log('TestId:', this.testId);
        console.log('Is new document:', this.isNew);
        console.log('Document _id:', this._id);

        // Validate test belongs to test series section
        const testSeriesSection = await mongoose.model('TestSeriesSection').findById(this.testSeriesSectionId);
        console.log('Found TestSeriesSection:', testSeriesSection ? 'Yes' : 'No');
        
        if (!testSeriesSection) {
            console.log('TestSeriesSection not found');
            throw new ValidationError("Test series section not found");
        }
        
        console.log('TestSeriesSection testId:', testSeriesSection.testId);
        console.log('Current testId:', this.testId);
        
        if (testSeriesSection.testId.toString() !== this.testId.toString()) {
            console.log('Test ID mismatch');
            throw new ValidationError("Test does not belong to this test series section");
        }

        // We only want to update the TestSeriesSection if this is a new document
        if (this.isNew) {
            console.log('Document is new, preparing to update TestSeriesSection');
            // We should NOT update the TestSeriesSection here because the document hasn't been saved yet
            // and doesn't have an _id. Instead, we'll do it in a post-save middleware
            console.log('Skipping TestSeriesSection update until post-save');
        }
        
        console.log('Pre-save middleware completed successfully');
        next();
    } catch (error) {
        console.error('Error in pre-save middleware:', error);
        next(error);
    }
});

// Add post-save middleware to update TestSeriesSection
questionPaperSchema.post('save', async function(doc) {
    try {
        console.log('Starting post-save middleware');
        console.log('Document _id:', doc._id);
        
        if (doc.isNew) {
            console.log('Document was new, updating TestSeriesSection');
            const testSeriesSection = await mongoose.model('TestSeriesSection').findById(doc.testSeriesSectionId);
            if (!testSeriesSection) {
                console.log('TestSeriesSection not found in post-save');
                return;
            }

            console.log('Found TestSeriesSection in post-save, updating...');
            await mongoose.model('TestSeriesSection').findByIdAndUpdate(
                doc.testSeriesSectionId,
                { 
                    $addToSet: { questionPapers: doc._id },
                    $set: { 
                        'metadata.lastQuestionPaperAdded': new Date(),
                        'metadata.totalQuestions': (testSeriesSection.metadata.totalQuestions || 0) + doc.totalQuestions,
                        'metadata.totalMarks': (testSeriesSection.metadata.totalMarks || 0) + doc.totalMarks
                    }
                }
            );
            console.log('Successfully updated TestSeriesSection in post-save');
        }
    } catch (error) {
        console.error('Error in post-save middleware:', error);
        // We can't throw in post middleware, but we can log the error
    }
});

// Add pre-remove middleware to clean up references
questionPaperSchema.pre('remove', async function(next) {
    try {
        // Remove this question paper from the section's questionPapers array
        await mongoose.model('TestSeriesSection').findByIdAndUpdate(
            this.testSeriesSectionId,
            { $pull: { questionPapers: this._id } }
        );
        next();
    } catch (error) {
        next(error);
    }
});

// Add pre-save middleware to ensure questions have section numbers
questionPaperSchema.pre('save', function(next) {
    // Go through each section
    this.sections.forEach(section => {
        // Go through each question in the section
        section.questions.forEach(question => {
            // Ensure question has SSNo from its section
            if (!question.SSNo) {
                question.SSNo = section.SSNo;
            }
        });
    });
    next();
});

// Check if model exists before compiling
const QuestionPaper = mongoose.models.QuestionPaper || mongoose.model("QuestionPaper", questionPaperSchema);
module.exports = QuestionPaper; 