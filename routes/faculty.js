const express = require('express');
const passport = require('passport');
const router = express.Router({ mergeParams: true }); // Using mergeParams for nested routes
const { isFacultyLoggedIn, saveRedirectUrl, validateDownload } = require('../middleware.js'); // Importing middleware
const wrapAsync = require('../utils/wrapAsync.js'); // Util for error handling
const createCsvWriter = require('csv-writer').createObjectCsvWriter; // CSV writer module
const { Parser } = require('json2csv'); // JSON to CSV parser
const json2csvParser = new Parser(); // Creating a JSON to CSV parser object
const facultyController = require("../controllers/faculty.js"); // Importing faculty controller

// Routes for faculty authentication
router.route('/login')
  .get(facultyController.renderLoginForm) // Render login form
  .post(saveRedirectUrl, passport.authenticate('local-faculty', { failureRedirect: '/faculty/login', failureFlash: true }), wrapAsync(facultyController.login)); // Authenticate login

router.route('/signup')
  .get(facultyController.renderSignupForm) // Render signup form
  .post(facultyController.signup); // Process signup

// Faculty index route
router.get("/courses", isFacultyLoggedIn, wrapAsync(facultyController.facultyIndex));

// Routes for creating a new course
router.route("/create")
  .get(isFacultyLoggedIn, wrapAsync(facultyController.renderNewForm)) // Render new course form
  .post(isFacultyLoggedIn, wrapAsync(facultyController.newCourse)); // Process creation of new course

// Routes for marking attendance
router.route("/courses/:id")
  .get(isFacultyLoggedIn, wrapAsync(facultyController.renderAttendanceForm)) // Render attendance form
  .post(isFacultyLoggedIn, wrapAsync(facultyController.markAttendance)); // Process marking attendance

// Routes for downloading attendance
router.route("/download")
  .get(isFacultyLoggedIn, wrapAsync(facultyController.renderDownloadForm)) // Render download form
  .post(isFacultyLoggedIn,validateDownload, wrapAsync(facultyController.download)); // Process downloading attendance

// Logout route
router.get('/logout', facultyController.logout);

module.exports = router; // Exporting the router configuration
