// ==Bookmarklet==
// @name Music-Meta-DOM-Scraper
// @author Joshua Tzucker
// ==/Bookmarklet==

/** @type {Window & Object} */
var windowWAny = window;

/**
 * @typedef {Object} SongMeta
 * @property {string} songTitle
 * @property {string} albumTitle
 * @property {string} artistName
 * @property {string} [composerName]
 * @property {string} [durationLength]
 * @property {Array<string>} [genres]
 * @property {string} [primaryGenre]
 * @property {number} [releaseYear]
 */

/**
 * @typedef {SongMeta[]} SongCollection
 */

/**
 * @typedef {SpotifyApi.MultipleTracksResponse} SpotifyTracks
 * @typedef {SpotifyApi.TrackObjectFull} SpotifyTrack
 */

/**
 * @typedef {'album' | 'playlist' | 'favorites' | 'search' | 'unknown'} SpotifyPageType
 * @typedef {'album' | 'playlist' | 'my-tracks' | 'search' | 'unknown'} TidalPageType
 */

var MusicMetaScraper = (function(){
	let _spotifyToken;
	const _hiddenClass = 'mmsHidden';
	const _masterClass = 'musicMetaScraper';
	const _uiHtml = `
	<div class="${_masterClass} fullscreenWrapper">
		<div class="mmsFTlbr">
			<span class="mmsCpyBtn">📋</span>
			<span class="mmsClsBtn">X</span>
		</div>
		<div class="mmsFContent">
			<textarea id="mmsTextOut" readonly></textarea>
		</div>
		<textarea id="mmsTextHolder" class="${_hiddenClass}"></textarea>
	</div>
	<style>
	.${_masterClass}.fullscreenWrapper {
		position: fixed;
		width: 80%;
		top: 10%;
		left: 10%;
		z-index: 9999;
		border: 1px solid white;
		border-top-left-radius: 10px;
		border-top-right-radius: 10px;
		padding: 1px;
	}
	.${_masterClass}.fullscreenWrapper > * {
		box-sizing: unset;
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
		padding: 0px 14px 12px 7px;
		background-color: black;
	}
	.${_masterClass} #mmsTextOut {
		width: 100% !important;
		height: 100%;
		min-height: 400px;
		-webkit-box-sizing: border-box;
		-moz-box-sizing: border-box;
		box-sizing: border-box;
	}
	.${_masterClass} .${_hiddenClass} {
		display: none !important;
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
	 * Check if object is valid song meta
	 * @param {any} songMeta 
	 */
	const _getIsValidSong = (songMeta) => {
		if (!songMeta || typeof songMeta !== 'object') {
			return false;
		}

		/** @type {Array<keyof SongMeta>} */
		const requiredProps = ['songTitle', 'artistName', 'albumTitle'];
		for (const prop of requiredProps) {
			if (typeof songMeta[prop] !== 'string' || !songMeta[prop]) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Use if you want to be sure you are only pushing valid results to array
	 * @param {any} songMeta 
	 * @param {SongMeta[]} songCollection 
	 * @returns {boolean} if the song was valid and added or not
	 */
	const _pushSongToCollection = (songMeta, songCollection) => {
		if (_getIsValidSong(songMeta)) {
			songCollection.push(songMeta);
			return true;
		}

		return false;
	}
	/**
	 * Grab inner text from an element. Mainly a wrapper around .innerText to ignore TS error
	 * @param {Element | null} [element] - The HTML element to grab text from
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
	 * Get meta tag content by name or property
	 * @param {string} nameOrProp
	 * @returns {string | null} value
	 */
	const _getMetaContent = function(nameOrProp){
		const match = document.querySelector(`meta[name="${nameOrProp}"], meta[property="${nameOrProp}"]`);
		if (match) {
			return match.getAttribute('content');
		}

		return null;
	}

	/**
	 * Copy text to clipboard
	 * @param {string} text
	 * @param {MouseEvent | Event} [event]
	 * @returns {Promise<boolean>} success
	 */
	const _copyCommand = async (text, event) => {
		let success = false;

		if (navigator.clipboard) {
			try {
				await navigator.clipboard.writeText(text);
				success = true;
			} catch (err) {
				console.error('Failed to write to clipboard', err);
			}
		}

		if (!success) {
			success = document.execCommand('copy');
		}

		return success;
	};

	const _clearSelection = () => {
		window.getSelection().removeAllRanges();
	}

	/**
	 * Async wrapper around setTimeout
	 * @param {number} delay 
	 */
	const _delay = async (delay) => {
		return new Promise((res) => {
			setTimeout(res, delay);
		});
	}

	// Ripper method per site
	/**
	 * @typedef {'bing' | 'allMusic' | 'google' | 'discogs' | 'spotify' | 'tidal'} RipperName
	 * @typedef {() => Promise<SongCollection>} RipperPromiseFunc
	 * @typedef {() => SongCollection} RipperFunc
	 * @typedef {RipperPromiseFunc | RipperFunc} RipperFunction
	 */
	/**
	 * @typedef {Record<RipperName, RipperFunction>} RippersCollection
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
				const composerName = _getInnerText(currTrack.querySelector('.composer'));

				/** @type {SongMeta} */
				let songInfo = {
					songTitle: _getInnerText(currTrack.querySelector('.title')),
					artistName: _getInnerText(currTrack.querySelector('.performer')),
					albumTitle,
					primaryGenre,
					genres,
					durationLength: _getInnerText(currTrack.querySelector('td.time'))
				};
				if (composerName) {
					songInfo.composerName = composerName;
				}
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
			// Song title is not directly exposed... has to be extracted alt text, which matches '{artist} - {title} - YouTube' string OR '{title} | {artist} - YouTube' (notice artist vs title is flipped around in second pattern)
			const getSongTitleFromYtPatternString = (patternString = '') => {
				// https://regexr.com/6rc9l
				const matches = patternString.match(/.+? - (.+) - YouTube$|(.+) \| .+ - YouTube$/);
				if (!matches) {
					return '';
				}

				return matches.slice(1).filter(s => !!s)[0];
			}
			let songTitle = '';
			const ytLinkText = _getInnerText(document.querySelector('.kp-wholepage a[href*="youtube"] h3 span, [data-ved] a[href*="youtube"] h3'));
			songTitle = getSongTitleFromYtPatternString(ytLinkText);
			if (!songTitle) {
				// Try to extract title via img alt text
				const image = document.querySelector('.kp-wholepage a[href*="youtube"] img[alt]');
				if (image) {
					songTitle = (image.getAttribute('alt').match(/.+ [-|] (.*)/)[1] || '')
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
		},
		discogs: function() {
			/** @type {SongCollection} */
			let result = [];

			const releaseSchemaElem = document.querySelector('script[type="application/ld+json"]#release_schema, script[type="application/ld+json"]#master_schema');
			const appJsonElem = document.querySelector('script[id="dsdata"][type="application/json"]');

			if (releaseSchemaElem) {
				// Not exactly to spec, but uses https://schema.org/MusicAlbum
				const releaseSchema = JSON.parse(_getInnerText(releaseSchemaElem));
				const albumTitle = releaseSchema.name;
				const genres = releaseSchema.genre || [];
				let primaryGenre = undefined;
				let artistName = '';
				if (genres.length) {
					primaryGenre = genres[0];
				}
				if (releaseSchema.releaseOf && releaseSchema.releaseOf.byArtist) {
					const artistMetas = releaseSchema.releaseOf.byArtist;
					artistName = artistMetas.map(meta => meta.name).join(', ');
				}
				if (!artistName && releaseSchema.byArtist) {
					artistName = releaseSchema.byArtist.name;
				}
				const releaseYear = releaseSchema.datePublished;

				/** @type {string[]} */
				let songTitles = [];

				if (releaseSchema.tracks) {
					for (const track of releaseSchema.tracks) {
						songTitles.push(track.name);
					}
				} else if (appJsonElem) {
					// Try to extract tracks from Discogs page data obj
					const appData = JSON.parse(appJsonElem.textContent);
					for (const key in appData['data']) {
						if ('tracks' in appData.data[key]) {
							appData.data[key].tracks.forEach(track => {
								songTitles.push(track.title);
							});
						}
					}
				}

				songTitles.forEach(t => {
					result.push({
						songTitle: t,
						albumTitle,
						releaseYear,
						genres,
						primaryGenre,
						artistName
					});
				});
			}
			return result;
		},
		spotify: async function() {
			const spotifyInstance = new MmsConstructor(true).spotify();
			const pathName = document.location.pathname;
			let shouldExtractActivePlayingOnly = false;
			let globalAlbumTitle = '';
			let globalReleaseYear;

			/** @type {Record<Exclude<SpotifyPageType, 'unknown'>, string>} */
			const pageTypeMap = {
				album: '/album/',
				playlist: '/playlist/',
				favorites: '/collection/tracks',
				search: '/search/'
			}
			/** @type {SpotifyPageType} */
			let pageType = 'unknown';
			for (const pageTypeName in pageTypeMap) {
				if (pathName.startsWith(pageTypeMap[pageTypeName])) {
					pageType = /** @type {SpotifyPageType} */ (pageTypeName);
				}
			}
			console.log(`Spotify Page Type = ${pageType}`);

			if (pageType === 'album') {
				// Scrape Album Title
				const albumTitle = _getInnerText(document.querySelector('span h1'));
				if (albumTitle) {
					globalAlbumTitle = albumTitle;
				} else {
					// Scrape from title
					globalAlbumTitle = document.title.replace('Spotify – ','');
				}

				// Scrape aditional album info
				let releaseDateStr = _getMetaContent('music:release_date');
				// Try per track info if global meta tag is not there
				if (!releaseDateStr) {
					const additionalInfoElem = document.querySelector('.TrackListHeader p[class*="additional-info"]');
					releaseDateStr = _getInnerText(additionalInfoElem);
				}
				if (releaseDateStr) {
					const yearMatch = /\d{4}/.exec(releaseDateStr);
					if (yearMatch) {
						globalReleaseYear = parseInt(yearMatch[0], 10);
					}
				}
			}

			if (pageType === 'favorites' || pageType === 'playlist' || pageType === 'search' || pageType === 'unknown') {
				shouldExtractActivePlayingOnly = true;
			}

			// === Actual Extraction ===
			
			/** @type {SongCollection} */
			let resultArr = [];

			if (shouldExtractActivePlayingOnly) {
				const activeRowElem = spotifyInstance.getActiveTrackRow();
				spotifyInstance.parseDomRow(activeRowElem, pageType, resultArr, globalAlbumTitle, globalReleaseYear);
				// If there is not active row, then we should fallback to extracting all
				shouldExtractActivePlayingOnly = !!activeRowElem;
				console.log({
					activeRowElem,
					shouldExtractActivePlayingOnly,
					resultArr
				});
				if (shouldExtractActivePlayingOnly && !resultArr.length) {
					// Try to grab from Web API
					console.log(`Trying to extract from Web API`);
					_pushSongToCollection(MmsConstructor.scrapeMediaSession(), resultArr);
				}
			}
			
			if (!shouldExtractActivePlayingOnly) {
				// Don't grab recommended section
				const allTrackRows = spotifyInstance.getAllTrackRows();
				allTrackRows.forEach((trackRow) => {
					spotifyInstance.parseDomRow(trackRow, pageType, resultArr, globalAlbumTitle, globalReleaseYear);
				});
			}

			if (!resultArr.length) {
				if (shouldExtractActivePlayingOnly) {
					// Likely scenario is playing off search results, or something similar that messes with the active track selectors.
					// FALLBACK to mini-player extraction
					/** @type {HTMLAnchorElement | null} */
					const miniPlayerTrackLinkElem = document.querySelector('a[aria-label*="Now playing"][href*="track/"]');
					if (miniPlayerTrackLinkElem) {
						const miniPlayerTrackId = miniPlayerTrackLinkElem.href.match(/track\/([0-9a-z]+)/i)[1];
						const songMeta = await (new MmsConstructor(true).spotify().getTrackById(miniPlayerTrackId))
						resultArr.push(songMeta);
					}
				} else {
					// Something went wrong with extracting all tracks on page
					// This is likely to happen with pages with mixed track lists - e.g. all track don't belong to same album. Such as search results and custom playlists
					// @TODO - this could eventually be supported, by making a duplicate API call that matches the current page, to get full track info. Would need to find correct API endpoints for each page type.
					if (pageType === 'search') {
						console.warn(`Extracting multiple results from /search is currently unsupported. Please start playing a song if you are trying to extract a specific result.`);
					}
					console.log(`Trying to extract from Web API`);
					_pushSongToCollection(MmsConstructor.scrapeMediaSession(), resultArr);
				}
			}

			return resultArr;
		},
		tidal: async function() {
			const pathName = document.location.pathname;
			let shouldExtractActivePlayingOnly = false;

			/** @type {Record<Exclude<TidalPageType, 'unknown'>, string>} */
			const pageTypeMap = {
				album: '/album/',
				playlist: '/playlist/',
				"my-tracks": '/my-collection/tracks',
				search: '/search'
			}
			/** @type {TidalPageType} */
			let pageType = 'unknown';
			for (const pageTypeName in pageTypeMap) {
				if (pathName.startsWith(pageTypeMap[pageTypeName])) {
					pageType = /** @type {TidalPageType} */ (pageTypeName);
				}
			}
			console.log(`Tidal Page Type = ${pageType}`);

			if (pageType === 'album') {
				// @TODO - scrape album title, etc.
			}

			if (pageType === 'my-tracks' || pageType === 'playlist' || pageType === 'search' || pageType === 'unknown') {
				shouldExtractActivePlayingOnly = true;
			}

			// === Actual Extraction ===
			
			/** @type {SongCollection} */
			let resultArr = [];

			if (shouldExtractActivePlayingOnly) {
				// DOM scraping does not well in Tidal for active playing track, but it has full MediaSession support
				// so just use that
				_pushSongToCollection(MmsConstructor.scrapeMediaSession(), resultArr);
			} else {
				// @TODO
				// Not sure this can really be done, as search results / track listing pages do not seem to include 
				// album title anywhere in DOM...
			}

			if (!resultArr.length) {
				// Try media session
				console.log(`Trying to extract from Web API`);
				_pushSongToCollection(MmsConstructor.scrapeMediaSession(), resultArr);
			}

			return resultArr;
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

	// Get cookie
	MmsConstructor.prototype.getCookie = function(cookieName){
		const v = document.cookie.match('(^|;) ?' + cookieName + '=([^;]*)(;|$)');
		return v ? v[2] : null;
	}

	/**
	 * Detect the type of site
	 */
	MmsConstructor.prototype.detectSite = function() {
		/**
		 * @type {{ripper: RipperFunction | null, name: string}}
		 */
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
		else if (/^(?:www\.){0,1}discogs\.com/.test(window.location.hostname)) {
			siteInfo.ripper = _rippers.discogs;
			siteInfo.name = 'Discogs';
		}
		else if (window.location.hostname === 'open.spotify.com') {
			siteInfo.ripper = _rippers.spotify;
			siteInfo.name = 'Spotify';
		}
		else if (window.location.hostname === 'listen.tidal.com') {
			siteInfo.ripper = _rippers.tidal;
			siteInfo.name = 'Tidal';
		}
		return siteInfo;
	}
	/**
	 * Ensure that all the HTML & CSS has been injected for the UI
	 */
	MmsConstructor.prototype.ensureInjected = async function() {
		if (!this.injected) {
			this.uiElem = document.createElement('div');
			this.uiElem.innerHTML = _uiHtml;
			document.body.appendChild(this.uiElem);
			this.attachListeners();
			this.injected = true;
		}
	}
	/**
	 * Display the scraped meta info in an actual UI on the screen, instead of the console
	 * @param {string} [meta] Meta to display, instead of ripping
	 */
	MmsConstructor.prototype.displayMeta = async function(meta) {
		const output = (await this.rip() || meta)
		if (output && output !== ''){
			await this.ensureInjected();
			this.uiElem.style.display = 'block';
			/** @type {HTMLTextAreaElement} */
			const textArea = this.uiElem.querySelector('#mmsTextOut');
			textArea.value = output;

			await this.copyToClipboard(output);
		}
		else {
			alert('Could not find music meta on page!');
		}
	}
	/**
	 * Copy to Clipboard via hidden textarea
	 * @param {string} str 
	 */
	MmsConstructor.prototype.copyToClipboard = async function(str) {
		await this.ensureInjected();
		/** @type {HTMLTextAreaElement} */
		const textArea = this.uiElem.querySelector('#mmsTextHolder');
		const previousVal = textArea.value;
		textArea.value = str;

		// To copy to clipboard, need to select text *and* textarea must be visible
		textArea.classList.remove(_hiddenClass);
		textArea.select();
		await _copyCommand(str);
		_clearSelection();
		textArea.value = previousVal;
		textArea.classList.add(_hiddenClass);
	}
	/**
	 * Internal use: attach event listeners to constructed UI
	 */
	MmsConstructor.prototype.attachListeners = function() {
		// Close Button
		document.querySelector(`.${_masterClass} .mmsFTlbr .mmsClsBtn`).addEventListener('click', (evt)=>{
			this.hideMeta();
		});
		// Copy Button
		document.querySelector(`.${_masterClass} .mmsFTlbr .mmsCpyBtn`).addEventListener('click', (evt)=>{
			/** @type {HTMLTextAreaElement} */
			const textArea = this.uiElem.querySelector('#mmsTextOut');
			this.copyToClipboard(textArea.value);
		});
		// Catch all clicks, for auto modal dismissal
		document.addEventListener('click', evt => {
			// Hide popup if click was outside
			// @ts-ignore
			if ((evt.target).matches(`.${_masterClass} *`) === false) {
				this.hideMeta();
			}
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
	/**
	 * Rip the meta info from the site, and get raw (JSON or string)
	 * @param {boolean} [OPT_preferJson] - Should JSON output be preferred over TSV/String
	 */
	MmsConstructor.prototype.ripRaw = async function(OPT_preferJson) {
		const siteInfo = this.detectSite();
		console.log({ siteInfo });
		if (siteInfo.ripper){
			this.scrapedInfo = await siteInfo.ripper();
			console.log('scrapedInfo', this.scrapedInfo);
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
	 * @returns {Promise<string>} meta info
	 */
	MmsConstructor.prototype.rip = async function(){
		const strOrJsonOut = await this.ripRaw();
		let output = strOrJsonOut;
		if (typeof(strOrJsonOut)==='object'){
			output = JSON.stringify(strOrJsonOut,null,4);
		}
		return output.toString();
	}

	/**
	 * Set of Spotify utility methods
	 */
	/**
	 * @param {string} [token] override spotify auth token
	 */
	MmsConstructor.prototype.spotify = function(token){
		const ApiBase = `https://api.spotify.com/v1`;
		/** @type {RequestInit} */
		const sameOriginMode = {
			mode: 'same-origin'
		};

		const init = async () => {
			if (token && token.length) {
				_spotifyToken = token;
			}

			if (!_spotifyToken) {
				_spotifyToken = await getToken();
			}

			if (!_spotifyToken) {
				throw new Error('Could not get Spotify token!');
			}

			return true;
		}
		/**
		 * 
		 * @param {string} token 
		 * @param {RequestInit} [options]
		 * @returns {RequestInit}
		 */
		const getAuthFetchOptions = (token, options = {}) => {
			return {
				...options,
				headers: {
					'authorization': `Bearer ${token}`
				}
			}
		}
		const getToken = async (refresh) => {
			// Cache with instance global
			if (_spotifyToken && !refresh) {
				return _spotifyToken;
			};

			const res = await fetch('https://open.spotify.com/get_access_token?reason=transport&productType=web_player', sameOriginMode);
			/** @type {string} */
			const token = (await res.json()).accessToken;
			return token;
		}
		/** @param {string} endpoint */
		const fetchWithAuth = async (endpoint) => {
			await init();
			const res = await fetch(endpoint, getAuthFetchOptions(_spotifyToken));
			const json = await res.json();
			return json;
		}
		/**
		 * Get track details by ID (e.g. '4uZkg6aWtrUGW5mcsjoTgU')
		 * @param {string} trackId
		 * @returns {Promise<SongMeta>}
		 */
		const getTrackById = async (trackId) => {
			const tracks = await getTracksById([trackId]);
			return tracks[0];
		}
		/**
		 * Get multiple tracks by IDs
		 * @param {string[]} trackIds
		 * @returns {Promise<SongMeta[]>}
		 */
		const getTracksById = async (trackIds) => {
			await init();
			const endpoint = `${ApiBase}/tracks?ids=${trackIds.join(',')}&market=from_token`;
			const resJson = await fetchWithAuth(endpoint);
			return resJson.tracks.map(track => spotifyToMms(track));
		}
		/**
		 * Convert Spotify JSON into Mms format
		 * @param {SpotifyTrack} sTrack
		 * @returns {SongMeta}
		 */
		const spotifyToMms = (sTrack) => {
			/** @type {SongMeta} */
			const songMeta = {
				albumTitle: sTrack.album.name,
				artistName: sTrack.artists.map(artist => artist.name).join(', '),
				songTitle: sTrack.name,
				durationLength: `${(sTrack.duration_ms / 1000 / 60).toFixed(2)} minutes`
			}
			if (sTrack.album.release_date && sTrack.album.release_date.match(/\d{4}/)) {
				songMeta.releaseYear = parseInt(sTrack.album.release_date.match(/\d{4}/)[0], 10);
			}

			return songMeta;
		}

		/** @param {HTMLDivElement | HTMLLIElement} row */
		/**
		 * 
		 * @param {HTMLDivElement | HTMLLIElement | Element} row 
		 * @param {SpotifyPageType} pageType
		 * @param {SongMeta[]} resultArr - Where to push result to
		 * @param {string} [globalAlbumTitle] 
		 * @param {number} [globalReleaseYear] 
		 * @returns {void}
		 */
		const parseDomRow = (row, pageType, resultArr, globalAlbumTitle, globalReleaseYear) => {
			if (!row) {
				return;
			}

			// NOTE: They have removed pretty much all readable CSS & HTML, so the selectors are pretty crazy now
			// Search results page does not have album title in DOM
			const albumTitle = _getInnerText(row.querySelector(`a[href^="/album/"]`));

			/** @type {SongMeta} */
			let songInfo = {
				songTitle: _getInnerText(row.querySelector('a[href^="/track/"]')),
				artistName: _getInnerText(row.querySelector('span a[href*="/artist/"]')),
				albumTitle: albumTitle || globalAlbumTitle
			};

			if (pageType !== 'unknown') {
				/** @type {Record<Exclude<SpotifyPageType, 'unknown'>, number>} */
				const durationColIndexMap = {
					search: 2,
					album: 3,
					playlist: 4,
					favorites: 5
				}
				const durationColIndex = durationColIndexMap[pageType];
				const durationElem = row.querySelector(`div[role="gridcell"][aria-colindex="${durationColIndex}"] > div`);
				if (durationElem) {
					songInfo.durationLength = _getInnerText(durationElem);
				}
			}
			if (typeof globalReleaseYear === 'number') {
				songInfo.releaseYear = globalReleaseYear;
			}

			const songPushed = _pushSongToCollection(songInfo, resultArr);

			if (!songPushed) {
				console.warn(`Failed to parse Spotify track DOM Row`, row, songInfo);
			}
		}

		/**
		 * Get all track DOM elements
		 * @returns {HTMLDivElement[]}
		 */
		const getAllTrackRows = () => {
			return Array.from(document.querySelectorAll('div[role="row"]'));
		}
		
		/**
		 * Return the actively playing track, if exists
		 * @returns {?HTMLDivElement}
		 */
		const getActiveTrackRow = () => {
			// Spotify removed all semantic HTML / CSS that indicates currently playing track
			// This is nuts, but the easiest way is to look for a track that has a specific highlighted green color title
			const allTracks = getAllTrackRows();
			for (const track of allTracks) {
				// UGH :(
				const possibleTitles = Array.from(track.querySelectorAll('div > div > div > div > div > div > div> div> div> div'));
				for (const elem of possibleTitles) {
					const colorStr = getComputedStyle(elem).color;
					if (colorStr === 'rgb(29, 185, 84)' || colorStr === 'rgb(30, 215, 96)') {
						return track;
					} else {
						console.log({
							colorStr,
							elem
						});
					}
				}
			}

			return null;
		}
		return {
			getToken,
			getAllTrackRows,
			getActiveTrackRow,
			getTrackById,
			getTracksById,
			parseDomRow,
			init
		}
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
			const currentLabel = (advancedDetails[x].querySelector("div a:first-child").innerText).replace(/:/,"");
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

	/**
	 * Tries to grab info from MediaSession Web API
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/MediaSession
	 * @returns {SongMeta | null}
	 */
	MmsConstructor.scrapeMediaSession = () => {
		if ('mediaSession' in navigator) {
			const mediaSession = window.navigator.mediaSession;
			const metaData = mediaSession.metadata;
			if (metaData) {
				/** @type {SongMeta} */
				const songMeta = {
					albumTitle: metaData.album,
					artistName: metaData.artist,
					songTitle: metaData.title
				}
				return songMeta;
			}
		}

		return null;
	}
	return MmsConstructor;
})();

// @ts-ignore
window.musicMetaScraper = typeof(window.musicMetaScraper)==='object' ? window.musicMetaScraper : (new MusicMetaScraper());
// @ts-ignore
window.musicMetaScraper.displayMeta();