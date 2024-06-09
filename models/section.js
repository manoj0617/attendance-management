const { required } = require('joi');
const mongoose = require('mongoose');
const Schema=mongoose.Schema;

const sectionSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    branch:{
        type:String,
        required:true,
    },
    students:
        [
        {
            type:Schema.Types.ObjectId,
            ref:"Student",
        }
        ]
}, { timestamps: true });

module.exports=mongoose.model("Section",sectionSchema);