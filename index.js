// @ts-check

// ==Bookmarklet==
// @name Music-Meta-DOM-Scraper
// @author Joshua Tzucker
// ==/Bookmarklet==

/**
 * @typedef {Object<string, any>} SongMeta
 * @property {string} songTitle
 * @property {string} albumTitle
 * @property {string} artistName
 * @property {string} [durationLength]
 * @property {Array<string>} [genres]
 * @property {string} [primaryGenre]
 * @property {number} [releaseYear]
 */

/**
 * @typedef {SongMeta[]} SongCollection
 */

const MusicMetaScraper = (function(){
	const _masterClass = 'musicMetaScraper';
	const _uiHtml = `
	<div class="${_masterClass} fullscreenWrapper">
		<div class="mmsFTlbr"><span>X</span></div>
		<div class="mmsFContent">
			<textarea id="mmsTextOut" readonly></textarea>
		</div>
	</div>
	<style>
	.${_masterClass}.fullscreenWrapper {
		position: absolute;
		width: 80%;
		height: 80%;
		top: 10%;
		left: 10%;
		z-index: 9999;
		border: 1px solid white;
		border-top-left-radius: 10px;
		border-top-right-radius: 10px;
	}
	.${_masterClass} .mmsFTlbr {
		width: calc(100% - 20px);
		background-color: black;
		color: white;
		padding: 10px;
		border-top-left-radius: 10px;
		border-top-right-radius: 10px;
		text-align: right;
	}
	.${_masterClass} .mmsFTlbr span {
		font-size: 19px;
		font-family: serif;
		cursor: pointer;
	}
	.${_masterClass} .mmsFContent {
		width: calc(100% - 22px);
		height: calc(100% - 40px);
		padding: 0px 14px 12px 7px;
		background-color: black;
	}
	.${_masterClass} #mmsTextOut {
		width: 100%;
		height: 100%;
	}
	</style>
	`;
	/**
	 * Get an empty song object
	 * @returns {SongMeta}
	 */
	const _dummySong = function(){
		return {
			songTitle: '',
			albumTitle: '',
			artistName: '',
			primaryGenre: '',
			genres: []
		}
	}
	/**
	 * Grab inner text from an element. Mainly a wrapper around .innerText to ignore TS error
	 * @param {Element} element - The HTML element to grab text from
	 * @param {boolean} [OPT_trim] - Optional: Should the grabbed text be .trim()'ed?
	 */
	const _getInnerText = function(element, OPT_trim){
		const useTrim = typeof(OPT_trim)==='boolean' ? OPT_trim : true;
		let value = '';
		if (!!element) {
			// @ts-ignore
			if (typeof (element.innerText) === 'string'){
				// @ts-ignore
				value = element.innerText;
			}
			else if (typeof (element.nodeValue) === 'string') {
				value = element.nodeValue;
			}
		}
		if (useTrim){
			return value.trim();
		}
		return value;
	}
	/**
	 * Copies string to clipboard if copy() is available, else output to console
	 * @param {string} strToCopy - String to copy to output
	 */
	const _copyString = function(strToCopy) {
		// @ts-ignore
		if (typeof(window.copy)==='function'){
			// @ts-ignore
			window.copy(strToCopy);
		}
		else {
			console.warn(`copy() is not available. Outputting to console instead:`);
			console.log(strToCopy);
		}
	}


	// Ripper method per site
	/**
	 * @typedef {function(): SongCollection} RipperFuction
	 */
	/**
	 * @typedef {Object<string, RipperFuction>} RippersCollection
	 */
	/**
	 * @type {RippersCollection}
	 */
	const _rippers = {
		bing: function(){
			/** @type {SongCollection} */
			let result = [];
			// Test for album listing instead of single song
			if (document.querySelectorAll('.carousel-content .det span.tit').length > 0){

				const albumInfoArea = document.querySelector('.carousel-content');
				const albumKGraph = document.querySelector("div[class*=entity][data-feedbk-ids*=Album]");
				let albumMeta = _dummySong();
				if (albumKGraph){
					/** @type {SongMeta} */
					albumMeta = MmsConstructor.scrapeBingKGraph(albumKGraph);
				}

				// @ts-ignore
				const [artistName,albumTitle] = albumInfoArea.querySelector('.carousel-title').innerText.split('/').map((t)=>t.trim());

				albumInfoArea.querySelectorAll('.items .item.sel .det a[aria-label]').forEach(songElem => {
					/** @type {SongMeta} */
					let songInfo = {
						albumTitle: albumTitle,
						artistName: artistName,
						songTitle: _getInnerText(songElem.querySelector('.tit'))
					};
					if (songElem.querySelector('.b_floatR')){
						songInfo.durationLength = _getInnerText(songElem.querySelector('.b_floatR'));
					}
					if (albumMeta){
						songInfo.primaryGenre = albumMeta.primaryGenre;
						songInfo.genres = albumMeta.genres;
						songInfo.releaseYear = albumMeta.releaseYear;
					}
					result.push(songInfo);
				});
			}
			else {
				const songArea = document.querySelector("div[class*=entity][data-feedbk-ids*=Song]");
				if (songArea){
					const songInfo = MmsConstructor.scrapeBingKGraph(songArea);
					result.push(songInfo);
				}
			}
			return result;
		},
		allMusic: function(){
			/** @type {SongCollection} */
			let result = [];
			const albumTitle = _getInnerText(document.querySelector('h1.album-title'));
			const primaryGenre = _getInnerText(document.querySelector('.basic-info .genre a[href*="genre"]')).trim();
			let genres = [primaryGenre];
			const genreLinks = document.querySelectorAll('.basic-info .styles a[href*="style"]');
			for (let x=0; x<genreLinks.length; x++){
				const genreText = _getInnerText(genreLinks[x]);
				if (genres.indexOf(genreText)==-1){
					genres.push(genreText);
				}
			}
			let releaseYear = null;
			const releaseDateSpan = document.querySelector('.basic-info .release-date span');
			if (releaseDateSpan){
				releaseYear = parseInt(/\d{4}$/.exec(_getInnerText(releaseDateSpan))[0],10);
			}

			const trackElems = document.querySelectorAll('tr.track');
			for (let x=0; x<trackElems.length; x++){
				const currTrack = trackElems[x];
				/** @type {SongMeta} */
				let songInfo = {
					songTitle: _getInnerText(currTrack.querySelector('.title')),
					artistName: _getInnerText(currTrack.querySelector('.composer')),
					albumTitle: albumTitle,
					primaryGenre: primaryGenre,
					genres: genres,
					durationLength: _getInnerText(currTrack.querySelector('td.time'))
				};
				if (releaseYear){
					songInfo.releaseYear = releaseYear;
				}
				result.push(songInfo);
			}
			return result;
		},
		google: function() {
			/** @type {SongCollection} */
			let result = [];
			const albumTitle = _getInnerText(document.querySelector('[data-attrid*=" album"]')).replace(/^Album:\s/,'');
			const artistName = _getInnerText(document.querySelector('[data-attrid*=":artist"]')).replace(/^Artists?:\s/,'');
			// Song title is not directly exposed... has to be regex matched unfortunately, from '{artist} - {title} - YouTube' string
			let songTitle = '';
			const ytLinkText = _getInnerText(document.querySelector('.kp-wholepage a[href*="youtube"] h3 span'));
			const ytTitleMatch = ytLinkText.match(/[^-]+ - (.*) - YouTube$/);
			if (ytTitleMatch) {
				songTitle = ytTitleMatch[1];
			}
			else {
				// Try to extract title via img alt text
				const image = document.querySelector('.kp-wholepage a[href*="youtube"] img[alt]');
				if (image) {
					songTitle = (image.getAttribute('alt').match(/[^-]+ - (.*)/)[1] || '')
				}
			}
			/** @type {SongMeta} */
			let songInfo = {
				songTitle,
				artistName,
				albumTitle
			};
			const releaseYearStr = _getInnerText(document.querySelector('[data-attrid*=":release"]')).replace(/^Released:\s/, '');
			if (!!releaseYearStr) {
				songInfo.releaseYear = parseInt(releaseYearStr, 10);
			}
			const genreStr = _getInnerText(document.querySelector('[data-attrid*="_genre"]')).replace(/^Genres?:\s/, '');
			if (!!genreStr) {
				const genres = genreStr.split(',').map(g => g.trim());
				songInfo.primaryGenre = genres[0];
				songInfo.genres = genres;
			}
			result.push(songInfo);
			return result;
		}
	}
	/**
	 * CONSTRUCTOR function
	 * @param {boolean} preferJson - Whether, for various methods, JSON output is preferred over TSV
	 */
	function MmsConstructor(preferJson) {
		/** @type {SongCollection} */
		this.scrapedInfo = [];
		this.prefersJson = typeof(preferJson)==='boolean' ? preferJson : false;
		this.injected = false;
		this.uiElem = null;
	}
	/**
	 * Public Methods
	 */
	/**
	 * Detect the type of site
	 */
	MmsConstructor.prototype.detectSite = function() {
		let siteInfo = {
			ripper: null,
			name: ''
		}
		if (/^(?:www\.){0,1}bing\.com/.test(window.location.hostname)){
			siteInfo.ripper = _rippers.bing;
			siteInfo.name = 'Bing';
		}
		else if (/^(?:www\.){0,1}allmusic\.com/.test(window.location.hostname)){
			siteInfo.ripper = _rippers.allMusic;
			siteInfo.name = 'AllMusic';
		}
		else if (/^(?:www\.){0,1}google\.com/.test(window.location.hostname)){
			siteInfo.ripper = _rippers.google;
			siteInfo.name = 'Google';
		}
		return siteInfo;
	}
	/**
	 * Display the scraped meta info in an actual UI on the screen, instead of the console
	 */
	MmsConstructor.prototype.displayMeta = function() {
		const output = this.rip();
		if (output && output !== ''){
			if (this.injected){
				this.uiElem.style.display = 'block';
			}
			else {
				this.uiElem = document.createElement('div');
				this.uiElem.innerHTML = _uiHtml;
				document.body.appendChild(this.uiElem);
				this.attachListeners();
				this.injected = true;
			}
			/** @type {HTMLTextAreaElement} */
			const textArea = this.uiElem.querySelector('#mmsTextOut');
			// @ts-ignore
			textArea.value = output;
		}
		else {
			alert('Could not find music meta on page!');
		}
	}
	/**
	 * Internal use: attach event listeners to constructed UI
	 */
	MmsConstructor.prototype.attachListeners = function() {
		document.querySelector(`.${_masterClass} #mmsTextOut`).addEventListener('click', (evt)=>{
			// @ts-ignore
			evt.target.select();
		});
		document.querySelector(`.${_masterClass} .mmsFTlbr span`).addEventListener('click', (evt)=>{
			this.hideMeta();
		});
	}
	/**
	 * Hide the meta UI
	 */
	MmsConstructor.prototype.hideMeta = function() {
		if (this.uiElem){
			this.uiElem.style.display = 'none';
		}
	}
	MmsConstructor.prototype.copyMeta = function() {
		_copyString(this.rip());
	}
	/**
	 * Rip the meta info from the site, and get raw (JSON or string)
	 * @param {boolean} [OPT_preferJson] - Should JSON output be preferred over TSV/String
	 */
	MmsConstructor.prototype.ripRaw = function(OPT_preferJson) {
		const siteInfo = this.detectSite();
		if (siteInfo.ripper){
			this.scrapedInfo = siteInfo.ripper();
			console.log(this.scrapedInfo);
			const preferJson = typeof(OPT_preferJson)==='boolean' ? OPT_preferJson : this.prefersJson;
			const output = preferJson ? this.scrapedInfo : MmsConstructor.metaArrToTsvString(this.scrapedInfo);
			return output;
		}
		else {
			console.warn('Could not detect site, or no built ripper');
			return '';
		}
	}
	/**
	 * Rip meta *AS STRING*
	 * @returns {string} meta info
	 */
	MmsConstructor.prototype.rip = function(){
		const strOrJsonOut = this.ripRaw();
		let output = strOrJsonOut;
		if (typeof(strOrJsonOut)==='object'){
			output = JSON.stringify(strOrJsonOut,null,4);
		}
		return output.toString();
	}

	/**
	 * Static Methods
	 */

	/**
	 * @param {SongCollection} metaArr - Array of song meta JSON to convert to TSV
	 * @returns {string} TSV (tab separated values) string
	 */
	MmsConstructor.metaArrToTsvString = function(metaArr){
		let finalTsvVal = '';
		for (let x=0; x<metaArr.length; x++){
			const song = metaArr[x];
			let line = `${song.songTitle}\t${song.artistName}\t${song.albumTitle}`;
			finalTsvVal += (finalTsvVal !== '') ? '\n' : '';
			finalTsvVal += line;
		}
		return finalTsvVal;
	}
	MmsConstructor.scrapeBingKGraph = function(entityArea) {
		const songArea = entityArea;
		let isSong = false;
		let songInfo = _dummySong();
		const advancedDetails = songArea.querySelectorAll("ul[class*=vList]")[0].querySelectorAll("ul > li");
		for (let x=0; x<advancedDetails.length; x++){
			const currentLabel = (advancedDetails[x].querySelector("span").innerText).replace(/:/,"");
			const currentValue = /^[^:]+:(.*)$/.exec(_getInnerText(advancedDetails[x]))[1].trim();
			if (/[Aa]lbum/.test(currentLabel)==true){
				songInfo.albumTitle = currentValue;
				isSong = true;
			}
			else if (/[Aa]rtist/.test(currentLabel)==true){
				songInfo.artistName = currentValue;
			}
			else if (/[Dd]uration/.test(currentLabel)==true){
				songInfo.durationLength = currentValue;
				isSong = true;
			}
			else if(/[Gg]enre/.test(currentLabel)==true){
				if (/,/.test(currentValue)==true){
					var temp = currentValue.split(",");
					for (var t = 0; t<temp.length; t++){
						songInfo.genres.push(temp[t].trim());
					}
					songInfo.primaryGenre = songInfo.genres[0];
				}
				else {
					songInfo.genres.push(currentValue);
					songInfo.primaryGenre = currentValue;
				}
			}
			else if (/[Rr]elease [Yy]ear/.test(currentLabel)==true){
				songInfo.releaseYear = parseInt(currentValue,10);
			}
		}
		if (isSong){
			songInfo.songTitle = _getInnerText(songArea.querySelector('h2'));
		}
		else {
			// h2 is really album title
			songInfo.albumTitle = _getInnerText(songArea.querySelector('h2'));
		}
		return songInfo;
	}
	return MmsConstructor;
})();

// @ts-ignore
window.musicMetaScraper = typeof(window.musicMetaScraper)==='object' ? window.musicMetaScraper : (new MusicMetaScraper());
// @ts-ignore
window.musicMetaScraper.displayMeta();