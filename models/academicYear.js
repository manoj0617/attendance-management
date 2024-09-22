const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AcademicYearSchema = new Schema({
  name: { type: String, required: true }, // e.g., "2023-2024"
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  semesters: [{
    sem:{type: Schema.Types.ObjectId,
        ref: 'Semester'}, // e.g., "Fall 2023", "Spring 2024"
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  }]
});

module.exports = mongoose.model('AcademicYear', AcademicYearSchema);
