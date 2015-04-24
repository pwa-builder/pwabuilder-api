'use strict';

module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');

    grunt.initConfig({
        copy: {
            ci: {
                files: [
                    { expand: true, src: 'test-results.xml', dest: process.env.CIRCLE_TEST_REPORTS+'/mocha/' }
                ]
            }
        },
        mochaTest: {
            test: {
                options: {
                    reporter: 'spec',
                    clearRequireCache: true
                },
                src: ['test/**/*.js']
            },
            ci: {
                options: {
                    reporter: 'mocha-junit-reporter',
                    clearRequireCache: true
                },
                src: ['test/**/*.js']
            },
        },

        watch: {
            js: {
                options: {
                    spawn: false,
                },
                files: ['src/**/*.js','test/**/*.js'],
                tasks: ['default']
            }
        }
    });

    // On watch events, if the changed file is a test file then configure mochaTest to only
    // run the tests from that file. Otherwise run all the tests
    var defaultTestSrc = grunt.config('mochaTest.test.src');
    grunt.event.on('watch', function(action, filepath) {
        grunt.config('mochaTest.test.src', defaultTestSrc);
        if (filepath.match('test/')) {
            grunt.config('mochaTest.test.src', filepath);
        }
    });

    grunt.registerTask('default', 'mochaTest:test');
    grunt.registerTask('test',['mochaTest:test','watch']);
    grunt.registerTask('ci',['mochaTest:ci','copy:ci']);
};
