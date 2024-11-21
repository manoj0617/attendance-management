// models/Attendance.js
const mongoose = require('mongoose');

// Check if the model already exists before defining it
if (mongoose.models.Attendance) {
  module.exports = mongoose.models.Attendance;
} else {
  const attendanceSchema = new mongoose.Schema({
    students: [{
      student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
      },
      status: {
        type: Boolean, // true for Present (P), false for Absent (A)
        required: true
      }
    }],
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    period: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Period',
      required: true
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
    },
    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      required: true
    },
    year: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Year',
      required: true
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true
    },
    created_at: {
      type: Date,
      default: Date.now
    },
    updated_at: {
      type: Date,
      default: Date.now
    },
    auditLog: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      action: {
        type: String,
        required: true
      },
      reason: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  });

  attendanceSchema.pre('save', function(next) {
    this.updated_at = Date.now();
    next();
  });

  module.exports = mongoose.model('Attendance', attendanceSchema);
}