const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sectionSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    branch: {
        type: Schema.Types.ObjectId,
        ref: 'Branch',
        required: true
    },
    students: [
        {
            student: {
                type: Schema.Types.ObjectId,
                ref: "Student",
                required: true
            },
            batch: 
                {
                    type: Schema.Types.ObjectId,
                    ref: "Batch"
                }
            
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model("Section", sectionSchema);
