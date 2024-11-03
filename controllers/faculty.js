const Student = require('../models/student.js');
const Attendance = require("../models/attendance.js");
const Faculty = require('../models/faculty');
const Period = require('../models/period');
const Section = require('../models/section');
const Subject = require('../models/subject');
const { Parser } = require('json2csv');
const AcademicYear = require('../models/academicYear');
const Batch = require('../models/batch');
const mongoose=require("mongoose");
const StudentMarks = require('../models/studentMarks');
const MarkingSchemeConfig = require('../models/studentMarks');
// Render login form
module.exports.renderLoginForm = (req, res) => {
    return res.render('faculty/login.ejs');
};

// Handle login process
module.exports.login = (req, res) => {
    req.flash("success", "Welcome back!");
    console.log(res.locals.currUser);
    let redirectUrl = res.locals.redirectUrl || '/faculty/dashboard';
    return res.redirect(redirectUrl);
};

// Render signup form
module.exports.renderSignupForm = (req, res) => {
    return res.render('faculty/signup.ejs');
};

// Handle signup process
module.exports.signup = async (req, res) => {
    try {
        let { name, email, username, password, dept } = req.body;
        let newFaculty = new Faculty({ name, email, username, dept });
        let registeredFaculty = await Faculty.register(newFaculty, password);
        req.login(registeredFaculty, (err) => {
            if (err) {
                req.flash("success", "You are registered successfully!");
                return next(err);
            }
            res.redirect('/faculty/dashboard');
        });
    } catch (err) {
        console.log(err);
        req.flash("error", err.message);
        return res.redirect('/faculty/signup');
    }
};

// Render faculty dashboard
module.exports.facultyDashboard = async (req, res) => {
    try {
        let faculty = await Faculty.findById(req.user._id).populate('branch');
        let today = new Date().toLocaleString('en-US', { weekday: 'long' });
        let periods = await Period.find({ faculty: req.user._id, day: today })
            .populate('subject')
            .populate('year')
            .populate('branch')
            .populate('section');
        console.log(periods);
        return res.render("faculty/dashboard.ejs", { faculty, periods,today });
    } catch (err) {
        console.log(err);
        req.flash("error", "Cannot load the dashboard.");
        return res.redirect('/');
    }
};


// Render form for downloading attendance records
module.exports.renderDownloadForm = async (req, res) => {
    const { sectionId } = req.query;
    try {
        const academicYears = await AcademicYear.find({});
        const section = await Section.findById(sectionId)
            .populate('students.student')
            .populate('students.batch')
            .populate('branch');

        if (!section) {
            req.flash("error", "Section not found.");
            return res.redirect('/faculty/dashboard');
        }

        res.render("faculty/download.ejs", { academicYears, section });
    } catch (err) {
        console.error(err);
        req.flash("error", "Cannot load the download form.");
        res.redirect('/faculty/dashboard');
    }
};

// Handle downloading attendance records in CSV format
module.exports.download = async (req, res) => {
    let { from, to, course } = req.body;
    let attendances = [];
    const toObject = new Date(to);
    const dateObject = new Date(from);

    while (dateObject.getTime() <= toObject.getTime()) {
        let attendance = await Attendance.find({ date: dateObject, course: course }).lean();
        if (attendance.length) {
            attendances = attendances.concat(attendance);
        }
        dateObject.setDate(dateObject.getDate() + 1);
    }

    if (attendances.length === 0) {
        req.flash("error", "No attendance records found for the selected date range.");
        return res.redirect('/faculty/download');
    }

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
};

// Handle logout
module.exports.logout = (req, res, next) => {
    req.logOut((err) => {
        if (err) return next(err);
        req.flash("success", "Logged out successfully!");
        res.redirect('/');
    });
};
module.exports.renderAttendanceForm = async (req, res) => {
    const { sectionId } = req.query;
    try {
        const academicYears = await AcademicYear.find({});
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const section = await Section.findById(sectionId)
            .populate('students.student')
            .populate('students.batch')
            .populate('branch');

        if (!section) {
            req.flash("error", "Section not found.");
            return res.redirect('/faculty/dashboard');
        }

        let periods = await Period.find({ faculty: req.user._id, day: today })
            .populate('subject')
            .populate('year')
            .populate('branch')
            .populate('section');

        res.render('faculty/attendance', { academicYears, today, periods, section });
    } catch (err) {
        console.error(err);
        req.flash("error", "Cannot load the attendance form.");
        res.redirect('/faculty/dashboard');
    }
};

module.exports.markAttendance = async (req, res) => {
    try {
        const { date, section, acYear, program, branch, sem, periods, subject, period, batch, periodsMatched } = req.body;

        if (!section) {
            return res.status(400).send('Section is required');
        }
        console.log(req.body);

        // Fetch the section with populated students and their batches
        const sectionData = await Section.findById(section)
            .populate('students.student') // Populate the student field in students array
            .populate('students.batch')   // Populate the batch field in students array
            .populate('branch');

        if (!sectionData) {
            return res.status(404).send('Section not found');
        }

        // Map students with their batch and section info
        let students = sectionData.students.map(s => ({
            _id: s.student._id,
            username: s.student.username,
            name: s.student.name,
            batch: s.batch ? s.batch.name : null,
            section: sectionData.name,
            batchId: s.batch ? s.batch._id : null
        }));

        console.log("All students:", students);

        // Filter students by the selected batch
        if (batch) {
            students = students.filter(s => s.batchId && s.batchId.toString() === batch.toString());
        }

        console.log("Filtered students for batch:", batch, students);

        // Ensure periods are in array form and deduplicated
        let uniquePeriods = Array.isArray(periods) ? periods : (periods ? periods.split(',') : []);
        uniquePeriods = [...new Set(uniquePeriods)];

        console.log("Unique periods:", uniquePeriods);

        res.render('faculty/markAttendance', {
            date,
            section,
            acYear,
            program,
            branch,
            sem,
            selectedBatch: batch,
            periods: uniquePeriods,
            students,
            subject,
            period,
            periodsMatched
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

module.exports.renderEnterMarks = async (req, res) => {
    try {
        const { sectionId } = req.params;

        // Find the section with its related details, including facultySubjects
        const section = await Section.findById(sectionId)
            .populate('branch')
            .populate('currentSemester')
            .populate({
                path: 'students.student',
                select: 'name rollNo email'
            })
            .populate({
                path: 'facultySubjects.subject',
                select: 'name code'
            })
            .populate({
                path: 'facultySubjects.faculty',
                select: 'name'
            });

        if (!section) {
            req.flash('error', 'Section not found');
            return res.redirect('/faculty/dashboard');
        }

        if (!section.currentSemester) {
            req.flash('error', 'No current semester found for this section.');
            return res.redirect('/faculty/dashboard');
        }

        // Filter facultySubjects for the current faculty (req.user) and current semester
        const facultySubjects = section.facultySubjects.filter(facSub =>
            facSub.faculty.equals(req.user._id) && facSub.semester.equals(section.currentSemester._id)
        );

        if (facultySubjects.length === 0) {
            req.flash('error', 'No subjects found for this section and semester.');
            return res.redirect('/faculty/dashboard');
        }

        // Render the 'enterMarks' page with section and faculty's subjects
        res.render('faculty/enterMarks', {
            section,
            facultySubjects
        });
    } catch (error) {
        console.error('Error rendering enter marks page:', error);
        req.flash('error', 'An error occurred while rendering marks entry.');
        res.redirect('/faculty/dashboard');
    }
};





