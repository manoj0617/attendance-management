const Student = require('../models/student');
const Course = require('../models/course.js');
const Attendance = require("../models/attendance.js");
const moment = require('moment');
const { Parser } = require('json2csv');

// Render login form for students
module.exports.renderLoginForm = (req, res) => {
    return res.render('student/login.ejs');
};

module.exports.login = (req, res) => {
    req.flash("success", "Welcome back!");
    let redirectUrl = res.locals.redirectUrl || `/student/studentAttendance/${req.user._id}`;
    return res.redirect(redirectUrl);
};


// Render signup form for students
module.exports.renderSignupForm = (req, res) => {
    return res.render('student/signup.ejs');
};

// Handle student signup
module.exports.signup = async (req, res) => {
    try {
        let { name, email, username, password, dept, year } = req.body;
        console.log(req.body);
        let newStudent = new Student({ name, email, username, dept, year });
        let registeredStudent = await Student.register(newStudent, password);
        console.log(registeredStudent);
        req.login(registeredStudent, (err) => {
            if (err) {
                req.flash("success", "You are registered successfully!");
                return next(err);
            }
            res.redirect('/student/courses');
        });
    } catch (err) {
        console.log(err);
        req.flash("error", err.message);
        return res.redirect('/student/signup');
    }
};

// Handle student logout
module.exports.logout = (req, res, next) => {
    req.logOut((err) => {
        if (err)
            return next(err);
        req.flash("success", "Logged out successfully!");
        res.redirect('/');
    });
};

// Render student index (courses) and calculate attendance percentage
module.exports.studentIndex = async (req, res) => {
    let { email, year, name, username ,branch,gender} = req.user;
    let courses = await Course.find({ dept: dept, year: year }).populate("faculty");
    let attendances = await Attendance.find({ year: year, roll: username, name: name });
    let p = 0,
        percentage = 0;
    if (attendances.length) {
        for (let attendance of attendances) {
            if (attendance.status == 'present') {
                p++;
            };
        }
        percentage = ((p / attendances.length) * 100).toFixed(2);
    }
    return res.render("student/courses.ejs", { courses, percentage, attendances });
};

// Render attendance details for a specific course
module.exports.showAttendance = async (req, res) => {
    let { id } = req.params;
    let { name, username } = req.user;
    let x = 0;
    const options1 = { year: 'numeric', month: 'long', day: 'numeric' };
    let course = await Course.findById(id);
    let attendances = await Attendance.find({ name: name, roll: username, course: course.course });
    let p = 0,
        percentage = 0;
    if (attendances.length) {
        for (let attendance of attendances) {
            if (attendance.status == 'present') {
                p++;
            };
        }
        percentage = ((Math.round(p / attendances.length)) * 100).toFixed(2);
    }
    res.render("student/attendance.ejs", { attendances, x, moment, course, percentage });
};

// Render form for downloading attendance records
module.exports.renderDownloadForm = async (req, res) => {
    let { dept, year } = req.user;
    let courses = await Course.find({ dept: dept, year: year });
    res.render("student/download.ejs", { courses });
};

// Handle downloading attendance records in CSV format
module.exports.download = async (req, res) => {
    let { name } = req.user;
    let { from, to, course } = req.body;
    let attendances = [];
    const toObject = new Date(to);
    const dateObject = new Date(from);

    while (dateObject.getTime() <= toObject.getTime()) {
        let attendance = await Attendance.find({ date: dateObject, course: course, name: name }).lean();
        if (attendance.length) {
            attendances = attendances.concat(attendance);
        }
        dateObject.setDate(dateObject.getDate() + 1);
    }

    if (attendances.length === 0) {
        req.flash("error", "No attendance records found for the selected date range.");
        return res.redirect('/student/download');
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
