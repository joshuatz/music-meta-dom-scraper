const fs = require('fs');
const path = require('path');
const BOOKMARKLET_TITLE = 'Music-Meta-DOM-Scraper'
const codeInFile = path.join(__dirname,'index.build.js');
const distDir = path.join(__dirname, 'dist');
const htmlOutFile = path.join(distDir, 'index.html');

const createBookmarklet = () => {
	// Prep dir
	if (!fs.existsSync(distDir)) {
		fs.mkdirSync(distDir);
	}
	// Get raw code from file
	const rawCode = fs.readFileSync(codeInFile).toString();
	// Clean up
	const outCode = `javascript:${encodeURIComponent(rawCode)}`;
	// Write out as template
	const rawHtml = getInstallPageHtml(outCode, BOOKMARKLET_TITLE)
	fs.writeFileSync(htmlOutFile, rawHtml);
}


/**
 * Get the raw HTML code for the bookmarklet install page
 * @param {string} bookmarkletString - Raw bookmarklet JS
 * @param {string} title - Title for bookmarklet
 */
const getInstallPageHtml = (bookmarkletString, title) => {
	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${title} - Install Page</title>
	<style>
		#main {
			text-align: center;
		}
		.bookmarklet {
			box-shadow:inset 0px 0px 15px 3px #23395e;
			background:linear-gradient(to bottom, #2e466e 5%, #415989 100%);
			background-color:#2e466e;
			border-radius:17px;
			border:1px solid #1f2f47;
			display:inline-block;
			cursor:pointer;
			color:#ffffff;
			font-family:Arial;
			font-size:15px;
			padding:6px 13px;
			text-decoration:none;
			text-shadow:0px 1px 0px #263666;
		}
	</style>
</head>
<body>
	<div id="main">
		<h1>${title} Install:</h1>
		<p>
		Drag this button to your bookmarks bar to save it as a bookmarklet:
		</p>
		<p>
		<a class="bookmarklet" href="${bookmarkletString}">${title}</a>
		</p>
	</div>
</body>
</html>`;
}

createBookmarklet();