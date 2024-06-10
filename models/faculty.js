const { required } = require("joi");
const mongoose=require("mongoose");
const {Schema}=mongoose;
const passportLocalMongoose = require('passport-local-mongoose');

const facultySchema=mongoose.Schema({
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
    id:{
        type:String,
        required:true,
    },
    mobile:{
        type:Number,
        required:true,
    },
    pan:{
        type:Number,
    },
    aadhar:{
        type:Number,
    },
    motherNmae:{
        type:String,
    },
    fatherName:{
        type:String,
    },
});
facultySchema.plugin(passportLocalMongoose);

Faculty=mongoose.model("Faculty",facultySchema);
module.exports=Faculty;