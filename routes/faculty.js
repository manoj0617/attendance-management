const express = require('express');
const passport = require('passport');
const router = express.Router({ mergeParams: true });
const { isFacultyLoggedIn, saveRedirectUrl, validateDownload } = require('../middleware.js');
const wrapAsync = require('../utils/wrapAsync.js');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { Parser } = require('json2csv');
const json2csvParser = new Parser();
const facultyController = require("../controllers/faculty.js");
const Student = require('../models/student');
const Faculty = require('../models/faculty');
const Section = require("../models/section");
const Timetable = require('../models/timetable');
const Period = require("../models/period");
const Branch = require('../models/branch');
const Semester = require('../models/semester');
const AcademicYear = require('../models/academicYear');
const Subject = require('../models/subject');
const Attendance = require('../models/attendance');

// Routes for faculty authentication
router.route('/login')
    .get(facultyController.renderLoginForm)
    .post(saveRedirectUrl, passport.authenticate('local-faculty', { failureRedirect: '/faculty/login', failureFlash: true }), wrapAsync(facultyController.login));

router.route('/signup')
    .get(facultyController.renderSignupForm)
    .post(facultyController.signup);

router.get("/dashboard", isFacultyLoggedIn, wrapAsync(facultyController.facultyDashboard));

router.route("/attendance")
    .get(isFacultyLoggedIn, wrapAsync(facultyController.renderAttendanceForm))
    .post(isFacultyLoggedIn, wrapAsync(facultyController.markAttendance));

router.route("/download")
    .get(isFacultyLoggedIn, wrapAsync(facultyController.renderDownloadForm))
    .post(isFacultyLoggedIn, validateDownload, wrapAsync(facultyController.download));

// Fetch Semesters by Academic Year
router.get('/semester', async (req, res) => {
    try {
        let semesters = await Semester.find({});
        const { year } = req.query;
        const branches = await Branch.find({ academicYear: year });
        res.json({semesters,branches});
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

router.get('/logout', facultyController.logout);

module.exports = router;
