const CopyWebpackPlugin = require("copy-webpack-plugin");

// Minimal config: no HTML loader, no html-webpack-plugin, no configured minimizer.
// production mode + copy-webpack-plugin copying .html is all that is needed.
module.exports = {
  mode: "production",
  entry: "./src/index.js",
  output: { path: __dirname + "/dist" },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{ from: "./src/*.html", to: "[name][ext]" }],
    }),
  ],
};
