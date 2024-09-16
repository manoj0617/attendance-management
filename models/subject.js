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
  semester: {
    type: Schema.Types.ObjectId,
    ref: 'Semester',
  },
  type:{
    type: String,
    required: true,
    enum:['Theory','Practical','Non-Academic'],
  },
  code: {
    type: String,
  }
});

module.exports = mongoose.model('Subject', SubjectSchema);
