const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const AutoIncrement = require('mongoose-sequence')(mongoose);

// Schema for question templates with enhanced validation
const QuestionTemplateSchema = new Schema({
  text: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
    minlength: [3, 'Question text must be at least 3 characters long']
  },
  type: {
    type: String,
    enum: {
      values: ['MCQ', 'Rating', 'Text', 'Linear_Scale'],
      message: '{VALUE} is not a supported question type'
    },
    required: [true, 'Question type is required']
  },
  options: {
    type: [{
      text: {
        type: String,
        required: function() { return this.parent().type === 'MCQ'; },
        trim: true
      },
      value: Schema.Types.Mixed
    }],
    validate: {
      validator: function(options) {
        if (this.type === 'MCQ' && (!options || options.length < 2)) {
          return false;
        }
        return true;
      },
      message: 'MCQ questions must have at least 2 options'
    }
  },
  scaleOptions: {
    min: {
      type: Number,
      default: 1,
      required: function() {
        return ['Rating', 'Linear_Scale'].includes(this.type);
      }
    },
    max: {
      type: Number,
      default: 5,
      required: function() {
        return ['Rating', 'Linear_Scale'].includes(this.type);
      },
      validate: {
        validator: function(value) {
          return value > this.scaleOptions.min;
        },
        message: 'Maximum scale value must be greater than minimum'
      }
    },
    labels: {
      start: {
        type: String,
        trim: true,
        required: function() {
          return this.type === 'Linear_Scale';
        }
      },
      end: {
        type: String,
        trim: true,
        required: function() {
          return this.type === 'Linear_Scale';
        }
      }
    },
    step: {
      type: Number,
      default: 1,
      validate: {
        validator: function(value) {
          if (!['Rating', 'Linear_Scale'].includes(this.type)) return true;
          const range = this.scaleOptions.max - this.scaleOptions.min;
          return value > 0 && range / value <= 10; // Ensure no more than 10 steps
        },
        message: 'Invalid step value for scale'
      }
    }
  },
  category: {
    type: String,
    enum: {
      values: ['Teaching', 'Course_Content', 'Infrastructure', 'General'],
      message: '{VALUE} is not a supported category'
    },
    required: [true, 'Question category is required']
  },
  required: {
    type: Boolean,
    default: true
  },
  helpText: {
    type: String,
    trim: true,
    maxlength: [200, 'Help text cannot exceed 200 characters']
  },
  order: {
    type: Number,
    default: 0
  },
  validation: {
    minLength: Number,
    maxLength: Number,
    pattern: String,
    errorMessage: String
  }
}, {
  timestamps: true
});

// Schema for feedback form template with archive support
const FeedbackFormSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Form title is required'],
    trim: true,
    minlength: [3, 'Form title must be at least 3 characters long']
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  feedbackTypes: [{
    type: String,
    enum: ['Mid-Term', 'End-Term', 'Special'],
    required: true
  }],
  target: {
    years: {
      type: [{
        type: Schema.Types.ObjectId,
        ref: 'AcademicYear'
      }],
      validate: {
        validator: function(years) {
          // Either have specific years or isAllYears should be true
          return years.length > 0 || this.target.isAllYears;
        },
        message: 'At least one year must be selected if not selecting all years'
      }
    },
    branches: {
      type: [{
        type: Schema.Types.ObjectId,
        ref: 'Branch'
      }],
      validate: {
        validator: function(branches) {
          // Either have specific branches or isAllBranches should be true
          return branches.length > 0 || this.target.isAllBranches;
        },
        message: 'At least one branch must be selected if not selecting all branches'
      }
    },
    sections: {
      type: [{
        type: Schema.Types.ObjectId,
        ref: 'Section'
      }],
      validate: {
        validator: function(sections) {
          // Either have specific sections or isAllSections should be true
          return sections.length > 0 || this.target.isAllSections;
        },
        message: 'At least one section must be selected if not selecting all sections'
      }
    },
    isAllYears: {
      type: Boolean,
      default: false
    },
    isAllBranches: {
      type: Boolean,
      default: false
    },
    isAllSections: {
      type: Boolean,
      default: false
    }
  },
  questions: [{
    template: {
      type: Schema.Types.ObjectId,
      ref: 'QuestionTemplate',
      required: true
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject'
    },
    required: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['subject', 'infrastructure', 'general'],
      required: true
    }
  }],
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(endDate) {
        return endDate > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  status: {
    type: String,
    enum: ['Draft', 'Scheduled', 'Active', 'Expired', 'Archived'],
    default: 'Draft'
  },
  isAnonymous: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Plugin for auto-incrementing question order
FeedbackFormSchema.plugin(AutoIncrement, {
  inc_field: 'questions.order',
  disable_hooks: true
});

// Schema for individual student responses with enhanced validation
const FeedbackResponseSchema = new Schema({
  form: {
    type: Schema.Types.ObjectId,
    ref: 'FeedbackForm',
    required: true
  },
  student: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: function() {
      return !this.isAnonymous;
    }
  },
  section: {
    type: Schema.Types.ObjectId,
    ref: 'Section',
    required: true
  },
  subject: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  faculty: {
    type: Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true
  },
  responses: [{
    question: {
      type: Schema.Types.ObjectId,
      ref: 'QuestionTemplate',
      required: true
    },
    answer: {
      type: Schema.Types.Mixed,
      validate: {
        validator: async function(answer) {
          const question = await mongoose.model('QuestionTemplate').findById(this.question);
          if (!question) return false;

          // Validation based on question type
          switch (question.type) {
            case 'Rating':
            case 'Linear_Scale':
              return answer >= question.ratingScale.min && answer <= question.ratingScale.max;
            case 'MCQ':
              return question.options.some(opt => opt.value === answer);
            case 'Text':
              return typeof answer === 'string' && answer.length > 0;
            default:
              return true;
          }
        },
        message: 'Invalid answer for question type'
      }
    }
  }],
  isAnonymous: {
    type: Boolean,
    default: false
  },
  timeToComplete: {
    type: Number,  // in seconds
    required: true
  },
  startedAt: Date,
  completedAt: Date
}, { timestamps: true });

// Schema for detailed analytics
const FeedbackAnalyticsSchema = new Schema({
  form: {
    type: Schema.Types.ObjectId,
    ref: 'FeedbackForm',
    required: true
  },
  subject: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  faculty: {
    type: Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true
  },
  section: {
    type: Schema.Types.ObjectId,
    ref: 'Section',
    required: true
  },
  responseStats: {
    total: Number,
    completed: Number,
    anonymous: Number,
    averageTimeToComplete: Number,
    completionRate: Number
  },
  questionStats: [{
    question: {
      type: Schema.Types.ObjectId,
      ref: 'QuestionTemplate'
    },
    mcqStats: {
      optionCounts: Map,
      mostCommonAnswer: Schema.Types.Mixed,
      responseDistribution: Map
    },
    ratingStats: {
      average: Number,
      median: Number,
      mode: Number,
      standardDeviation: Number,
      distribution: Map
    },
    textStats: {
      responseCount: Number,
      averageLength: Number,
      commonKeywords: [{
        word: String,
        count: Number
      }],
      sentimentScore: Number
    }
  }],
  temporalAnalysis: {
    dailyResponses: [{
      date: Date,
      count: Number
    }],
    peakSubmissionTimes: [{
      hour: Number,
      count: Number
    }]
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes for optimized querying
FeedbackFormSchema.index({ status: 1, 'target.sections': 1 });
FeedbackFormSchema.index({ status: 1, 'target.branches': 1 });
FeedbackFormSchema.index({ academicYear: 1, semester: 1, status: 1 });
FeedbackResponseSchema.index({ form: 1, student: 1 });
FeedbackResponseSchema.index({ form: 1, section: 1 });
FeedbackResponseSchema.index({ 'responses.answer': 'text' });  // Text index for text analysis
FeedbackAnalyticsSchema.index({ form: 1, subject: 1, faculty: 1 });

// Middleware to update status based on dates
FeedbackFormSchema.pre('save', function(next) {
  const now = new Date();
  if (now < this.startDate) {
    this.status = 'Draft';
  } else if (now >= this.startDate && now <= this.endDate) {
    this.status = 'Active';
  } else {
    this.status = 'Expired';
  }
  next();
});

// Utility functions for statistical calculations
const StatisticalUtils = {
  calculateMean: (numbers) => {
    return numbers.length ? numbers.reduce((sum, num) => sum + num, 0) / numbers.length : 0;
  },

  calculateMedian: (numbers) => {
    if (!numbers.length) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? 
      sorted[middle] : 
      (sorted[middle - 1] + sorted[middle]) / 2;
  },

  calculateMode: (numbers) => {
    if (!numbers.length) return 0;
    const frequency = new Map();
    let maxFreq = 0;
    let mode = numbers[0];

    numbers.forEach(num => {
      const count = (frequency.get(num) || 0) + 1;
      frequency.set(num, count);
      if (count > maxFreq) {
        maxFreq = count;
        mode = num;
      }
    });
    return mode;
  },

  calculateStandardDeviation: (numbers, mean) => {
    if (!numbers.length) return 0;
    mean = mean || StatisticalUtils.calculateMean(numbers);
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
    return Math.sqrt(variance);
  },

  createDistributionMap: (numbers, bins = 10) => {
    if (!numbers.length) return new Map();
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const binSize = (max - min) / bins;
    const distribution = new Map();

    for (let i = 0; i < bins; i++) {
      const binStart = min + (i * binSize);
      const binEnd = binStart + binSize;
      const count = numbers.filter(n => n >= binStart && (i === bins - 1 ? n <= binEnd : n < binEnd)).length;
      distribution.set(`${binStart.toFixed(1)}-${binEnd.toFixed(1)}`, count);
    }
    return distribution;
  },

  extractKeywords: (text) => {
    // Remove common words and punctuation
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to']);
    const words = text.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
    
    // Count word frequency
    const frequency = new Map();
    words.forEach(word => {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });

    // Sort by frequency and return top words
    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
  },

  // Basic sentiment analysis (can be replaced with more sophisticated solution)
  calculateSentiment: (text) => {
    const positiveWords = new Set(['good', 'great', 'excellent', 'amazing', 'outstanding', 'helpful', 'clear', 'effective']);
    const negativeWords = new Set(['bad', 'poor', 'unclear', 'confusing', 'ineffective', 'unhelpful', 'difficult']);
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    words.forEach(word => {
      if (positiveWords.has(word)) score++;
      if (negativeWords.has(word)) score--;
    });
    
    // Normalize to range [-1, 1]
    return words.length ? score / Math.max(words.length, Math.abs(score)) : 0;
  }
};

// Main updateStats method implementation
FeedbackAnalyticsSchema.methods.updateStats = async function() {
  try {
    // Get all responses for this form, subject, and faculty combination
    const responses = await mongoose.model('FeedbackResponse').find({
      form: this.form,
      subject: this.subject,
      faculty: this.faculty,
      section: this.section
    }).populate('responses.question');

    // Update response statistics
    this.responseStats = {
      total: responses.length,
      completed: responses.filter(r => r.responses.length > 0).length,
      anonymous: responses.filter(r => r.isAnonymous).length,
      averageTimeToComplete: responses.reduce((sum, r) => sum + (r.timeToComplete || 0), 0) / responses.length || 0,
      completionRate: responses.length ? (responses.filter(r => r.responses.length > 0).length / responses.length) * 100 : 0
    };

    // Group responses by question
    const questionResponses = new Map();
    responses.forEach(response => {
      response.responses.forEach(r => {
        if (!questionResponses.has(r.question.id)) {
          questionResponses.set(r.question.id, []);
        }
        questionResponses.get(r.question.id).push({
          answer: r.answer,
          type: r.question.type
        });
      });
    });

    // Process each question's responses
    this.questionStats = await Promise.all(Array.from(questionResponses.entries()).map(async ([questionId, answers]) => {
      const question = await mongoose.model('QuestionTemplate').findById(questionId);
      const stats = {
        question: questionId
      };

      switch (question.type) {
        case 'MCQ':
          const mcqAnswers = answers.map(a => a.answer);
          stats.mcqStats = {
            optionCounts: new Map(),
            responseDistribution: new Map()
          };
          mcqAnswers.forEach(answer => {
            stats.mcqStats.optionCounts.set(
              answer, 
              (stats.mcqStats.optionCounts.get(answer) || 0) + 1
            );
          });
          // Find most common answer
          stats.mcqStats.mostCommonAnswer = Array.from(stats.mcqStats.optionCounts.entries())
            .reduce((a, b) => (a[1] > b[1] ? a : b))[0];
          break;

        case 'Rating':
        case 'Linear_Scale':
          const numericAnswers = answers.map(a => parseFloat(a.answer));
          const mean = StatisticalUtils.calculateMean(numericAnswers);
          stats.ratingStats = {
            average: mean,
            median: StatisticalUtils.calculateMedian(numericAnswers),
            mode: StatisticalUtils.calculateMode(numericAnswers),
            standardDeviation: StatisticalUtils.calculateStandardDeviation(numericAnswers, mean),
            distribution: StatisticalUtils.createDistributionMap(numericAnswers)
          };
          break;

        case 'Text':
          const textAnswers = answers.map(a => a.answer);
          stats.textStats = {
            responseCount: textAnswers.length,
            averageLength: textAnswers.reduce((sum, text) => sum + text.length, 0) / textAnswers.length,
            commonKeywords: StatisticalUtils.extractKeywords(textAnswers.join(' ')),
            sentimentScore: StatisticalUtils.calculateSentiment(textAnswers.join(' '))
          };
          break;
      }
      return stats;
    }));

    // Update temporal analysis
    const submissionTimes = responses.map(r => r.createdAt);
    this.temporalAnalysis = {
      dailyResponses: Array.from(
        submissionTimes.reduce((acc, date) => {
          const day = date.toISOString().split('T')[0];
          acc.set(day, (acc.get(day) || 0) + 1);
          return acc;
        }, new Map())
      ).map(([date, count]) => ({ date: new Date(date), count })),
      
      peakSubmissionTimes: Array.from(
        submissionTimes.reduce((acc, date) => {
          const hour = date.getHours();
          acc.set(hour, (acc.get(hour) || 0) + 1);
          return acc;
        }, new Map())
      ).map(([hour, count]) => ({ hour, count }))
    };

    this.lastUpdated = new Date();
    await this.save();
    
    return this;
  } catch (error) {
    console.error('Error updating feedback analytics:', error);
    throw error;
  }
};

// Middleware to trigger stats update after new responses
FeedbackResponseSchema.post('save', async function(doc) {
  try {
    const analytics = await mongoose.model('FeedbackAnalytics').findOne({
      form: doc.form,
      subject: doc.subject,
      faculty: doc.faculty,
      section: doc.section
    });
    
    if (analytics) {
      await analytics.updateStats();
    }
  } catch (error) {
    console.error('Error in post-save middleware:', error);
  }
});

// Schema for individual questions within a template
const QuestionSchema = new Schema({
  text: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
    minlength: [3, 'Question text must be at least 3 characters long']
  },
  type: {
    type: String,
    enum: {
      values: ['MCQ', 'Rating', 'Text', 'Linear_Scale'],
      message: '{VALUE} is not a supported question type'
    },
    required: [true, 'Question type is required']
  },
  category: {
    type: String,
    enum: {
      values: ['Teaching', 'Course_Content', 'Infrastructure', 'General'],
      message: '{VALUE} is not a supported category'
    },
    required: [true, 'Question category is required']
  },
  required: {
    type: Boolean,
    default: true
  },
  options: [{
    text: {
      type: String,
      trim: true
    },
    value: Schema.Types.Mixed
  }],
  scaleOptions: {
    min: {
      type: Number,
      default: 1
    },
    max: {
      type: Number,
      default: 5
    },
    labels: {
      start: String,
      end: String
    }
  },
  order: {
    type: Number,
    default: 0
  }
});

// Main FeedbackTemplate schema
const FeedbackTemplateSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Template title is required'],
    trim: true,
    minlength: [3, 'Template title must be at least 3 characters long']
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['Teaching', 'Infrastructure', 'General'],
    required: true
  },
  questions: [QuestionSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});


// Virtuals
FeedbackTemplateSchema.virtual('questionCount').get(function() {
  return this.questions.length;
});

// Pre-save middleware to ensure questions have order
FeedbackTemplateSchema.pre('save', function(next) {
  this.questions.forEach((question, index) => {
    question.order = index;
  });
  next();
});

// Methods
FeedbackTemplateSchema.methods.duplicate = async function() {
  const duplicate = new this.constructor({
    ...this.toObject(),
    _id: undefined,
    title: `${this.title} (Copy)`,
    createdAt: undefined,
    updatedAt: undefined,
    questions: this.questions.map(q => ({
      ...q.toObject(),
      _id: undefined
    }))
  });
  return await duplicate.save();
};

// Statics
FeedbackTemplateSchema.statics.findActiveTemplates = function() {
  return this.find({ isActive: true }).sort('-createdAt');
};

// Indexes
FeedbackTemplateSchema.index({ title: 1 });
FeedbackTemplateSchema.index({ createdAt: -1 });
FeedbackTemplateSchema.index({ isActive: 1 });

const FeedbackTemplate = mongoose.model('FeedbackTemplate', FeedbackTemplateSchema);

module.exports = {
  StatisticalUtils,
  FeedbackTemplate,
  QuestionTemplate: mongoose.model('QuestionTemplate', QuestionTemplateSchema),
  FeedbackForm: mongoose.model('FeedbackForm', FeedbackFormSchema),
  FeedbackResponse: mongoose.model('FeedbackResponse', FeedbackResponseSchema),
  FeedbackAnalytics: mongoose.model('FeedbackAnalytics', FeedbackAnalyticsSchema)
};