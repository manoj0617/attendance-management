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
const Attendance = require('../models/attendance');
const multer = require('multer');
const upload = multer();
const mongoose = require('mongoose');
const  {ObjectId}  = mongoose.Types;

router.use(express.json()); // For parsing application/json
router.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Use multer middleware for multipart/form-data
router.use(upload.none());

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
router.get("/semester",async(req,res)=>{
  let semesters=await Semester.find({});
  res.json(semesters);
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
router.get('/subject', async(req, res) => {
  const { semester } = req.query;
  const subjects = await Subject.find({semester});
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

router.post('/timetable/period', isAdminLoggedIn, async (req, res) => {
  let { hour, day, branch, year, section, subject, semester, faculty } = req.body;
  const { startTime, endTime } = req.body;

  // Convert day number to day name
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  day = dayNames[day - 1];

  try {
    // Find the semester document by ID
    const semesterDoc = await Semester.findById(semester);

    if (!semesterDoc) {
      req.flash('error', 'Invalid semester');
      return res.redirect(`/admin/timetable/new?year=${year}&branch=${branch}&section=${section}`);
    }

    // Extract the name of the semester
    const sem = semesterDoc.name;

    // Create a new period
    const newPeriod = new Period({ hour, day, branch, year, section, subject, semester, startTime, endTime, faculty });
    let period = await newPeriod.save();

    // Populate subject and faculty in the period
    period = await period.populate('subject faculty');

    // Find the timetable
    let timetable = await Timetable.findOne({ year, branch, section, semester });

    // Check if timetable exists
    if (!timetable) {
      // If not, create a new timetable
      timetable = new Timetable({ year, branch, section, semester, periods: [] });
    }

    // Add the period to the timetable
    timetable.periods.push(newPeriod._id);
    await timetable.save();

    req.flash('success', 'Period added successfully');
    res.json({ success: true, period: period });
  } catch (error) {
    console.error('Error adding period:', error);
    req.flash('error', 'Error adding period');
    res.json({ success: false, error: error.message });
  }
});


router.put('/timetable/period/:id', isAdminLoggedIn, async (req, res) => {
  let { hour, day, branch, year, section, subject, semester, faculty } = req.body;
  const { startTime, endTime } = req.body;
  const periodId = req.params.id;

  // Convert day number to day name
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  day = dayNames[day - 1];

  try {
    // Find the semester document by ID
    const semesterDoc = await Semester.findById(semester);

    if (!semesterDoc) {
      req.flash('error', 'Invalid semester');
      return res.redirect(`/admin/timetable/edit/${periodId}?year=${year}&branch=${branch}&section=${section}`);
    }

    // Extract the name of the semester
    const sem = semesterDoc.name;

    // Update the period
    let updatedPeriod = await Period.findByIdAndUpdate(periodId, {
      hour, day, branch, year, section, subject, semester, startTime, endTime, faculty
    }, { new: true });

    // Populate subject and faculty in the period
    updatedPeriod = await updatedPeriod.populate('subject faculty');

    req.flash('success', 'Period updated successfully');
    res.json({ success: true, period: updatedPeriod });
  } catch (error) {
    console.error('Error updating period:', error);
    req.flash('error', 'Error updating period');
    res.json({ success: false, error: error.message });
  }
});

// Route to delete a period
router.delete('/timetable/period/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Period.findByIdAndDelete(id);
    res.json({ success: true, message: 'Period deleted successfully' });
  } catch (error) {
    console.error('Error deleting period:', error);
    res.status(500).json({ success: false, message: 'Error deleting period' });
  }
});

router.get('/timetables', async (req, res) => {
  const { section, year, branch, semester } = req.query;
  const timetable = await Timetable.findOne({ section, year, branch, semester });
  res.json(timetable);
});
router.get('/timetable/new', async (req, res) => {
  let { numPeriods, numDays = 7, section, branch, semester, year } = req.query;
  let periods = [];
  let newTimetable = new Timetable({ section, semester, year, branch, periods,numPeriods});
  let timetable = await newTimetable.save();
  res.redirect(`/admin/timetable/${timetable._id}`);
});

router.get('/timetable/:id', async (req, res) => {
  let { id } = req.params;
  
  try {
    let timetable = await Timetable.findById(id)
      .populate({
        path: 'periods',
        populate: {
          path: 'subject faculty',
          select: 'name'
        }
      })
      .populate('branch section year semester')
      .exec();

    res.render('admin/viewTimetable', { timetable });
  } catch (error) {
    console.error('Error fetching timetable:', error);
    req.flash('error', 'Error fetching timetable');
    res.redirect('/admin/timetable');
  }
});

// Route to delete a period
router.delete('/timetable/period/:id', isAdminLoggedIn, async (req, res) => {
  try {
    const period = await Period.findByIdAndDelete(req.params.id);
    if (period) {
      res.json({ success: true, message: 'Period deleted successfully' });
    } else {
      res.json({ success: false, message: 'Period not found' });
    }
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: 'Error deleting period' });
  }
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
router.get('/sections/:branchId', isAdminLoggedIn, async (req, res) => {
  const sections = await Section.find({ branch: req.params.branchId });
  res.json({ sections });
});
// Handle student signup form submission
router.post('/student/new', async (req, res) => {
  try {
      const { name, email, username, password, year, branch, gender } = req.body;
      const newStudent = new Student({ name, email, username, year, branch, gender });
      let registeredStudent = await Student.register(newStudent, password);
      console.log(registeredStudent);
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
// Search subjects
router.get('/subjects/search', async (req, res) => {
  const { q } = req.query;
  const subjects = await Subject.find({ name: new RegExp(q, 'i') });
  res.json(subjects);
});
// Render the faculty management page
router.get('/faculty', async (req, res) => {
  const branches = await Branch.find({});
  res.render('admin/faculty', { branches });
});

// Render the new faculty creation page
router.get('/faculty/new', async (req, res) => {
  const branches = await Branch.find({});
  res.render('admin/newFaculty', { branches });
});

// Handle faculty creation
router.post('/faculty/new', async (req, res) => {
  try {
      const { email, name, branch, password, username, mobile, subjects } = req.body;
      console.log(username,req.body);
      if (!name || !email || !branch || !password || !username || !mobile) {
        req.flash('error', 'All fields are required');
        return res.redirect('/admin/register-faculty');
      }
      // Create new faculty instance
      const faculty = new Faculty({
          email,
          name,
          branch,
          username,
          mobile,
          subjects: Array.isArray(subjects) ? subjects : [subjects] // Ensure subjects is an array
      });

      // Set password using passport-local-mongoose
      const registeredFaculty=Faculty.register(faculty, password, (err, faculty) => {
          if (err) {
              console.error('Error registering faculty:', err);
              return res.json({ success: false, message: 'Error registering faculty' });
          }
          res.json({ success: true });
      });
  } catch (error) {
    console.error('Error registering faculty:', error);

    if (error.code === 11000) {
      if (error.keyPattern.email) {
        req.flash('error', 'Email already exists');
      } else if (error.keyPattern.username) {
        req.flash('error', 'Username already exists');
      }
    } else {
      req.flash('error', 'Error registering faculty');
    }
      res.json({ success: false, message: 'Error saving faculty' });
  }
});

// Search subjects
router.get('/subjects/search', async (req, res) => {
  const { q } = req.query;
  const subjects = await Subject.find({ name: new RegExp(q, 'i') });
  res.json(subjects);
});

// Fetch subjects based on branch, semester, and academic year
router.get('/subjects', async (req, res) => {
  const { branch, semester, academicYear } = req.query;
  const subjects = await Subject.find({ branch, semester, academicYear });
  res.json(subjects);
});

// Fetch faculties based on subject
router.get('/faculties', async (req, res) => {
  const { subject } = req.query;

  console.log('Received subject:', subject);

  // Check if subject ID is provided and valid
  if (!subject || !mongoose.Types.ObjectId.isValid(subject)) {
    console.error('Invalid or missing subject ID');
    return res.status(400).json({ message: 'Invalid or missing subject ID' });
  }

  try {
    // Find faculties that have the subject in their subjects array
    const faculties = await Faculty.find({ subjects: { $in: [subject] } }).populate('branch subjects');

    console.log('Faculties found:', faculties.length);
    console.log('Faculties details:', faculties);

    res.json(faculties);
  } catch (error) {
    console.error('Error fetching faculties:', error);
    res.status(500).json({ message: 'Error fetching faculties' });
  }
});



// Fetch faculty data for editing
router.get('/faculty/:id', async (req, res) => {
  const faculty = await Faculty.findById(req.params.id).populate('branch subjects');
  res.json(faculty);
});

// Update faculty data
router.put('/faculty/:id', async (req, res) => {
  const faculty = await Faculty.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true });
});

// Delete a faculty
router.delete('/faculty/:id', async (req, res) => {
  await Faculty.findByIdAndDelete(req.params.id);
  res.json({ success: true });
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
router.get('/attendance', async (req, res) => {
  const { student, subject, date, status, period, branch, section, semester, year } = req.query;

  let filter = {};
  if (student) filter.student = student;
  if (subject) filter.subject = subject;
  if (date) filter.date = new Date(date);
  if (status !== undefined) filter.status = status.toLowerCase() === 'present';
  if (period) filter.period = period;
  if (branch) filter.branch = branch;
  if (section) filter.section = section;
  if (semester) filter.semester = semester;
  if (year) filter.year = year;

  try {
    const attendances = await Attendance.find(filter)
      .populate('student subject branch section semester year');
    res.render('admin/attendance', { attendances });
  } catch (error) {
    console.error('Error fetching attendances:', error);
    req.flash('error', 'Error fetching attendances');
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
