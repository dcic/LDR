/*
 * Gulpfile
 * @author Michael McDermott
 * Created on 5/12/15.
 */

'use strict';

var gulp = require('gulp');
var path = require('path');
var runSequence = require('run-sequence');
var del = require('del');
var karma = require('karma').server;
var minifyCss = require('gulp-minify-css');
var ngAnnotate = require('gulp-ng-annotate');
var $ = require('gulp-load-plugins')();

var SERVER_DIRECTORY = 'app/backend/';
var SRC_DIRECTORY = 'app/public/';
var FILE_DIRECTORY = 'app/files/'
var BUILD_DIRECTORY = 'dist/';

var mainBowerFiles = require('main-bower-files');
var BOWER_DIRECTORY = SRC_DIRECTORY + 'vendor/';
var BOWER_JSON_DIRECTORY = './bower.json';
var BOWER_RC_DIRECTORY = './.bowerrc';

var jsFilter = $.filter('**/*.js');
var cssFilter = $.filter('**/*.css');

var src = {};
var browserSync;

// Clean output directory
gulp.task('clean', del.bind(
  null, ['.tmp', BUILD_DIRECTORY + '*'], {
    dot: true
  }
));

gulp.task('html', function() {
  return gulp.src([
      SRC_DIRECTORY + '*.html',
      SRC_DIRECTORY + '**/*.html'
    ])
    .pipe($.plumber())
    .pipe(gulp.dest(BUILD_DIRECTORY));
});

gulp.task('files', function() {
  return gulp.src(FILE_DIRECTORY + '**')
    .pipe($.plumber())
    .pipe(gulp.dest(BUILD_DIRECTORY + 'files/'));
});

gulp.task('favIcons', function() {
  return gulp.src([
      SRC_DIRECTORY + '/images/favicons/*.*'
    ])
    .pipe(gulp.dest(BUILD_DIRECTORY));
});

gulp.task('fonts', function() {
  return gulp.src(SRC_DIRECTORY + '**/*.{svg,ttf,woff,woff2}')
    .pipe($.plumber())
    .pipe($.changed(BUILD_DIRECTORY + 'fonts/'))
    .pipe($.flatten())
    .pipe(gulp.dest(BUILD_DIRECTORY + 'fonts/'));
});

gulp.task('images', function() {
  return gulp.src([
      SRC_DIRECTORY + 'images/**/*.{jpg,jpeg,png,gif,ico,svg}',
      '!' + SRC_DIRECTORY + 'images/favicons/**',
      '!' + SRC_DIRECTORY + 'images/favicons'
    ])
    .pipe($.plumber())
    .pipe($.changed(BUILD_DIRECTORY + 'images/'))
    .pipe($.imagemin({
      optimizationLevel: 3,
      progressive: true,
      interlaced: true
    }))
    .pipe($.size({
      title: 'images'
    }))
    .pipe(gulp.dest(BUILD_DIRECTORY + 'images/'));
});

gulp.task('serverJs', function() {
  gulp.src(SERVER_DIRECTORY + '**/*')
    .pipe($.changed(BUILD_DIRECTORY))
    .pipe(gulp.dest(BUILD_DIRECTORY + 'backend/'));
  return gulp.src('server.js')
    .pipe($.changed(BUILD_DIRECTORY))
    .pipe(gulp.dest(BUILD_DIRECTORY));
});

gulp.task('js', function() {
  return gulp.src([
      SRC_DIRECTORY + '**/*.js',
      '!' + SRC_DIRECTORY + 'vendor/**',
    ])
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe($.concat('bundle.min.js', {
      newLine: ';'
    }))
    .pipe(ngAnnotate({
      // true helps add where @ngInject is not used. It infers.
      // Doesn't work with resolve, so we must be explicit there
      add: true
    }))
    .pipe($.uglify({
      mangle: true
    }))
    .pipe($.sourcemaps.write())
    .pipe(gulp.dest(BUILD_DIRECTORY));
});

gulp.task('scss', function() {
  return gulp.src([
      SRC_DIRECTORY + '**/*.scss',
      '!' + SRC_DIRECTORY + 'vendor/**'
    ])
    .pipe($.plumber())
    .pipe($.sourcemaps.init())
    .pipe($.sass().on('error', $.sass.logError))
    .pipe($.autoprefixer())
    .pipe(minifyCss())
    .pipe($.sourcemaps.write())
    .pipe($.concat('bundle.min.css'))
    .pipe(gulp.dest(BUILD_DIRECTORY + 'style/'));
});

gulp.task('karma', function(callback) {
  return karma.start({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true
  }, callback);
});

gulp.task('jshint', function() {
  return gulp.src([SRC_DIRECTORY + '**/*.js',
    '!' + SRC_DIRECTORY + 'vendor/**',
    '!' + SRC_DIRECTORY + '**/lib/**'
    ])
    .pipe($.plumber())
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe($.jshint.reporter('fail'));
});

gulp.task('vendor', function() {
  gulp.src([
      BOWER_DIRECTORY + 'jquery/dist/jquery.min.js',
      BOWER_DIRECTORY + 'jquery/dist/jquery.min.map',
      BOWER_DIRECTORY + 'angular/angular.min.js',
      BOWER_DIRECTORY + 'angular/angular.min.js.map'
    ])
    .pipe(gulp.dest(BUILD_DIRECTORY));
  return gulp.src(mainBowerFiles({
      paths: {
        bowerDirectory: BOWER_DIRECTORY,
        bowerrc: BOWER_RC_DIRECTORY,
        bowerJson: BOWER_JSON_DIRECTORY
      }
    }))
    .pipe($.plumber())
    .pipe(jsFilter)
    .pipe($.concat('vendor.js'))
    .pipe($.size({
      title: 'vendor.js'
    }))
    .pipe(gulp.dest(BUILD_DIRECTORY))
    .pipe(jsFilter.restore())

  .pipe(cssFilter)
    .pipe($.sourcemaps.init())
    .pipe($.autoprefixer())
    .pipe(minifyCss())
    .pipe($.concat('vendor.min.css'))
    .pipe($.sourcemaps.write())
    .pipe($.size({
      title: 'vendor.min.css'
    }))
    .pipe(gulp.dest(BUILD_DIRECTORY + 'style/'));
});

gulp.task('build', ['clean'], function(callback) {
  runSequence(['vendor', 'fonts', 'images', 'favIcons', 'html',
    'files', 'scss', 'js', 'serverJs'
  ], callback);
});

gulp.task('build:watch', function(callback) {
  runSequence('build', function() {
    gulp.watch(SRC_DIRECTORY + '**/*.js', ['js']);
    gulp.watch(SERVER_DIRECTORY + '**/*.js', ['serverJs']);
    gulp.watch('./server.js', ['serverJs']);
    gulp.watch(SRC_DIRECTORY + '**/*.html', ['html']);
    gulp.watch(SRC_DIRECTORY + '**/*.scss', ['scss']);
    callback();
  });
});

// Run node
gulp.task('serve', ['build:watch'], function(cb) {
  src.server = [
    BUILD_DIRECTORY + 'server.js',
    BUILD_DIRECTORY + 'backend/**/*',
    '!' + BUILD_DIRECTORY + 'backend/**/uploads/**'
  ];

  var started = false;
  var cp = require('child_process');
  var assign = require('object-assign');

  var server = (function startup() {
    var child = cp.fork(BUILD_DIRECTORY + 'server.js', {
      env: assign({
        NODE_ENV: 'development'
      }, process.env)
    });
    child.once('message', function(message) {
      if (message.match(/^online$/)) {
        if (browserSync) {
          browserSync.reload();
        }
        if (!started) {
          started = true;
          gulp.watch(src.server, function() {
            $.util.log('Restarting development server.');
            server.kill('SIGTERM');
            server = startup();
          });
          cb();
        }
      }
    });
    return child;
  })();

  process.on('exit', function() {
    server.kill('SIGTERM');
  });
});

// Launch BrowserSync server
gulp.task('sync', ['serve'], function(cb) {
  browserSync = require('browser-sync');

  browserSync({
    logPrefix: 'LP',
    notify: true,
    // Run as an https by setting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    https: false,
    // Informs browser-sync to proxy our Express app which would run
    // at the following location
    proxy: 'localhost:3001/lincsproject/'
  }, cb);

  process.on('exit', function() {
    browserSync.exit();
  });

  gulp.watch([BUILD_DIRECTORY + '/**/*.*'].concat(
    src.server.map(function(file) {
      return '!' + file;
    })
  ), function(file) {
    browserSync.reload(path.relative(__dirname, file.path));
  });
});

gulp.task('default', ['sync']);
