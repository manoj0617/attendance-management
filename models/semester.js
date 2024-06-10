const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SemesterSchema = new Schema({
  name: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Semester', SemesterSchema);
