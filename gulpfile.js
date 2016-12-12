'use strict';

const gulp    = require('gulp');
const browser = require('browser-sync');

gulp.task('server', () => {
    browser({
        server: {
            baseDir: './'
        }
    });
});

gulp.task('reload', () => {
    browser.reload();
});

gulp.task('default', ['server'], () => {
    gulp.watch('./**/*.html', ['reload']);
});
