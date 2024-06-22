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
    branch:{type: Schema.Types.ObjectId,
        ref: 'Branch',
        required: true
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
    subjects:
        [
        {
            type: Schema.Types.ObjectId,
            ref: 'Subject',
        }
        ]    
});
facultySchema.plugin(passportLocalMongoose);

Faculty=mongoose.model("Faculty",facultySchema);
module.exports=Faculty;