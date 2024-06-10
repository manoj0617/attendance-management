const express = require('express');
const passport = require('passport');
const Admin = require('../models/admin');
const { isAdminLoggedIn } = require('../middleware');
const router = express.Router();
const Student=require('../models/student');
const Faculty=require('../models/faculty');
const Section=require("../models/section");
const Timetable = require('../models/timetable');
const Period=require("../models/period");
const Branch = require('../models/branch');
const Semester = require('../models/semester');
const AcademicYear = require('../models/academicYear');
const Subject = require('../models/subject');

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
// Branch Management
router.get('/branches', isAdminLoggedIn, async (req, res) => {
  const branches = await Branch.find({}).populate('academicYear');
  res.render('admin/branches/index', { branches });
});

router.get('/branches/new', isAdminLoggedIn, async (req, res) => {
  const academicYears = await AcademicYear.find({});
  res.render('admin/branches/new', { academicYears });
});

router.post('/branches', isAdminLoggedIn, async (req, res) => {
  const { name, academicYear } = req.body;
  const branch = new Branch({ name, academicYear });
  await branch.save();
  req.flash('success', 'Branch created successfully');
  res.redirect('/admin/branches');
});

router.get('/branches/:id/edit', isAdminLoggedIn, async (req, res) => {
  const branch = await Branch.findById(req.params.id).populate('academicYear');
  const academicYears = await AcademicYear.find({});
  res.render('admin/branches/edit', { branch, academicYears });
});

router.put('/branches/:id', isAdminLoggedIn, async (req, res) => {
  const { name, academicYear } = req.body;
  await Branch.findByIdAndUpdate(req.params.id, { name, academicYear });
  req.flash('success', 'Branch updated successfully');
  res.redirect('/admin/branches');
});

router.delete('/branches/:id', isAdminLoggedIn, async (req, res) => {
  await Branch.findByIdAndDelete(req.params.id);
  req.flash('success', 'Branch deleted successfully');
  res.redirect('/admin/branches');
});

// Semester Management
router.get('/semesters', isAdminLoggedIn, async (req, res) => {
  const semesters = await Semester.find({});
  res.render('admin/semesters/index', { semesters });
});

router.get('/semesters/new', isAdminLoggedIn, (req, res) => {
  res.render('admin/semesters/new');
});

router.post('/semesters', isAdminLoggedIn, async (req, res) => {
  const { name } = req.body;
  const semester = new Semester({ name });
  await semester.save();
  req.flash('success', 'Semester created successfully');
  res.redirect('/admin/semesters');
});

router.get('/semesters/:id/edit', isAdminLoggedIn, async (req, res) => {
  const semester = await Semester.findById(req.params.id);
  res.render('admin/semesters/edit', { semester });
});

router.put('/semesters/:id', isAdminLoggedIn, async (req, res) => {
  const { name } = req.body;
  await Semester.findByIdAndUpdate(req.params.id, { name });
  req.flash('success', 'Semester updated successfully');
  res.redirect('/admin/semesters');
});

router.delete('/semesters/:id', isAdminLoggedIn, async (req, res) => {
  await Semester.findByIdAndDelete(req.params.id);
  req.flash('success', 'Semester deleted successfully');
  res.redirect('/admin/semesters');
});

// Academic Year Management
router.get('/academic-years', isAdminLoggedIn, async (req, res) => {
  const academicYears = await AcademicYear.find({});
  res.render('admin/academicYears/index', { academicYears });
});

router.get('/academic-years/new', isAdminLoggedIn, (req, res) => {
  res.render('admin/academicYears/new');
});

router.post('/academic-years', isAdminLoggedIn, async (req, res) => {
  const { name } = req.body;
  const academicYear = new AcademicYear({ name });
  await academicYear.save();
  req.flash('success', 'Academic Year created successfully');
  res.redirect('/admin/academic-years');
});

router.get('/academic-years/:id/edit', isAdminLoggedIn, async (req, res) => {
  const academicYear = await AcademicYear.findById(req.params.id);
  res.render('admin/academicYears/edit', { academicYear });
});

router.put('/academic-years/:id', isAdminLoggedIn, async (req, res) => {
  const { name } = req.body;
  await AcademicYear.findByIdAndUpdate(req.params.id, { name });
  req.flash('success', 'Academic Year updated successfully');
  res.redirect('/admin/academic-years');
});

router.delete('/academic-years/:id', isAdminLoggedIn, async (req, res) => {
  await AcademicYear.findByIdAndDelete(req.params.id);
  req.flash('success', 'Academic Year deleted successfully');
  res.redirect('/admin/academic-years');
});

// Subject Management
router.get('/subjects', isAdminLoggedIn, async (req, res) => {
  const subjects = await Subject.find({}).populate('academicYear').populate('semester');
  res.render('admin/subjects/index', { subjects });
});

router.get('/subjects/new', isAdminLoggedIn, async (req, res) => {
  const academicYears = await AcademicYear.find({});
  const semesters = await Semester.find({});
  res.render('admin/subjects/new', { academicYears, semesters });
});

router.post('/subjects', isAdminLoggedIn, async (req, res) => {
  const { name, academicYear, semester } = req.body;
  const subject = new Subject({ name, academicYear, semester });
  await subject.save();
  req.flash('success', 'Subject created successfully');
  res.redirect('/admin/subjects');
});

router.get('/subjects/:id/edit', isAdminLoggedIn, async (req, res) => {
  const subject = await Subject.findById(req.params.id).populate('academicYear').populate('semester');
  const academicYears = await AcademicYear.find({});
  const semesters = await Semester.find({});
  res.render('admin/subjects/edit', { subject, academicYears, semesters });
});

router.put('/subjects/:id', isAdminLoggedIn, async (req, res) => {
  const { name, academicYear, semester } = req.body;
  await Subject.findByIdAndUpdate(req.params.id, { name, academicYear, semester });
  req.flash('success', 'Subject updated successfully');
  res.redirect('/admin/subjects');
});

router.delete('/subjects/:id', isAdminLoggedIn, async (req, res) => {
  await Subject.findByIdAndDelete(req.params.id);
  req.flash('success', 'Subject deleted successfully');
  res.redirect('/admin/subjects');
});
router.get('/dashboard',isAdminLoggedIn,(req,res)=>{
  res.render('admin/dashboard');
});
// Fetch Academic Years
router.get('/academic-year', async (req, res) => {
  try {
      const academicYears = await AcademicYear.find({});
      res.json(academicYears);
  } catch (err) {
      res.status(500).send('Server Error');
  }
});

// Fetch Branches by Academic Year
router.get('/branch', async (req, res) => {
  try {
      const { year } = req.query;
      const branches = await Branch.find({ academicYear: year });
      res.json(branches);
  } catch (err) {
      res.status(500).send('Server Error');
  }
});

// Fetch Sections by Branch
router.get('/sections', async (req, res) => {
  try {
      const { branch } = req.query;
      const sections = await Section.find({ branch });
      res.json(sections);
  } catch (err) {
      res.status(500).send('Server Error');
  }
});
router.get('/subjects', async(req, res) => {
  const { branch, semester } = req.query;
  const subjects = await Subject.find({branch,semester});
  res.json(subjects);
});

router.get('/faculties', async(req, res) => {
  const { branch } = req.query;
  const faculties = await Faculty.find({branch:branch});
  res.json(faculties);
});
// Route to get the timetable creation and viewing page
router.get('/timetable', isAdminLoggedIn, async (req, res) => {
  try {
    const sections = await Section.find({});
    const { year, branch, section } = req.query;
    let periods = [];
    if (year && branch && section) {
      periods = await Period.find({ year, branch, section });
    }
    res.render('admin/timetable', { periods, sections, year, branch, section, message: req.flash('message') });
  } catch (error) {
    console.error(error);
    res.redirect('/error');
  }
});

// Route to add a new period
router.post('/timetable', isAdminLoggedIn, async (req, res) => {
  const { hour, day, branch, year, section, subject } = req.body;

  try {
    const newPeriod = new Period({ hour, day, branch, year, section, subject });
    await newPeriod.save();
    req.flash('success', 'Period added successfully');
    res.redirect(`/admin/timetable?year=${year}&branch=${branch}&section=${section}`);
  } catch (error) {
    console.error(error);
    req.flash('error', 'Error adding period');
    res.redirect(`/admin/timetable?year=${year}&branch=${branch}&section=${section}`);
  }
});

// Route to delete a period
router.delete('/timetable/:id', isAdminLoggedIn, async (req, res) => {
  try {
    const period = await Period.findById(req.params.id);
    await period.remove();
    req.flash('success', 'Period deleted successfully');
    res.redirect(`/admin/timetable?year=${period.year}&branch=${period.branch}&section=${period.section}`);
  } catch (error) {
    console.error(error);
    req.flash('error', 'Error deleting period');
    res.redirect('/admin/timetable');
  }
});
router.get('/timetable/new', (req, res) => {
  const numPeriods = req.query.numPeriods;
  const numDays = req.query.numDays;
  const section = req.query.section;
  const branch = req.query.branch;
  const semester = req.query.semester;
  res.render('admin/newTimetable', { numPeriods, numDays, section, branch, semester });
});
// Route to display the student management page with search functionality
// Fetch students and other required data
router.get('/student', async (req, res) => {
  try {
      const students = await Student.find({})
          .populate('branch')
          .populate('year');
      const academicYears = await AcademicYear.find({});
      const branches = await Branch.find({});
      const sections = await Section.find({});
    console.log(students, academicYears, branches, sections);
      res.render('admin/student', { students, academicYears: academicYears, branches, sections });
  } catch (err) {
      res.status(500).send('Server Error');
  }
});
// Route to handle the search query and return filtered students
router.get('/student/search', isAdminLoggedIn, async (req, res) => {
  const { username, branch, year, section } = req.query;
  let filter = {};

  if (username) {
      filter.username = { $regex: username, $options: 'i' };
  }
  if (branch) {
      filter.branch = branch;
  }
  if (year) {
      filter.year = year;
  }
  if (section) {
      filter.section = section;
  }

  const students = await Student.find(filter).populate('section');
  const sections = await Section.find({});
  const academicYears=await AcademicYear.find({name:year});

  res.render('admin/student', { students, sections,academicYears:academicYears });
});
// Render the signup form with academic years and branches
router.get('/student/new', async (req, res) => {
  try {
      const academicYears = await AcademicYear.find({});
      const branches = await Branch.find({});
      res.render('admin/createStudent', { academicYears, branches });
  } catch (err) {
      res.status(500).send('Server Error');
  }
});
// Load branches based on academic year
router.get('/branch/:yearId', isAdminLoggedIn, async (req, res) => {
  const branches = await Branch.find({ academicYear: req.params.yearId });
  res.json({ branches });
});

// Load sections based on branch
router.get('/section/:branchId', isAdminLoggedIn, async (req, res) => {
  const sections = await Section.find({ branch: req.params.branchId });
  res.json({ sections });
});
// Handle student signup form submission
router.post('/student/new', async (req, res) => {
  try {
      const { name, email, username, password, year, branch, gender } = req.body;
      const newStudent = new Student({ name, email, username, password, year, branch, gender });
      await newStudent.save();
      res.redirect('/admin/student');
  } catch (err) {
      res.status(500).send('Server Error');
  }
});
// GET /admin/student/:id
router.get('/student/:id', async (req, res) => {
  try {
      const studentId = req.params.id;
      const student = await Student.findById(studentId)
          .populate('branch')
          .populate('year')
          .populate('section')
          .exec();

      if (!student) {
          return res.status(404).send('Student not found');
      }

      res.render('admin/viewStudent', { student: student });
  } catch (error) {
      console.error('Error fetching student:', error);
      res.status(500).send('Error fetching student');
  }
});

router.get('/faculty', isAdminLoggedIn, async (req, res) => {
  const faculty = await Faculty.find({});
  res.render('admin/faculty.ejs', { faculty });
});
// Fetch all sections along with their branches and academic years
router.get('/section', async (req, res) => {
  try {
      const sections = await Section.find({})
          .populate({
              path: 'branch',
              populate: {
                  path: 'academicYear',
                  model: 'AcademicYear'
              }
          });
          console.log(sections);
      res.render('admin/section', { sections });
  } catch (err) {
      res.status(500).send('Server Error');
  }
});
// Display attendance form
router.get('/attendance', isAdminLoggedIn, async (req, res) => {
  try {
    const students = await Student.find();
    res.render('admin/attendance', { students });
  } catch (err) {
    req.flash('error', 'Unable to load students');
    res.redirect('/admin');
  }
});

// Handle attendance submission
router.post('/attendance', isAdminLoggedIn, async (req, res) => {
  const { attendance } = req.body; // attendance should be an array of { studentId, status }
  try {
    for (let entry of attendance) {
      await Attendance.create({
        student: entry.studentId,
        status: entry.status
      });
    }
    req.flash('success', 'Attendance recorded successfully');
    res.redirect('/admin/attendance');
  } catch (err) {
    req.flash('error', 'Error recording attendance');
    res.redirect('/admin/attendance');
  }
});
router.get("/section/new",(req,res)=>{
  res.render("admin/createSection.ejs");
});
// Create New Section
router.post('/section/new', async (req, res) => {
  try {
      const { branch, name } = req.body;
      const existingSection = await Section.findOne({ branch, name });
      if (existingSection) {
          return res.status(400).send('Section name must be unique within the branch');
      }
      const newSection = new Section({ branch, name });
      await newSection.save();
      res.redirect('/admin/section');
  } catch (err) {
      res.status(500).send('Server Error');
  }
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
