/**
 * @file Copies the bookmarklet multi-line comment block from the source to the minified build file
 * Necessary because Parcel does not support preserving a single comment (it's all or nothing)
 */
const fs = require('fs');

const originalFileContents = fs.readFileSync(`${__dirname}/index.js`).toString();
const bookmarkletCommentBlock = originalFileContents.match(/\/\/ ==Bookmarklet(?:.|[\r\n])+\/Bookmarklet==/gim)[0];
fs.writeFileSync(`${__dirname}/index.build.js`, '\n\n' + bookmarkletCommentBlock, {
	flag: 'a'
});