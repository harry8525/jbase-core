var gulp = require('gulp');
var clean = require('gulp-clean');
var tsc = require('gulp-tsc');
var jasmine = require('gulp-jasmine');
var requirejs = require('gulp-rjs');
var uglify = require('gulp-uglifyjs');
var rjs = require('requirejs');

gulp.task('clean', function() {
  return gulp.src(['dist', 'build'])
    .pipe(clean());
});

gulp.task('tsc', ['clean'], function() {
  return gulp.src(['ts/*.ts', '!ts/undone*.ts'])
    .pipe(tsc({
      module: 'amd'
    }))
    .pipe(gulp.dest('dist'));
});

gulp.task('jasmine', ['tsc'], function() {
  return gulp.src(['lib/require.js', 'dist/*.js', 'test/*.js'])
    .pipe(jasmine({
      verbose: true,
      includeStackTrace: true
    }));
});

gulp.task('rjs', ['tsc'], function(cb) {
  rjs.optimize({
    baseUrl: 'dist',
    dir: 'build',
    optimize: '',
    modules: [{
      name: 'Control'
    }, {
      name: 'SharedControl',
      exclude: ['Control']
    }, {
      name: 'EmbedView',
      exclude: ['Control', 'SharedControl']
    }, {
      name: 'SetView',
      exclude: ['Control', 'SharedControl']
    }]
  }, function(buildResponse) {
    console.log(buildResponse);
    cb();
  }, cb);
});

gulp.task('default', ['rjs']);