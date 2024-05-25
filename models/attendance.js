const mongoose=require("mongoose");
const {Schema}=mongoose;
const moment=require('moment');

const attendanceSchema=mongoose.Schema({
    roll:{
        type:String,
        required:true,
    },
    course:{
        type:String,
        required:String,
    },
    year:{
        type:String,
        required:true,
    },
    name:{
        type:String,
        required:true,
    },
    date:{
        type:Date,
        // get:()=>{
        //     return moment.utc(this.getDataValue("date")).format("YYYY-MM-DD");
        // },
    },
    status:{
        type:String,
        required:true,
    },
});
Attendance=mongoose.model('Attendance',attendanceSchema);
module.exports=Attendance;