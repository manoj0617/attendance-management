const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FeedbackSchema = new Schema({
  student: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  subject: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
  },
  semester: {
    type: Schema.Types.ObjectId,
    ref: 'Semester',
    required: true,
  },
  feedbackType: {
    type: String,
    enum: ['Mid-Term', 'End-Term'], // Two times per semester
    required: true,
  },
  responses: [
    {
      question: {
        type: String,
        required: true,
      },
      answer: {
        type: String,
        required: true,
      },
    },
  ],
  isAnonymous: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('Feedback', FeedbackSchema);
