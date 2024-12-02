const mongoose = require('mongoose');
const Schema = mongoose.Schema;
if (mongoose.models.AcademicYear) {
  module.exports = mongoose.models.AcademicYear;
} else {
  const AcademicYearSchema = new Schema({
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    semesters: [{
      sem: {
        type: Schema.Types.ObjectId,
        ref: 'Semester'
      },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      isActive: { type: Boolean, default: false }
    }]
  });
module.exports = mongoose.model('AcademicYear', AcademicYearSchema);
}