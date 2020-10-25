var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
const dotenv = require('dotenv');
var compression = require('compression');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

var indexRouter = require('./routes/index');
var catalogRouter = require('./routes/catalog');
var compression = require('compression');

dotenv.config({ path: './config.env' });

const User = mongoose.model(
    'User',
    new mongoose.Schema({
        username: { type: String, required: true },
        password: { type: String, required: true },
    })
);

var app = express();

var mongoDB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });

//Get the default connection
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(session({ secret: 'cats', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.session = req.session;

    console.log('hello');

    next();
});
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));

passport.use(
    new LocalStrategy((username, password, done) => {
        User.findOne({ username: username }, (err, user) => {
            if (err) {
                return done(err);
            }
            if (!user) {
                return done(null, false, { msg: 'Incorrect username' });
            }
            if (user.password !== password) {
                return done(null, false, { msg: 'Incorrect password' });
            }
            return done(null, user);
        });
    })
);

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

app.post(
    '/auth',
    passport.authenticate('local', {
        successRedirect: '/catalog',
        failureRedirect: '/catalog',
    })
);

app.get('/log-out', (req, res) => {
    req.logout();
    res.redirect('/');
});

app.use('/', indexRouter);
app.use('/catalog', catalogRouter);

// SIGN UP post
// app.post('/catalog', (req, res, next) => {
//     const user = new User({
//         username: req.body.username,
//         password: req.body.password,
//     }).save((err) => {
//         if (err) {
//             return next(err);
//         }
//         res.redirect('/');
//     });
// });

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
