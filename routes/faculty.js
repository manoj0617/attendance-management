const express=require('express');
const passport=require('passport');
const router=express.Router({mergeParams:true});
const Faculty=require('../models/faculty');
const {isFacultyLoggedIn, saveRedirectUrl}=require('../middleware.js');
const wrapAsync=require('../utils/wrapAsync.js');
const Course=require('../models/course.js');
const Student=require('../models/student.js');
const Attendance=require("../models/attendance.js");
const LocalStrategy=require('passport-local');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const {Parser}=require('json2csv');
const json2csvParser=new Parser();

router.get('/login',(req,res)=>{
    return res.render('faculty/login.ejs');
});
router.post('/login',saveRedirectUrl,passport.authenticate('local-faculty',{failureRedirect:'/faculty/login',failureFlash:true}),wrapAsync((req,res)=>{
    req.flash("success","welcome back!");
    console.log(res.locals.currUser)
    let redirectUrl=res.locals.redirectUrl || '/faculty/courses';
    return res.redirect(redirectUrl);
}));
router.get('/signup',(req,res)=>{
    return res.render('faculty/signup.ejs');
});
router.post('/signup',async(req,res)=>{
    try{
        let {name,email,username,password,dept}=req.body;
        let newFaculty=new Faculty({name,email,username,dept});
        let registeredFaculty=await Faculty.register(newFaculty,password);
        req.login(registeredFaculty,(err)=>{
            if(err){
                req.flash("success","you are registered successfully!");
                return next(err);
            }
            res.redirect('/faculty/courses');
        });
    }catch(err){
        console.log(err);
        req.flash("error",err.message);
        return res.redirect('/faculty/signup');
    };
});
router.get("/courses",isFacultyLoggedIn,wrapAsync(async(req,res)=>{
    let courses=await Course.find({faculty:req.user._id})
    return res.render("faculty/courses.ejs",{courses});
}));
router.get("/create",isFacultyLoggedIn,wrapAsync((req,res)=>{
    return res.render("faculty/create.ejs");
}));
router.post("/create",isFacultyLoggedIn,wrapAsync(async (req,res)=>{
    let {course,year}=req.body;
    let {dept,name,_id}=req.user;
    let newCourse=new Course({
        dept:dept,
        course:course,
        faculty:_id,
        year:year,
    });
    await newCourse.save();
    return res.redirect('/faculty/courses');
}));
router.get("/courses/:id",isFacultyLoggedIn,wrapAsync(async(req,res)=>{
    let {id}=req.params;
    let course=await Course.findById(id);
    let x=0;
    let students= await Student.find({dept:course.dept,year:course.year});
    res.render("faculty/attendance.ejs",{course,students,x});
}));
router.post("/courses/:id",isFacultyLoggedIn,wrapAsync(async(req,res)=>{
    let {status,date,student}=req.body;
    let {id}=req.params;
    let course=await Course.findById(id);
     for(let i=0;i<student.length;i++){
        let newStudent=await Student.find({username:student[i]});
        console.log(newStudent);
        let newAttendance=new Attendance({
            roll:newStudent[0].username,
            name:newStudent[0].name,
            year:newStudent[0].year,
            date:date,
            status:status[0],
            course:course.course,
        });
        let res=await newAttendance.save();
        console.log(res);
     }
    res.redirect("/faculty/courses");
}));
router.get("/download",isFacultyLoggedIn,wrapAsync(async(req,res)=>{
    let {id}=req.user;
    let courses=await Course.find({faculty:id});
    res.render("faculty/download.ejs",{courses});
}));
router.post("/download", isFacultyLoggedIn, wrapAsync(async (req, res) => {
    let { from, to, course } = req.body;
    let attendances = [];
    const toObject = new Date(to);
    const dateObject = new Date(from);
  
    while (dateObject.getTime() <= toObject.getTime()) {
      let attendance = await Attendance.find({ date: dateObject, course: course }).lean(); // Use lean() to get plain JavaScript objects
      if (attendance.length) {
        attendances = attendances.concat(attendance); // Reassign the concatenated result back to attendances
      }
      dateObject.setDate(dateObject.getDate() + 1);
    }
  
    if (attendances.length === 0) {
      req.flash("error", "No attendance records found for the selected date range.");
      return res.redirect('/faculty/download');
    }
  
    // Define the fields for the CSV
    const fields = [
      { label: 'Roll', value: 'roll' },
      { label: 'Name', value: 'name' },
      { label: 'Year', value: 'year' },
      { label: 'Date', value: 'date' },
      { label: 'Status', value: 'status' },
      { label: 'Course', value: 'course' }
    ];
  
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(attendances);
  
    res.header('Content-Type', 'text/csv');
    res.attachment('attendance.csv');
    res.send(csv);
  }));
router.get('/logout',(req,res,next)=>{
    req.logOut((err)=>{
        if(err)
        return next(err);
        req.flash("success","logged out successfully!");
        res.redirect('/');
    });
});
module.exports=router;