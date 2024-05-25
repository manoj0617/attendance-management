const mongoose=require("mongoose");
const {Schema}=mongoose;
const Faculty=require('./faculty');

const courseSchema=mongoose.Schema({
    dept:{
        type:String,
        required:true,
    },
    course:{
        type:String,
        required:true,
    },
    faculty:{
        type:Schema.Types.ObjectId,
        ref:"Faculty",
    },
    year:{
        type:String,
        required:true,
    },
});

const Course=mongoose.model("Course",courseSchema);
module.exports=Course;