const express = require('express');
const passport = require('passport');
const Admin = require('../models/admin');
const { isAdminLoggedIn } = require('../middleware');
const router = express.Router();
const Student=require('../models/student');
const Faculty=require('../models/faculty');
const Section=require("../models/section");

router.get('/login', (req, res) => {
  res.render('admin/login');
});

router.post('/login', passport.authenticate('local-admin', {
  failureFlash: true,
  failureRedirect: '/admin/login'
}), (req, res) => {
  req.flash('success', 'Welcome back!');
  res.redirect('/admin/dashboard');
});

router.get('/logout', (req, res, next) => {
  req.logOut((err) => {
      if (err) return next(err);
      req.flash("success", "Logged out successfully!");
      res.redirect('/');
  });
});
router.get('/dashboard',isAdminLoggedIn,(req,res)=>{
  res.render('admin/dashboard');
});
// Route to display the student management page with search functionality
router.get('/student', isAdminLoggedIn, async (req, res) => {
  const students = [];
  const sections = await Section.find({});
  res.render('admin/student', { students, sections });
});
// Route to handle the search query and return filtered students
router.get('/student/search', isAdminLoggedIn, async (req, res) => {
  const { username, dept, year, section } = req.query;
  let filter = {};

  if (username) {
      filter.username = { $regex: username, $options: 'i' };
  }
  if (dept) {
      filter.dept = dept;
  }
  if (year) {
      filter.year = year;
  }
  if (section) {
      filter.section = section;
  }

  const students = await Student.find(filter).populate('section');
  const sections = await Section.find({});

  res.render('admin/student', { students, sections });
});
router.get('/student/new',(req,res)=>{
  res.render('admin/createStudent.ejs');
});
// Route to view detailed information of a student
router.get('/student/:id', isAdminLoggedIn, async (req, res) => {
  try {
      const student = await Student.findById(req.params.id).populate('section');
      if (!student) {
          req.flash('error', 'Student not found');
          return res.redirect('/admin/student');
      }
      res.render('admin/viewStudent', { student });
  } catch (err) {
      console.log(err);
      req.flash('error', 'An error occurred');
      res.redirect('/admin/student');
  }
});
router.post('/student/new',async (req, res) => {
  try {
      let { name, email, username, password, dept, year,gender } = req.body;
      console.log(req.body);
      let newStudent = new Student({ name, email, username, dept, year , gender });
      let registeredStudent = await Student.register(newStudent, password);
      console.log(registeredStudent);
      res.redirect("/admin/student/new");
  } catch (err) {
      console.log(err);
      req.flash("error", err.message);
      return res.redirect('/student/signup');
  }
});
router.get('/faculty', isAdminLoggedIn, async (req, res) => {
  const faculty = await Faculty.find({});
  res.render('admin/faculty.ejs', { faculty });
});
router.get('/section', isAdminLoggedIn, async (req, res) => {
  const sections = await Section.find({});
  res.render('admin/section.ejs', { sections });
});
router.get('/attendance', isAdminLoggedIn, async (req, res) => {
  // Logic to get and display attendance records
  res.render('admin/attendance.ejs');
});
router.get("/section/new",(req,res)=>{
  res.render("admin/createSection.ejs");
});
router.post("/section/new",async(req,res)=>{
  let {name,branch}=req.body;
  console.log(req.body);
  let newSection= new Section({
    name,branch
  });
  let data=await newSection.save();
  console.log(data);
  res.redirect("/admin/section");
});
router.get("/section/:id", async (req, res) => {
  let { id } = req.params;
  let section = await Section.findById(id).populate('students');
  
  if (!section) {
    req.flash('error', 'Section not found');
    return res.redirect('/admin/section');
  }
  let x=0;
  let students = section.students;
  console.log(students, section);
  res.render("admin/showSection.ejs", { students, id ,x});
});
router.get('/student/:id/edit', isAdminLoggedIn, async (req, res) => {
  try {
      const student = await Student.findById(req.params.id);
      if (!student) {
          req.flash('error', 'Student not found');
          return res.redirect('/admin/student');
      }
      res.render('admin/studentEdit.ejs', { student });
  } catch (err) {
      console.log(err);
      req.flash('error', 'An error occurred');
      res.redirect('/admin/student');
  }
});

// Route to handle the student update
router.put('/student/:id', isAdminLoggedIn, async (req, res) => {
  const { name, email, username, dept, year, gender } = req.body;
  try {
      await Student.findByIdAndUpdate(req.params.id, { name, email, username, dept, year, gender });
      req.flash('success', 'Student updated successfully');
      res.redirect(`/admin/student/${req.params.id}`);
  } catch (err) {
      console.log(err);
      req.flash('error', 'An error occurred while updating the student');
      res.redirect(`/admin/student/${req.params.id}/edit`);
  }
});
// Route to delete a student
router.delete('/student/:id', isAdminLoggedIn, async (req, res) => {
  const studentId = req.params.id;
  try {
    // Find the student
    const student = await Student.findByIdAndDelete(studentId);
    if (!student) {
      req.flash('error', 'Student not found');
      return res.redirect('/admin/student');
    }

    // Remove the student from all sections they are enrolled in
    await Section.updateMany({ students: studentId }, { $pull: { students: studentId } });

    // // Delete the student
    // await student.remove();

    req.flash('success', 'Student deleted successfully');
    res.redirect( '/admin/student'); // Redirect back to the previous page or /admin/student if referer is not present
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete student');
    res.redirect( '/admin/student');
  }
});
// Route to display form for adding students to a section
router.get('/section/:id/add-student', isAdminLoggedIn, async (req, res) => {
  const section = await Section.findById(req.params.id).populate('students');
  res.render('admin/addStudentToSection.ejs', { section });
});

// Route to handle search query for students
router.get('/section/:id/search-students', isAdminLoggedIn, async (req, res) => {
  const searchQuery = req.query.term;
  const students = await Student.find({ username: { $regex: searchQuery, $options: 'i' } });
  res.json(students);
});


// Adding a student to a section
router.post('/section/:id/add-student', isAdminLoggedIn, async (req, res) => {
  const sectionId = req.params.id;
  const studentId = req.body.studentId;

  const section = await Section.findById(sectionId);
  section.students.push(studentId);
  await section.save();

  const student = await Student.findById(studentId);
  student.section = sectionId;
  await student.save();

  req.flash('success', 'Student added successfully');
  res.redirect(`/admin/section/${sectionId}/add-student`);
});
// Route to delete a section
router.delete('/section/:id', isAdminLoggedIn, async (req, res) => {
  try {
      const { id } = req.params;
      // Find the section by ID and remove it
      const section = await Section.findByIdAndDelete(id);

      // If the section has students, update their section field to null
      await Student.updateMany({ section: id }, { section: null });

      if (!section) {
          req.flash('error', 'Section not found');
          return res.redirect('/admin/section');
      }

      req.flash('success', 'Section deleted successfully');
      res.redirect('/admin/section');
  } catch (err) {
      console.error(err);
      req.flash('error', 'An error occurred while deleting the section');
      res.redirect('/admin/section');
  }
});


// Route to edit student details
router.get('/section/:id/edit-student/:studentId', isAdminLoggedIn, async (req, res) => {
  const student = await Student.findById(req.params.studentId);
  res.render('admin/editStudent.ejs', { student, sectionId: req.params.id });
});

router.put('/section/:id/edit-student/:studentId', isAdminLoggedIn, async (req, res) => {
  try {
    const { name, email, username, dept, year, gender } = req.body;
    const studentId = req.params.studentId;

    // Update the student details
    await Student.findByIdAndUpdate(studentId, { name, email, username, dept, year, gender });

    req.flash('success', 'Student updated successfully');
    res.redirect( `/admin/section/${req.params.id}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update student');
    res.redirect(`/admin/section/${req.params.id}`);
  }
});

// Route to remove a student from a section
router.put('/section/:sectionId/delete-student/:studentId', isAdminLoggedIn, async (req, res) => {
  const { sectionId, studentId } = req.params;
  try {
    // Remove the student from the section
    const section = await Section.findById(sectionId);
    if (!section) {
      req.flash('error', 'Section not found');
      return res.redirect(req.headers.referer || '/admin/section');
    }
    section.students.pull(studentId);
    await section.save();

    // Unset the section field in the student document
    await Student.findByIdAndUpdate(studentId, { $unset: { section: 1 } });

    req.flash('success', 'Student removed from section');
    res.redirect( `/admin/section/${sectionId}/add-student`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to remove student from section');
    res.redirect( `/admin/section/${sectionId}/add-student`);
  }
});

module.exports = router;
