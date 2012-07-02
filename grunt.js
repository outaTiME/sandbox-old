
module.exports = function (grunt) {

  grunt.initConfig({
    pkg: '<json:package.json>',
    meta: {
      banner: '/*!\n' +
        '*              __     _\n' +
        '*   _    _/__  /./|,//_`\n' +
        '*  /_//_// /_|///  //_, v.<%= pkg.version %>\n' +
        '*\n' +
        '* Copyright (c) <%= grunt.template.today("yyyy") %> outaTiME, Inc.\n' +
        '*/'
    },
    files: {
      sandbox: [
        'js/jquery-1.7.2.min.js',
        'js/bootstrap/bootstrap.min.js',
        'js/sandbox.js'
      ],

      // modules
      maps: [
        'js/jquery.ba-dotimeout.min.js',
        'js/jquery.easing.1.3.js',
        'js/jquery.scrollTo-1.4.2-min.js',
        'js/maps.js'
      ]
    },
    lint: {
      sandbox: ['grunt.js', 'app.js', 'js/sandbox.js'],

      // modules
      maps: ['js/maps.js']
    },
    concat: {
      sandbox: {
        src: ['<config:files.sandbox>'],
        dest: 'public/js/sandbox.js'
      },

      // modules
      maps: {
        src: ['<config:files.maps>'],
        dest: 'public/js/maps.js'
      }
    },
    min: {
      sandbox: {
        src: ['<banner:meta.banner>', '<config:files.sandbox>'],
        dest: 'public/js/sandbox.min.js'
      },

      // modules
      maps: {
        src: ['<banner:meta.banner>', '<config:files.maps>'],
        dest: 'public/js/maps.min.js'
      }
    },
    recess: {
      sandbox: {
        src: ['less/sandbox.less'],
        dest: 'public/css/sandbox.css',
        options: {
          compile: true,
          compress: true
        }
      },

      // modules
      maps: {
        src: ['less/maps.less'],
        dest: 'public/css/maps.css',
        options: {
          compile: true,
          compress: true
        }
      }
    },
    replace: {
      dist: {
        src: ['build/manifest.appcache', 'build/humans.txt'],
        dest: 'public',
        variables: {
          // version: '<%= pkg.version %>',
          timestamp: '<%= grunt.template.today() %>'
        }
      }
    },
    watch: {
      recess: {
        files: [
          '<config:recess.sandbox.src>',
          '<config:recess.maps.src>'
        ],
        tasks: 'recess growl:rebuild'
      },
      js: {
        files: [
          '<config:files.sandbox>',
          '<config:files.maps>'
        ],
        tasks: 'lint concat growl:rebuild'
      }
    },
    jshint: {
      options: {

        // Settings
        "passfail"      : false,  // Stop on first error.
        "maxerr"        : 100,    // Maximum errors before stopping.
        "indent"        : 2,

        // Predefined globals whom JSHint will ignore.
        "browser"       : true,   // Standard browser globals e.g. `window`, `document`.

        "node"          : true,
        "rhino"         : false,
        "couch"         : false,
        "wsh"           : true,   // Windows Scripting Host.

        "jquery"        : true,
        "prototypejs"   : false,
        "mootools"      : false,
        "dojo"          : false,

        // Development.
        "debug"         : false,  // Allow debugger statements e.g. browser breakpoints.
        "devel"         : true,   // Allow development statements e.g. `console.log();`.

        // EcmaScript 5.
        "es5"           : true,   // Allow EcmaScript 5 syntax.
        "strict"        : false,  // Require `use strict` pragma in every file.
        "globalstrict"  : false,  // Allow global "use strict" (also enables 'strict').

        // The Good Parts.
        "asi"           : false,  // Tolerate Automatic Semicolon Insertion (no semicolons).
        "laxbreak"      : true,   // Tolerate unsafe line breaks e.g. `return [\n] x` without semicolons.
        "bitwise"       : true,   // Prohibit bitwise operators (&, |, ^, etc.).
        "boss"          : false,  // Tolerate assignments inside if, for & while. Usually conditions & loops are for comparison, not assignments.
        "curly"         : true,   // Require {} for every new block or scope.
        "eqeqeq"        : true,   // Require triple equals i.e. `===`.
        "eqnull"        : false,  // Tolerate use of `== null`.
        "evil"          : false,  // Tolerate use of `eval`.
        "expr"          : false,  // Tolerate `ExpressionStatement` as Programs.
        "forin"         : false,  // Tolerate `for in` loops without `hasOwnPrototype`.
        "immed"         : true,   // Require immediate invocations to be wrapped in parens e.g. `( function(){}() );`
        "latedef"       : true,   // Prohibit variable use before definition.
        "loopfunc"      : false,  // Allow functions to be defined within loops.
        "noarg"         : true,   // Prohibit use of `arguments.caller` and `arguments.callee`.
        "regexp"        : true,   // Prohibit `.` and `[^...]` in regular expressions.
        "regexdash"     : false,  // Tolerate unescaped last dash i.e. `[-...]`.
        "scripturl"     : true,   // Tolerate script-targeted URLs.
        "shadow"        : false,  // Allows re-define variables later in code e.g. `var x=1; x=2;`.
        "supernew"      : false,  // Tolerate `new function () { ... };` and `new Object;`.
        "undef"         : true,   // Require all non-global variables be declared before they are used.

        // Persone styling prefrences.
        "newcap"        : true,   // Require capitalization of all constructor functions e.g. `new F()`.
        "noempty"       : true,   // Prohibit use of empty blocks.
        "nonew"         : true,   // Prohibit use of constructors for side-effects.
        "nomen"         : false,  // Prohibit use of initial or trailing underbars in names.
        "onevar"        : false,  // Allow only one `var` statement per function.
        "plusplus"      : false,  // Prohibit use of `++` & `--`.
        "sub"           : false,  // Tolerate all forms of subscript notation besides dot notation e.g. `dict['key']` instead of `dict.key`.
        "trailing"      : true,   // Prohibit trailing whitespaces.
        "white"         : true    // Check against strict whitespace and indentation rules.

      },
      globals: {
        'Modernizr': true,
        'google': true,
        'Spinner': true
      }
    },
    replacer: {},
    uglify: {},
    growl: {
      dev: {
        message: 'Development build done!',
        title: 'Sandbox',
        image: 'public/apple-touch-icon.png'
      },
      dist: {
        message: 'Distribution build done!',
        title: 'Sandbox',
        image: 'public/apple-touch-icon.png'
      },
      rebuild: {
        message: 'Rebuild done!',
        title: 'Sandbox',
        image: 'public/apple-touch-icon.png'
      }
    }
  });

  grunt.loadNpmTasks('grunt-recess');
  grunt.loadNpmTasks('grunt-contrib');
  grunt.loadNpmTasks('grunt-growl');
  grunt.loadNpmTasks('grunt-replace');

  grunt.registerTask('default', 'recess lint concat replace growl:dev');
  grunt.registerTask('dist', 'recess lint min replace growl:dist');

};
