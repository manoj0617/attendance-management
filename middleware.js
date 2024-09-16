const downloadSchema=require("./schema.js");
const ExpressError=require("./utils/ExpressError");
const Attendance = require('./models/attendance.js');

module.exports.sendEmail = async (emails, subject, body) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',  // Or any other SMTP service
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: emails, // Array of student emails
        subject: subject,
        text: body,
    };

    return transporter.sendMail(mailOptions);
};

module.exports.isFacultyLoggedIn=((req,res,next)=>{
    console.log("Authenticated:", req.isAuthenticated());
    if(!req.isAuthenticated()){
        req.session.redirectUrl=req.originalUrl;
        req.flash("error","you must be logged in!");
        return res.redirect('/faculty/login');
    }
    return next();
});
module.exports.isAdminLoggedIn=((req,res,next)=>{
    console.log("Authenticated:", req.isAuthenticated());
    if(!req.isAuthenticated()){
        req.session.redirectUrl=req.originalUrl;
        req.flash("error","you must be logged in!");
        return res.redirect('/admin/login');
    }
    return next();
});

module.exports.isStudentLoggedIn=((req,res,next)=>{
    console.log("Authenticated:", req.isAuthenticated());
    if(!req.isAuthenticated()){
        req.session.redirectUrl=req.originalUrl;
        req.flash("error","you must be logged in!");
        return res.redirect('/student/login');
    }
    return next();
});
module.exports.saveRedirectUrl=(req,res,next)=>{
    if(req.session.redirectUrl){
        res.locals.redirectUrl=req.session.redirectUrl;
    };
    return next();
};
module.exports.validateDownload=(req,res,next)=>{
    let {error}=downloadSchema.validate(req.body);
    if(error){
        let errMsg=error.details.map((el)=>el.message).join(",");
        console.log(error);
        throw new ExpressError("400",error);
        next(err);
    }else{
        next();
    }
};
module.exports.canModifyAttendance = async (req, res, next) => {
    try {
      const attendance = await Attendance.findById(req.params.id);
      if (!attendance) {
        return res.status(404).send('Attendance record not found');
      }
      if (attendance.created_by.toString() !== req.user._id.toString()) {
        return res.status(403).send('You do not have permission to modify this attendance record');
      }
      next();
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  };