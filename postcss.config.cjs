/** PostCSS pipeline: inline @imports, add prefixes, minify for production. */
module.exports = {
	plugins: [
		require("postcss-import"),
		require("autoprefixer"),
		require("cssnano")({ preset: ["default", { discardComments: { removeAll: true } }] }),
	],
};
