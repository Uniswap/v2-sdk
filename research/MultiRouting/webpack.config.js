
const path = require('path');

module.exports = {
    context: path.resolve(__dirname, '.'),
    devtool: 'inline-source-map',
    entry: './tests/Router3.ts',
    mode: 'development',
    module: {
        rules: [{
            test: /\.ts$/,
            use: 'ts-loader',
            exclude: /node_modules/
        }]
    },
    output: {
        filename: 'MultiRouter3.js',
        path: path.resolve(__dirname, 'build'),
        library: 'Router3',        // to remove 
        //libraryTarget: 'window', // to remove
        //libraryExport: 'default'
    },
    resolve: {
        extensions: ['.ts']
    },
};