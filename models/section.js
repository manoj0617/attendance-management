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
    yearOfStudy: {  // This represents 1st year, 2nd year etc.
        type: Number,
        required: true,
        enum: [1, 2, 3, 4]
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
            },
            status: {
                type: String,
                enum: ['active', 'detained', 'graduated', 'dropout'],
                default: 'active'
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
    ],
    isActive: {
        type: Boolean,
        default: true
      }
}, { timestamps: true });

module.exports = mongoose.model("Section", sectionSchema);
  }