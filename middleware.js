const downloadSchema=require("./schema.js");
const ExpressError=require("./utils/ExpressError");
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