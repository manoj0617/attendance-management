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
    dept:{
        type:String,
        required:true,
    },
    year:{
        type:String,
        required:true,
    }
});

studentSchema.plugin(passportLocalMongoose);

Student=mongoose.model("Student",studentSchema);
module.exports=Student;