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
    }
  });

  studentSchema.plugin(passportLocalMongoose);
  
  module.exports = mongoose.model('Student', studentSchema);
}