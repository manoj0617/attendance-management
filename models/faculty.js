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
});
facultySchema.plugin(passportLocalMongoose);

Faculty=mongoose.model("Faculty",facultySchema);
module.exports=Faculty;