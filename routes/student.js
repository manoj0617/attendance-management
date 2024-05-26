const express = require('express');
const passport = require('passport');
const router = express.Router({ mergeParams: true }); // Using mergeParams for nested routes
const wrapAsync = require('../utils/wrapAsync.js'); // Util for error handling
const { isStudentLoggedIn, saveRedirectUrl, validateDownload } = require('../middleware.js'); // Importing middleware
const moment = require('moment'); // Date formatting library
const { Parser } = require('json2csv'); // JSON to CSV parser
const json2csvParser = new Parser(); // Creating a JSON to CSV parser object

let studentController = require("../controllers/student.js"); // Importing student controller

// Routes for student authentication
router.route('/login')
  .get(studentController.renderLoginForm) // Render login form
  .post(saveRedirectUrl, passport.authenticate('local-student', { failureRedirect: '/student/login', failureFlash: true }), wrapAsync(studentController.login)); // Authenticate login

router.route('/signup')
  .get(studentController.renderSignupForm) // Render signup form
  .post(studentController.signup); // Process signup

// Logout route
router.get('/logout', studentController.logout);

// Student index route
router.get("/courses", isStudentLoggedIn, wrapAsync(studentController.studentIndex));

// Route to show attendance for a specific course
router.get("/courses/:id", isStudentLoggedIn, wrapAsync(studentController.showAttendance));

// Routes for downloading attendance
router.route("/download")
  .get(isStudentLoggedIn, wrapAsync(studentController.renderDownloadForm)) // Render download form
  .post(isStudentLoggedIn,validateDownload, wrapAsync(studentController.download)); // Process downloading attendance

module.exports = router; // Exporting the router configuration
