const merge = require('webpack-merge');
const baseConfig = require('./webpack.base');
const PATHS = require('./paths');

module.exports = merge(baseConfig, {
  mode: 'development',
  output: {
    publicPath: '/'
  },
  devServer: {
    port: 8080,
    historyApiFallback: true,
    open: true,
    watchContentBase: true
  },
  devtool: 'cheap-eval-source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        loader: 'eslint-loader'
      }
    ]
  }
});
