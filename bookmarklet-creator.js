const fs = require('fs');
const path = require('path');
const BOOKMARKLET_TITLE = 'Music-Meta-DOM-Scraper';
const codeInFile = path.join(__dirname, 'index.build.js');
const distDir = path.join(__dirname, 'dist');
const htmlOutFile = path.join(distDir, 'index.html');

const createBookmarklet = () => {
	// Prep dir
	if (!fs.existsSync(distDir)) {
		fs.mkdirSync(distDir);
	}
	// Get raw code from file
	const rawCode = fs.readFileSync(codeInFile).toString();

	// Encode as bookmarklet / JS URI string
	const outCode = `javascript:${encodeURIComponent(rawCode)}`;

	// Write out as HTML file with draggable install link
	fs.writeFileSync(htmlOutFile, getInstallPageHtml(outCode, BOOKMARKLET_TITLE));
	// as well as a file containing just the URI-encoded JS string that can
	// be manually copied
	fs.writeFileSync(path.join(distDir, 'index.md'), getInstallPageMarkdown(outCode, BOOKMARKLET_TITLE))
};

/**
 * Get the raw markdown code for the bookmarklet install page
 * @param {string} bookmarkletString - Raw bookmarklet JS
 * @param {string} title - Title for bookmarklet
 */
const getInstallPageMarkdown = (bookmarkletString, title) => {
	const mdEscapedBookmarkletString = bookmarkletString.replace(/\(/g, '%28').replace(/\)/g, '%29');

	return `
# ${title} - Install Page

You can copy and paste the string below into a new bookmark to manually create a bookmarklet version:

\`\`\`
${bookmarkletString}
\`\`\`

Or, drag this link (assuming this markdown is rendered in a way that preserves it - most hosted renderers, like GitHub will not preserve it for security reasons):

<a class="bookmarklet" target="_blank" href="${bookmarkletString}">${title}</a>
`
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
};

createBookmarklet();
