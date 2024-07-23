// Load environment variables in development mode
if(process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

// Required modules
const express = require('express');
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const engine = require('ejs-mate');
const ExpressError = require("./utils/ExpressError.js");
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const Student = require('./models/student.js');
const Faculty = require('./models/faculty.js');
const bodyParser = require('body-parser');
const Admin = require('./models/admin.js');
var methodOverride = require('method-override')

// MongoDB connection URL
const dbUrl = process.env.ATLASDB_URL;

// Import routers
const studentRouter = require('./routes/student.js');
const facultyRouter = require('./routes/faculty.js');
const adminRouter = require('./routes/admin.js');

// Configure views and static files
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// Middleware setup
app.use(express.urlencoded({ extended: true }));
app.engine('ejs', engine);
app.use(bodyParser.json());
// override with the X-HTTP-Method-Override header in the request
app.use(methodOverride('_method'));

// Create Mongo store for session management
const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: {
    secret: process.env.SECRET,
  },
  touchAfter: 24 * 3600,
});

// Handle store errors
store.on("error", (err) => {
  console.log("ERROR IN MONGO STORE", err);
});

// Session options
const sessionOptions = {
  store: store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  }
};

// Session middleware
app.use(session(sessionOptions));
app.use(flash());

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Configure local strategy for faculty authentication
passport.use('local-faculty', new LocalStrategy(Faculty.authenticate()));

// Configure local strategy for student authentication
passport.use('local-student', new LocalStrategy(Student.authenticate()));

// Configure local strategy for admin authentication
passport.use('local-admin', new LocalStrategy(Admin.authenticate()));

// Serialize and deserialize user for session management
passport.serializeUser((user, done) => {
  done(null, { username: user.username, type: user instanceof Faculty ? 'faculty' : user instanceof Student ? 'student' : 'admin' });
});

passport.deserializeUser(async (key, done) => {
  try {
    if (key.type === 'faculty') {
      const user = await Faculty.findOne({ username: key.username });
      done(null, user);
    } else if (key.type === 'student') {
      const user = await Student.findOne({ username: key.username });
      done(null, user);
    } else if (key.type === 'admin') {
      const user = await Admin.findOne({ username: key.username });
      done(null, user);
    } else {
      done(new Error('Invalid user type'));
    }
  } catch (err) {
    done(err);
  }
});

// Middleware to set locals
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  return next();
});

// Routes
app.use("/student", studentRouter);
app.use("/faculty", facultyRouter);
app.use("/admin",adminRouter);

// Connect to MongoDB and start server
async function main(){
  await mongoose.connect(dbUrl);
}

main().then(() => {
  console.log("Connection successful");
}).catch((err) => {
  console.log(err);
});

// Home route
app.get('/', (req, res) => {
  return res.render('home.ejs');
});

// Error handling middleware
app.all("*", (req, res, next) => {
  return next(new ExpressError(404, "Page not found"));
});

app.use((err, req, res, next) => {
  let { status = 500, message = "Internal server error" } = err;
  return res.status(status).render("error.ejs", { message });
});

// Start server
app.listen(2000, () => {
  console.log("Listening to port 2000");
});
