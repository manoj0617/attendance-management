// models/Student.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const passportLocalMongoose = require('passport-local-mongoose');

// Check if model exists before defining
if (mongoose.models.Student) {
  module.exports = mongoose.models.Student;
} else {
  const studentSchema = new Schema({
    email: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    rollNo: {
      type: String,
      required: true,
      unique: true
    },
    branch: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true
    },
    year: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true
    },
    gender: {
      type: String,
      required: true,
      enum: ['M', 'F'],
    },
    section: { 
      type: Schema.Types.ObjectId, 
      ref: 'Section' 
    },
    academicHistory: [{
      academicYear: {
        type: Schema.Types.ObjectId,
        ref: 'AcademicYear'
      },
      section: {
        type: Schema.Types.ObjectId,
        ref: 'Section'
      },
      semester: {
        type: Schema.Types.ObjectId,
        ref: 'Semester'
      },
      status: {
        type: String,
        enum: ['active', 'detained', 'graduated', 'dropout'],
        default: 'active'
      }
    }],
    currentYear: {
      type: Number,  // 1, 2, 3, or 4
      required: true,
      default: 1
    }
  });

  studentSchema.plugin(passportLocalMongoose);
  
  module.exports = mongoose.model('Student', studentSchema);
}