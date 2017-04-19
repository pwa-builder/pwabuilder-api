'use strict';

module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-sync');

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
            },
            windows10: {
                files: ['../pwabuilder-windows10/lib/*.js'],
                tasks: ['sync:windows10']
            },
            cordova: {
                files: ['../pwabuilder-cordova/**/*.js'],
                tasks: ['sync:cordova']
            },
            lib: {
                files: ['../pwabuilder-lib/lib/*.js', '../pwabuilder-lib/lib/manifestTools/*.js'],
                tasks: ['sync:lib']
            }
        },
        sync: {
            windows10: {
                files: [{
                    src: ['../pwabuilder-windows10/lib/*.js'],
                    dest: 'node_modules/pwabuilder-windows10'
                }],
                verbose: true,
                failOnError: true,
                updateAndDelete: false
              },
            cordova: {
                files: [{
                    src: ['../pwabuilder-cordova/**/*.js'],
                    dest: 'node_modules/pwabuilder-cordova'
                }],
                verbose: true,
                failOnError: true,
                updateAndDelete: false
            },
            lib: {
                files: [{
                    src: ['../pwabuilder-lib/lib/*.js','../pwabuilder-lib/lib/manifestTools/*.js'],
                    dest: 'node_modules/pwabuilder-lib'
                }],
                verbose: true,
                failOnError: true,
                updateAndDelete: false
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
    grunt.registerTask('development', ['watch']);
    grunt.registerTask('forceSync', ['sync']);
};
