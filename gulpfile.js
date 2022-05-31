const gulp = require('gulp');
const execSync = require('child_process').execSync;
const {watch} = gulp;
const connect = require('gulp-connect');
const browserSync = require('browser-sync').create();
const del = require('del');
const fse = require('fs-extra');
const exec = require('child_process').exec;
const fs = require('fs');

gulp.task('potree:clean', function (done) {
    del.sync(`./potree`, {force: true});
    done();
});

gulp.task('potree:clone', function (done) {
        execSync('git clone --branch 1.8 https://github.com/potree/potree');
        done();
    }
);

gulp.task('potree:modify', function (done) {
        const potreeExtra = fs.readFileSync('./potree-extra.js', 'utf8');

        fs.appendFileSync('./potree/src/Potree.js', potreeExtra);

        done();
    }
);

gulp.task('potree:build', function (done) {
        const buildProcess = exec(`cd potree && npm install`, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
            }
        });

        buildProcess.stdout.pipe(process.stdout);

        buildProcess.on('exit', (code) => {
            done();
        });
    }
);

gulp.task('potree',
    gulp.series('potree:clean', 'potree:clone', 'potree:modify', 'potree:build')
);

gulp.task("customTask", function (done) {
    done();
});

gulp.task("rollup:debug", function (done) {
    execSync('rollup -c');
    done();
});

gulp.task('copy:debug', function (done) {
        const outputFolder = 'build';

        let paths = {
            src: [
                `${outputFolder}/tmp/*`
            ],
            html: [
                "src/Reality.css",
                "src/ExportDialog.tpl.html"
            ],
            resources: [
                "resources/**/*"
            ]
        };

        gulp.src(paths.src)
            .pipe(gulp.dest(outputFolder))
            .pipe(connect.reload());

        gulp.src(paths.html)
            .pipe(gulp.dest(outputFolder))
            .pipe(connect.reload());

        gulp.src(paths.resources)
            .pipe(gulp.dest(`${outputFolder}/resources`))
            .pipe(connect.reload());

        done();
    }
);

const port = 1235;

// For development, it is now possible to use 'gulp webserver'
// from the command line to start the server (default port is 8080)
gulp.task('webserver', gulp.series(async function () {
    connect.server({
        port: port,
        https: false,
        livereload: true
    });
}));

gulp.task('reload', async function () {
    browserSync.reload();
});

gulp.task('watch', gulp.series("rollup:debug", "copy:debug", "webserver", function (done) {
    browserSync.init({
        injectChanges: true,
        proxy: "http://localhost:" + port + "/"
    });

    let watchlist = [
        'src/*.js',
        'src/*.tpl.html',
        'src/*/*.js',
        'src/animation/*.js',
        'src/animation/editor/*.js',
        'src/animation/editor/*/*.js',
        'src/navigation/*.js',
        'src/override/*.js',
        'resources/**/*',
        'examples/*.html'
    ];

    watch(watchlist, gulp.series("rollup:debug", "copy:debug"));

    done();
}));

gulp.task('clean', async function (done) {
    await del(`build_release/**`, {force: true});
    done();
});

gulp.task("rollup:release", function (done) {
    execSync('rollup -c ./rollup.config.release.js');
    done();
});

gulp.task('copy:release', function (done) {
        const output = "build_release";

        fse.copySync(`resources/icons`, output + "/resources/icons", {recursive: true});
        fse.copySync(`resources/images`, output + "/resources/images", {recursive: true});
        fse.copySync(`resources/lang`, output + "/resources/lang", {recursive: true});

        fse.copySync(`src/Reality.css`, output + "/Reality.css");
        fse.copySync(`src/ExportDialog.tpl.html`, output + "/ExportDialog.tpl.html");

        fse.copySync(`potree/build/potree`, output + "/potree");

        done();
    }
);

gulp.task("build", gulp.series("clean", "potree", "rollup:release", "copy:release"));
