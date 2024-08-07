const express = require('express');
const passport = require('passport');
const router = express.Router({ mergeParams: true }); // Using mergeParams for nested routes
const wrapAsync = require('../utils/wrapAsync.js'); // Util for error handling
const { isStudentLoggedIn, saveRedirectUrl, validateDownload } = require('../middleware.js'); // Importing middleware
const moment = require('moment'); // Date formatting library
const { Parser } = require('json2csv'); // JSON to CSV parser
const json2csvParser = new Parser(); // Creating a JSON to CSV parser object
const Student = require('../models/student');
const Faculty = require('../models/faculty');
const Section = require('../models/section');
const Timetable = require('../models/timetable');
const Period = require('../models/period');
const Branch = require('../models/branch');
const Semester = require('../models/semester');
const AcademicYear = require('../models/academicYear');
const Subject = require('../models/subject');
const Attendance = require('../models/attendance');
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

const calculateAttendancePercentage = async (studentId) => {
    try {
        // Fetch all classes in which the student is enrolled
        const allClasses = await Attendance.find({ "students.student": studentId });

        // Log all classes for debugging
        console.log(`All Classes: ${JSON.stringify(allClasses, null, 2)}`);

        // Fetch classes where the student attended (status is true)
        const attendedClasses = allClasses.filter(classItem => {
            // Log each class's students array for debugging
            console.log(`Class ID: ${classItem._id}, Students: ${JSON.stringify(classItem.students, null, 2)}`);

            // Find the student in the class's students array
            const student = classItem.students.find(student => student.student.toString() === studentId.toString());
            
            // Check if the student attended the class
            return student && student.status === true;
        });

        // Log the filtered attended classes
        console.log(`Attended Classes: ${JSON.stringify(attendedClasses, null, 2)}`);

        const totalClasses = allClasses.length;
        const attendedClassesCount = attendedClasses.length;

        console.log(`Total Classes: ${totalClasses}`);
        console.log(`Attended Classes: ${attendedClassesCount}`);

        if (totalClasses === 0) {
            return 0;
        }

        return (attendedClassesCount / totalClasses) * 100;
    } catch (error) {
        console.error('Error calculating attendance percentage:', error);
        throw error;
    }
};

// Route to get attendance percentage for a specific student
router.get('/attendancePercentage/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const attendancePercentage = await calculateAttendancePercentage(studentId);

        res.json({ attendancePercentage: attendancePercentage.toFixed(2) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Route to render student's attendance page
router.get('/studentAttendance/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const student = await Student.findById(studentId);
        const percentage = await calculateAttendancePercentage(studentId);
        let today = new Date().toLocaleString('en-US', { weekday: 'long' });
        let periods = await Period.find({ section: req.user.section, day: today })
            .populate('subject')
            .populate('year')
            .populate('branch')
            .populate('section');
        res.render('student/studentAttendance', { currUser: student, percentage: percentage.toFixed(2),periods,today });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router;

// Student index route
router.get("/courses", isStudentLoggedIn, wrapAsync(studentController.studentIndex));

// Route to show attendance for a specific course
router.get("/courses/:id", isStudentLoggedIn, wrapAsync(studentController.showAttendance));

// Routes for downloading attendance
router.route("/download")
  .get(isStudentLoggedIn, wrapAsync(studentController.renderDownloadForm)) // Render download form
  .post(isStudentLoggedIn,validateDownload, wrapAsync(studentController.download)); // Process downloading attendance

module.exports = router; // Exporting the router configuration
