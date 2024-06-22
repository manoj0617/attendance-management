const { required } = require('joi');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TimetableSchema = new Schema({
  section: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
  semester: {
    type: Schema.Types.ObjectId,
    ref: 'Semester',
    required: true
  },
  year:{
    type: Schema.Types.ObjectId,
    ref: 'AcademicYear',
    required: true
},
branch: {
  type: Schema.Types.ObjectId,
  ref: 'Branch',
  required: true
},
periods:[{
  type: Schema.Types.ObjectId,
  ref: 'Period',
}],
numPeriods:{
  type:Number,
  required:true
}
});

module.exports = mongoose.model('Timetable', TimetableSchema);
