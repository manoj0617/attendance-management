const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubjectSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  full_name: {
    type: String,
    required: true
  },
  academicYear: {
    type: Schema.Types.ObjectId,
    ref: 'AcademicYear',
    required: true
  },
  semester: {
    type: Schema.Types.ObjectId,
    ref: 'Semester',
    required: true
  },
  type:{
    type: String,
    required: true,
    enum:['Theory','Practical','Leisure'],
  },
  code: {
    type: String,
  }
});

module.exports = mongoose.model('Subject', SubjectSchema);
