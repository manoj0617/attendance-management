const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TimetableSchema = new Schema({
  class: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  section: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
  day: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  faculty: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true }
});

module.exports = mongoose.model('Timetable', TimetableSchema);
