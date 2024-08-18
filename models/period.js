const { required } = require('joi');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PeriodSchema = new Schema({
    hour:{
        type:Number,
        required:true,
    },
    room:{
        type: String
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
    batch: {
        type: Schema.Types.ObjectId,
        ref: 'Batch'
    },
    branch: {
        type: Schema.Types.ObjectId,
        ref: 'Branch'
    },
    semester: {
        type: Schema.Types.ObjectId,
        ref: 'Semester'
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
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }
});

module.exports = mongoose.model('Period', PeriodSchema);
