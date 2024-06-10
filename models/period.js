const mongoose = require('mongoose');

const PeriodSchema = new mongoose.Schema({
  hour: {
    type: Number,
    required: true,
  },
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
  },
  semester: {
    type: Number,
    required: true,
  },
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('Period', PeriodSchema);
