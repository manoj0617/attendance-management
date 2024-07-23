const express = require('express');
const passport = require('passport');
const router = express.Router({ mergeParams: true });
const { isFacultyLoggedIn, saveRedirectUrl, validateDownload, canModifyAttendance } = require('../middleware.js');
const wrapAsync = require('../utils/wrapAsync.js');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { Parser } = require('json2csv');
const json2csvParser = new Parser();
const facultyController = require("../controllers/faculty.js");
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
const mongoose = require('mongoose');
const  {ObjectId}  = mongoose.Types;

// Route to render the attendance marking page
router.get('/markAttendance', isFacultyLoggedIn, async (req, res) => {
    try {
        const { date, section, acYear, program, branch, sem, periods, subject, period } = req.query;
        if (!section) {
            return res.status(400).send('Section is required');
        }
        console.log("this is");
        console.log(section);
        const students = await Student.find({ section: new mongoose.Types.ObjectId(section) }).populate('section');

        res.render('faculty/markAttendance', {
            date,
            section,
            acYear,
            program,
            branch,
            sem,
            periods: periods ? periods.split(',') : [],
            students,
            subject,
            period
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});


// Routes for faculty authentication
router.route('/login')
    .get(facultyController.renderLoginForm)
    .post(saveRedirectUrl, passport.authenticate('local-faculty', { failureRedirect: '/faculty/login', failureFlash: true }), wrapAsync(facultyController.login));

router.route('/signup')
    .get(facultyController.renderSignupForm)
    .post(facultyController.signup);

router.get("/dashboard", isFacultyLoggedIn, wrapAsync(facultyController.facultyDashboard));

// Attendance routes
router.route("/attendance")
    .get(isFacultyLoggedIn, wrapAsync(facultyController.renderAttendanceForm));

router.route("/markAttendance")
    .post(isFacultyLoggedIn, wrapAsync(facultyController.markAttendance));

// Download routes
router.route("/download")
    .get(isFacultyLoggedIn, wrapAsync(facultyController.renderDownloadForm))
    .post(isFacultyLoggedIn, validateDownload, wrapAsync(facultyController.download));
    
// Route to submit attendance
// Route to submit attendance
router.post('/submitAttendance', isFacultyLoggedIn, async (req, res) => {
    const { date, section, acYear, branch, sem, periods, attendance } = req.body;

    try {
        // Convert date to the day of the week
        const dayOfWeek = new Date(date).toLocaleString('en-US', { weekday: 'long' });
        const semester = await Semester.findById(sem);
        if (!semester) {
            return res.status(400).send('Invalid semester ID');
        }

        // Fetch periods information
        const periodsData = await Period.find({
            section: new mongoose.Types.ObjectId(section),
            day: dayOfWeek, // Use day instead of date
            year: new mongoose.Types.ObjectId(acYear),
            branch: new mongoose.Types.ObjectId(branch),
            semester: new mongoose.Types.ObjectId(sem), // Use string for semester
            hour: { $in: periods.map(Number) }
        }).populate('subject');
        console.log(periodsData+"data");
        // Create attendance records for each period
        for (const period of periodsData) {
            const periodId = period._id.toString();

            // Construct student attendance statuses
            const studentsAttendance = Object.keys(attendance).map(studentId => ({
                student: new mongoose.Types.ObjectId(studentId),
                status: attendance[studentId] === 'true'
            }));

            console.log(studentsAttendance);

            let newAttendance = new Attendance({
                date: new Date(date),
                section: new mongoose.Types.ObjectId(section),
                year: new mongoose.Types.ObjectId(acYear),
                branch: new mongoose.Types.ObjectId(branch),
                semester: new mongoose.Types.ObjectId(sem),
                period: period._id,
                subject: period.subject._id,
                students: studentsAttendance,
                created_by: req.user._id // Assuming req.user contains the logged-in faculty info
            });

            let savedAttendance = await newAttendance.save();
            console.log(savedAttendance);

            if (!savedAttendance) {
                return res.status(500).send('Error saving attendance');
            }
        }

        res.send('Attendance submitted successfully');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Fetch semesters by academic year
router.get('/semester', wrapAsync(async (req, res) => {
    try {
        const { year } = req.query;
        const semesters = await Semester.find({});
        const branches = await Branch.find({ academicYear: year });
        res.json({ semesters, branches });
    } catch (err) {
        res.status(500).send('Server Error');
    }
}));

// Fetch branches by academic year
router.get('/branch', wrapAsync(async (req, res) => {
    try {
        const { year } = req.query;
        const branches = await Branch.find({ academicYear: year });
        res.json(branches);
    } catch (err) {
        res.status(500).send('Server Error');
    }
}));

// Fetch sections by branch and semester
router.get('/sections', wrapAsync(async (req, res) => {
    try {
        const { branch, sem } = req.query;
        const sections = await Section.find({ branch });
        res.json(sections);
    } catch (err) {
        res.status(500).send('Server Error');
    }
}));

// Logout route
router.get('/logout', facultyController.logout);

// Route to handle show attendance
router.get('/showAttendance', wrapAsync(async (req, res) => {
    try {
        const { section, date, acYear, branch, sem } = req.query;
        const attendanceRecords = await Attendance.find({ date: new Date(date), section, semester: sem });

        const enabledPeriods = attendanceRecords.map(record => record.period.hour);

        res.json({ enabledPeriods });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
}));

// Route to handle modify attendance
router.post('/modifyAttendance', isFacultyLoggedIn, canModifyAttendance, wrapAsync(async (req, res) => {
    const { section, date, periods, acYear, branch, sem } = req.body;
    console.log(req.body);
    const facultyId = req.user._id;

    await Attendance.deleteMany({ section, date: new Date(date), semester: sem, created_by: facultyId });

    const attendanceRecords = periods.map(period => ({
        section,
        date: new Date(date),
        period,
        academicYear: acYear,
        branch,
        semester: sem,
        created_by: facultyId
    }));

    await Attendance.insertMany(attendanceRecords);
    res.redirect('/faculty/attendance');
}));

// Route to display the view attendance form
router.get('/attendanceView', wrapAsync(async (req, res) => {
    try {
        const { date, section } = req.query;
        const students = await Student.find({ section });
        const attendanceRecords = await Attendance.find({ date: new Date(date), section });

        res.render('faculty/attendanceView', { date, students, attendanceRecords });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
}));

// Fetch periods based on section, date, and action (new or modify)
router.get('/fetchPeriods', isFacultyLoggedIn, async (req, res) => {
    try {
        const { section, date, acYear, program, branch, sem, action, facultyId } = req.query;
        let day = new Date(date).toLocaleString('en-US', { weekday: 'long' });
        // Fetch periods
        const periods = await Period.find({ section, semester: sem, branch, year: acYear,day,faculty: req.user._id }).populate('subject faculty branch year section');
        console.log(req.query);
        let attendanceRecords = await Attendance.find({ section, semester: sem, branch, year: acYear, date: new Date(date)}).populate('period');
        let enabledPeriods = [1,2,3,4,5,6,7];
        if (action === 'markAttendance') {
            enabledPeriods=[];
            const attendedPeriodHours = attendanceRecords.map(record => record.period.hour);
            enabledPeriods = attendedPeriodHours;
            console.log(attendedPeriodHours);
        } else if (action === 'modifyAttendance') {
            enabledPeriods = attendanceRecords
                .filter(record => record.created_by.equals(facultyId))
                .map(record => record.period.hour);
        }
        console.log(periods.length);
        console.log(enabledPeriods);
        console.log(attendanceRecords);
        res.json({ periods, enabledPeriods });
    } catch (err) {
        console.error('Error fetching periods:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
