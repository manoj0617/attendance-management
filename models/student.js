const { required } = require("joi");
const mongoose=require("mongoose");
const {Schema}=mongoose;
const passportLocalMongoose = require('passport-local-mongoose');

const studentSchema=mongoose.Schema({
    email:{
        type:String,
        required:true,
    },
    name:{
        type:String,
        required:true,
    },
    branch: {
        type: Schema.Types.ObjectId,
        ref: 'Branch',
        required: true
    },
    year:{
        type: Schema.Types.ObjectId,
        ref: 'AcademicYear',
        required: true
    },
    gender:{
        type:String,
        required:true,
        enum:['M','F'],
    },
    section: { type: Schema.Types.ObjectId, ref: 'Section' },
});

studentSchema.plugin(passportLocalMongoose);

Student=mongoose.model("Student",studentSchema);
module.exports=Student;