// webpack.config.js
module.exports = {
    entry: './src/js/main.js',
    output: {
        path: './dist',
        filename: 'bundle.js'
    },
    module: {
        loaders: [
            { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader"},
            { test: /\.css$/, loader: "style-loader!css-loader" },
            { test: /\.json$/, loader: "json-loader"},
            { test: /\.csv$/, loader: "dsv-loader"}
        ]
    }
};
