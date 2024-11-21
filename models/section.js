const mongoose = require('mongoose');
const Schema = mongoose.Schema;

if (mongoose.models.Section) {
    module.exports = mongoose.models.Section;
  } else {
const sectionSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    year: {
        type: Schema.Types.ObjectId,
        ref: 'AcademicYear',
        required: true
    },
    currentSemester: {
        type: Schema.Types.ObjectId,
        ref: 'Semester',
    },
    branch: {
        type: Schema.Types.ObjectId,
        ref: 'Branch',
        required: true
    },
    class_teacher: {
        type: Schema.Types.ObjectId,
        ref: 'Faculty',
    },
    room_no: {
        type: String,
    },
    students: [
        {
            student: {
                type: Schema.Types.ObjectId,
                ref: "Student",
                required: true
            },
            batch: {
                type: Schema.Types.ObjectId,
                ref: "Batch"
            }
        }
    ],
    facultySubjects: [
        {
            faculty: {
                type: Schema.Types.ObjectId,
                ref: 'Faculty',
                required: true
            },
            subject: {
                type: Schema.Types.ObjectId,
                ref: 'Subject',
                required: true
            },
            semester: {
                type: Schema.Types.ObjectId,
                ref: 'Semester',
                required: true
            }
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model("Section", sectionSchema);
  }