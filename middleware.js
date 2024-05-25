module.exports.isFacultyLoggedIn=((req,res,next)=>{
    console.log("Authenticated:", req.isAuthenticated());
    if(!req.isAuthenticated()){
        req.session.redirectUrl=req.originalUrl;
        req.flash("error","you must be logged in!");
        return res.redirect('/faculty/login');
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
