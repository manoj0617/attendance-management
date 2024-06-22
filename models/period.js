const { required } = require('joi');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PeriodSchema = new Schema({
    hour:{
        type:Number,
        required:true,
    },
    faculty: {
        type: Schema.Types.ObjectId,
        ref: 'Faculty'
    },
    subject: {
        type: Schema.Types.ObjectId,
        ref: 'Subject'
    },
    year: {
        type: Schema.Types.ObjectId,
        ref: 'AcademicYear'
    },
    branch: {
        type: Schema.Types.ObjectId,
        ref: 'Branch'
    },
    semester: {
        type: String,
    required: true
    },
    section: {
        type: Schema.Types.ObjectId,
        ref: 'Section'
    },
    startTime: {
        type: String
    },
    endTime: {
        type: String
    },
    day: {
        type: String, // This will store the day of the week as a string (e.g., 'Monday')
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }
});

module.exports = mongoose.model('Period', PeriodSchema);
