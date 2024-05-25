// netlify/functions/server.js
const express = require('express');
const serverless = require('serverless-http');
const path = require('path');
const mongoose = require('mongoose');
const engine = require('ejs-mate');
const ExpressError = require('../../utils/ExpressError.js');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const Student = require('../../models/student.js');
const Faculty = require('../../models/faculty.js');
const bodyParser = require('body-parser');
const studentRouter = require('../../routes/student.js');
const facultyRouter = require('../../routes/faculty.js');

const app = express();
const dbUrl = process.env.ATLASDB_URL;

if (process.env.NODE_ENV !== "production") {
  require('dotenv').config();
}

app.set("views", path.join(__dirname, "../../views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "../../public")));
app.use(express.urlencoded({ extended: true }));
app.engine('ejs', engine);
app.use(bodyParser.json());

const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: {
    secret: process.env.SECRET,
  },
  touchAfter: 24 * 3600,
});
store.on("error", (err) => {
  console.log("ERROR IN MONGO STORE", err);
});

const sessionOptions = {
  store: store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};
app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use('local-faculty', new LocalStrategy(Faculty.authenticate()));
passport.use('local-student', new LocalStrategy(Student.authenticate()));
passport.serializeUser((user, done) => {
  done(null, { username: user.username, type: user instanceof Faculty ? 'faculty' : 'student' });
});
passport.deserializeUser(async (key, done) => {
  try {
    if (key.type === 'faculty') {
      const user = await Faculty.findOne({ username: key.username });
      done(null, user);
    } else if (key.type === 'student') {
      const user = await Student.findOne({ username: key.username });
      done(null, user);
    } else {
      done(new Error('Invalid user type'));
    }
  } catch (err) {
    done(err);
  }
});

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  return next();
});

app.use("/student", studentRouter);
app.use("/faculty", facultyRouter);

async function main() {
  await mongoose.connect(dbUrl);
}
main().then(() => {
  console.log("connection successful");
}).catch((err) => {
  console.log(err);
});

app.get('/', (req, res) => {
  return res.render('home.ejs');
});

app.all("*", (req, res, next) => {
  return next(new ExpressError(404, "page not found"));
});
app.use((err, req, res, next) => {
  let { status = 500, message = "Internal server error" } = err;
  return res.status(status).render("error.ejs", { message });
});

module.exports.handler = serverless(app);
