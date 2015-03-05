var LocalStrategy   = require('passport-local').Strategy,
    User            = require('../app/models/user');

module.exports = function(passport) {
    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });

    passport.use('local-login', new LocalStrategy ({
        usernameField: 'username',
        passwordField: 'password',
        passReqToCallback: true
    }, function(req, username, password, done) {
        User.findOne({ 'username': username }, function(err, user) {
            if (err) {
                console.log(err);
                return done(err);
            }
            if (!user)
                return done(null, false, req.flash('loginMessage', 'No user found.'));
            if (!user.validPassword(password))
                return done(null, false, req.flash('loginMessage', 'Incorrect password.'));

            return done(null, user);
        });
    }));

    passport.use('local-admin', new LocalStrategy ({
        usernameField: 'username',
        passwordField: 'password',
        passReqToCallback: true
    }, function(req, username, password, done) {
        if (username === 'admin') {
        User.findOne({ 'username': username }, function(err, user) {
            if (err) {
                console.log(err);
                return done(err);
            }
            if (!user)
                return done(null, false, req.flash('loginMessage', 'No user found.'));
            if (!user.validPassword(password))
                return done(null, false, req.flash('loginMessage', 'Incorrect password.'));
        
            return done(null, user);
        });
        } else {
            return done(null, false, req.flash('loginMessage', 'Sorry you must be the admin to access this page'));
        }
    }));
};
