const mongoose = require("mongoose");
const { Schema } = mongoose;
const passportLocalMongoose = require('passport-local-mongoose');

const facultySchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,  // Ensures email is unique across all faculty
    },
    name: {
        type: String,
        required: true,
    },
    branch: {
        type: Schema.Types.ObjectId,
        ref: 'Branch',
        required: true,
    },
    mobile: {
        type: Number,
        required: true,
    },
    pan: {
        type: String,  // PAN numbers are usually alphanumeric (Indian PAN)
    },
    aadhar: {
        type: String,  // Aadhaar numbers are strings (12-digit number stored as string)
    },
    motherName: {  // Fixed typo from motherNmae to motherName
        type: String,
    },
    fatherName: {
        type: String,
    },
    sections: [{
        type: Schema.Types.ObjectId,
        ref: 'Section',  // Store section references directly
    }],
    subjects: [{
        type: Schema.Types.ObjectId,
        ref: 'Subject',  // Store subject references
    }],
    periods: [{
        type: Schema.Types.ObjectId,
        ref: 'Period',  // Store references to periods taught
    }],
}, { timestamps: true });  // Automatically manage createdAt and updatedAt timestamps

// Adds username and password fields, password hashing, and related methods to the schema
facultySchema.plugin(passportLocalMongoose);

// Creating and exporting the Faculty model
const Faculty = mongoose.model("Faculty", facultySchema);
module.exports = Faculty;
