
const path = require('path');

module.exports = {
    context: path.resolve(__dirname, '.'),
    devtool: 'inline-source-map',
    entry: './tests/RouterExport.ts',
    mode: 'development',
    module: {
        rules: [{
            test: /\.ts$/,
            use: 'ts-loader',
            exclude: /node_modules/
        }]
    },
    output: {
        filename: 'MultiRouter.js',
        path: path.resolve(__dirname, 'build'),
        library: 'Router'
    },
    resolve: {
        extensions: ['.ts']
    },
};