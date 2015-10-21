var gobble = require( 'gobble' );

module.exports = gobble([
    gobble( 'src/root' ),
    gobble( 'src/data' ),
    gobble( 'src' ).transform( 'browserify', {
        // Files to include, relative to `src`. Can be string or array
        entries: 'js/main.js',

        dest: 'bundle.js',

        // Whether to generate sourcemaps (defaults to true)
        debug: false,

        configure: function ( bundle ) {
            bundle.transform('babelify');
        }
    })
]);