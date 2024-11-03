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
  regulation: {
    type: String,
    required: true,
    ref: 'MarkingSchemeConfig'
  },
  type:{
    type: String,
    required: true,
    enum:['Theory','Lab','Non-Academic'],
  },
  credits:{
    type:Number
  },
  code: {
    type: String,
  }
});

module.exports = mongoose.model('Subject', SubjectSchema);
