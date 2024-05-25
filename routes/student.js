const express=require('express');
const passport=require('passport');
const router=express.Router({mergeParams:true});
const Student=require('../models/student');
const wrapAsync=require('../utils/wrapAsync.js');
const {isStudentLoggedIn, saveRedirectUrl}=require('../middleware.js');
const LocalStrategy=require('passport-local');
const Course=require('../models/course.js');
const Attendance=require("../models/attendance.js");
const moment=require('moment');
const {Parser}=require('json2csv');
const json2csvParser=new Parser();


router.get('/login',(req,res)=>{
    return res.render('student/login.ejs');
});
router.post('/login',saveRedirectUrl,passport.authenticate('local-student',{failureRedirect:'/student/login',failureFlash:true}),wrapAsync((req,res)=>{
    req.flash("success","welcome back!");
    let redirectUrl=res.locals.redirectUrl || '/student/courses';
    return res.redirect(redirectUrl);
}));
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log("Received login data:", username, password); // Log received data
  
    try {
      const user = await passport.authenticate('local-student', req, res);
      console.log("Authenticated user:", user); // Log authenticated user
  
      if (user) {
        req.login(user, (err) => {
          if (err) {
            console.error(err); // Log any errors during login
            return res.redirect('/login'); // Redirect back to login on error
          }
          return res.redirect('/student/dashboard'); // Redirect to student dashboard on success
        });
      } else {
        req.flash('error', 'Invalid username or password'); // Set flash message
        res.redirect('/login'); // Redirect back to login on failed authentication
      }
    } catch (err) {
      console.error(err); // Log any errors during authentication process
      res.redirect('/login'); // Redirect back to login on error
    }
  });
router.get('/signup',(req,res)=>{
    return res.render('student/signup.ejs');
});
router.post('/signup',async(req,res)=>{
    try{
    let {name,email,username,password,dept,year}=req.body;
    console.log(req.body);
    let newStudent=new Student({name,email,username,dept,year});
    let registeredStudent=await Student.register(newStudent,password);
    console.log(registeredStudent);
    req.login(registeredStudent,(err)=>{
        if(err){
            req.flash("success","you are registered successfully!");
            return next(err);
        }
        res.redirect('/student/courses');
    });
    }catch(err){
        console.log(err);
        req.flash("error",err.message);
        return res.redirect('/student/signup');
    }
});
router.get('/logout',(req,res,next)=>{
    req.logOut((err)=>{
        if(err)
        return next(err);
        req.flash("success","logged out successfully!");
        res.redirect('/');
    });
});
router.get("/courses",isStudentLoggedIn,wrapAsync(async (req,res)=>{
  let {dept,year,name,username}=req.user;
  let courses=await Course.find({dept:dept,year:year}).populate("faculty");
  let attendances=await Attendance.find({year:year,roll:username,name:name});
  console.log(attendances);
  let p=0,percentage=0;
  if(attendances.length){
  for(let attendance of attendances){
    if(attendance.status=='present'){
      p++;
    };
  }
  percentage=((p/attendances.length)*100).toFixed(2);
  console.log(p,attendances.length,percentage);
}
  return res.render("student/courses.ejs",{courses,percentage,attendances});
}));
router.get("/courses/:id",isStudentLoggedIn,wrapAsync(async(req,res)=>{
  let {id}=req.params;
  let {name,username}=req.user;
  let x=0;
  const options1 = { year: 'numeric', month: 'long', day: 'numeric' };
  let course=await Course.findById(id);
  let attendances=await Attendance.find({name:name,roll:username,course:course.course});
  let p=0,percentage=0;
  if(attendances.length){
  for(let attendance of attendances){
    if(attendance.status=='present'){
      p++;
    };
  }
  percentage=((Math.round(p/attendances.length))*100).toFixed(2);
  // console.log(percentage,attendances.length);
}
  res.render("student/attendance.ejs",{attendances,x,moment,course,percentage});
}));
router.get("/download",isStudentLoggedIn,wrapAsync(async(req,res)=>{
  let {dept,year}=req.user;
  let courses=await Course.find({dept:dept,year:year});
  res.render("student/download.ejs",{courses});
}));
router.post("/download", isStudentLoggedIn, wrapAsync(async (req, res) => {
  let {name}=req.user;
  let { from, to, course} = req.body;
  let attendances = [];
  const toObject = new Date(to);
  const dateObject = new Date(from);

  while (dateObject.getTime() <= toObject.getTime()) {
    let attendance = await Attendance.find({ date: dateObject, course: course,name:name}).lean(); // Use lean() to get plain JavaScript objects
    if (attendance.length) {
      attendances = attendances.concat(attendance); // Reassign the concatenated result back to attendances
    }
    dateObject.setDate(dateObject.getDate() + 1);
  }

  if (attendances.length === 0) {
    req.flash("error", "No attendance records found for the selected date range.");
    return res.redirect('/student/download');
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
module.exports=router;