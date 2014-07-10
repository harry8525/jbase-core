var gulp = require('gulp');
var clean = require('gulp-clean');
var tsc = require('gulp-tsc');
var jasmine = require('gulp-jasmine');
var requirejs = require('gulp-rjs');
var uglify = require('gulp-uglifyjs');

gulp.task('clean', function() {
  return gulp.src('dist')
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

gulp.task('rjs', ['tsc'], function() {
  return gulp.src(['dist/*.js'])
    .pipe(gulp.dest('build'))
    .pipe(requirejs({
      baseUrl: 'build'
    }));
  /*,
      modules: [{
        name: 'Control',
      }, {
        name: 'EmbedView',
        exclude: ['Control']
      }]
    }));
*/

  //.pipe(uglify())
  // .pipe(gulp.dest('dist'));
});


gulp.task('default', ['rjs']);
