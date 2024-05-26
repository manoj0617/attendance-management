const Course = require('../models/course.js');
const Student = require('../models/student.js');
const Attendance = require("../models/attendance.js");
const Faculty = require('../models/faculty');

// Render login form
module.exports.renderLoginForm = (req, res) => {
    return res.render('faculty/login.ejs');
};

// Handle login process
module.exports.login = (req, res) => {
    req.flash("success", "Welcome back!");
    console.log(res.locals.currUser);
    let redirectUrl = res.locals.redirectUrl || '/faculty/courses';
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
            res.redirect('/faculty/courses');
        });
    } catch (err) {
        console.log(err);
        req.flash("error", err.message);
        return res.redirect('/faculty/signup');
    }
};

// Render faculty index (courses)
module.exports.facultyIndex = async (req, res) => {
    let courses = await Course.find({ faculty: req.user._id });
    return res.render("faculty/courses.ejs", { courses });
};

// Render form for creating a new course
module.exports.renderNewForm = (req, res) => {
    return res.render("faculty/create.ejs");
};

// Handle creation of a new course
module.exports.newCourse = async (req, res) => {
    let { course, year } = req.body;
    let { dept, name, _id } = req.user;
    let newCourse = new Course({
        dept: dept,
        course: course,
        faculty: _id,
        year: year,
    });
    await newCourse.save();
    return res.redirect('/faculty/courses');
};

// Render attendance form for a specific course
module.exports.renderAttendanceForm = async (req, res) => {
    let { id } = req.params;
    let course = await Course.findById(id);
    let x = 0;
    let students = await Student.find({ dept: course.dept, year: course.year });
    res.render("faculty/attendance.ejs", { course, students, x });
};

// Handle marking attendance for students in a course
module.exports.markAttendance = async (req, res) => {
    let { status, date, student } = req.body;
    let { id } = req.params;
    let course = await Course.findById(id);
    for (let i = 0; i < student.length; i++) {
        let newStudent = await Student.find({ username: student[i] });
        console.log(newStudent);
        let newAttendance = new Attendance({
            roll: newStudent[0].username,
            name: newStudent[0].name,
            year: newStudent[0].year,
            date: date,
            status: status[0],
            course: course.course,
        });
        let res = await newAttendance.save();
        console.log(res);
    }
    res.redirect("/faculty/courses");
};

// Render form for downloading attendance records
module.exports.renderDownloadForm = async (req, res) => {
    let { id } = req.user;
    let courses = await Course.find({ faculty: id });
    res.render("faculty/download.ejs", { courses });
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
