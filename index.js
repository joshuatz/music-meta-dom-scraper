// ==Bookmarklet==
// @name Music-Meta-DOM-Scraper
// @author Joshua Tzucker
// ==/Bookmarklet==

/** @type {Window & Object} */
const windowWAny = window;

/**
 * @typedef {Object} SongMeta
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

/**
 * @typedef {SpotifyApi.MultipleTracksResponse} SpotifyTracks
 * @typedef {SpotifyApi.TrackObjectFull} SpotifyTrack
 */

const MusicMetaScraper = (function(){
	let _spotifyToken;
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
	 * @typedef {() => Promise<SongCollection>} RipperPromiseFunc
	 * @typedef {() => SongCollection} RipperFunc
	 * @typedef {RipperPromiseFunc | RipperFunc} RipperFuction
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
					albumTitle,
					primaryGenre,
					genres,
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
			const ytLinkText = _getInnerText(document.querySelector('.kp-wholepage a[href*="youtube"] h3 span, [data-ved] a[href*="youtube"] h3'));
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
		},
		discogs: function() {
			/** @type {SongCollection} */
			let result = [];
			const releaseSchemaElem = document.querySelector('script[type="application/ld+json"]#release_schema, script[type="application/ld+json"]#master_schema');
			if (releaseSchemaElem) {
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
				const releaseYear = releaseSchema.datePublished;
				for (const track of releaseSchema.tracks) {
					const songTitle = track.name;
					/** @type {SongMeta} */
					let songInfo = {
						albumTitle,
						releaseYear,
						genres,
						primaryGenre,
						songTitle,
						artistName
					}
					result.push(songInfo);
				}
			}
			return result;
		},
		spotify: async function() {
			const pathName = document.location.pathname;
			let shouldExtractActivePlayingOnly = false;
			const activeRowElem = document.querySelector('.tracklist-row--active');
			let globalAlbumTitle = '';
			let globalReleaseYear;

			if (document.location.pathname.startsWith('/album/')) {
				const albumTitleElem = document.querySelector('.TrackListHeader .mo-info-name');
				const additionalInfoElem = document.querySelector('.TrackListHeader p[class*="additional-info"]');
				if (albumTitleElem) {
					globalAlbumTitle = albumTitleElem.getAttribute('title');
				}
				if (additionalInfoElem) {
					const infoText = _getInnerText(additionalInfoElem);
					const yearMatch = /\d{4}/.exec(infoText);
					if (yearMatch) {
						globalReleaseYear = parseInt(yearMatch[0], 10);
					}
				}
			}

			/** @param {HTMLDivElement | HTMLLIElement} row */
			const parseDomRow = (row) => {
				const albumTitle = _getInnerText(row.querySelector('a[class*="album-name"]')) || globalAlbumTitle;
				const durationElem = row.querySelector('.tracklist-duration span');
				/** @type {SongMeta} */
				let songInfo = {
					songTitle: _getInnerText(row.querySelector('.tracklist-name')),
					artistName: _getInnerText(row.querySelector('a[class*="artist-name"]')),
					albumTitle
				};

				if (durationElem) {
					songInfo.durationLength = _getInnerText(durationElem);
				}
				if (typeof globalReleaseYear === 'number') {
					songInfo.releaseYear = globalReleaseYear;
				}

				return songInfo;
			}

			if (pathName.startsWith('/collection/tracks') || pathName.startsWith('/playlist/')) {
				shouldExtractActivePlayingOnly = true;
			}

			// === Actual Extraction ===
			
			/** @type {SongCollection} */
			let result = [];

			if (shouldExtractActivePlayingOnly && activeRowElem) {
				// @ts-ignore
				result.push(parseDomRow(activeRowElem))
			} else {
				/** @type {NodeListOf<HTMLLIElement>} */
				// Don't grab recommended section
				const allTrackRows = document.querySelectorAll('.tracklist-container:not([class*="Recommended"]) ol.tracklist li.tracklist-row')
				allTrackRows.forEach((trackRow) => {
					result.push(parseDomRow(trackRow));
				});
			}

			if (!result.length) {
				// Likely scenario is playing off search results, or something similar that messes with the active track selectors.
				// FALLBACK to mini-player extraction
				/** @type {HTMLAnchorElement | null} */
				const miniPlayerTrackLinkElem = document.querySelector('.NavBarFooter a[href*="track/"]');
				if (miniPlayerTrackLinkElem) {
					const miniPlayerTrackId = miniPlayerTrackLinkElem.href.match(/track\/([0-9a-z]+)/i)[1];
					const songMeta = await (new MmsConstructor(true).spotify().getTrackById(miniPlayerTrackId))
					result.push(songMeta);
				}
			}

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

	// Get cookie
	MmsConstructor.prototype.getCookie = function(cookieName){
		const v = document.cookie.match('(^|;) ?' + cookieName + '=([^;]*)(;|$)');
		return v ? v[2] : null;
	}

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
		else if (/^(?:www\.){0,1}discogs\.com/.test(window.location.hostname)) {
			siteInfo.ripper = _rippers.discogs;
			siteInfo.name = 'Discogs';
		}
		else if (window.location.hostname === 'open.spotify.com') {
			siteInfo.ripper = _rippers.spotify;
			siteInfo.name = 'Spotify';
		}
		return siteInfo;
	}
	/**
	 * Display the scraped meta info in an actual UI on the screen, instead of the console
	 */
	MmsConstructor.prototype.displayMeta = async function() {
		const output = await this.rip();
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
	MmsConstructor.prototype.copyMeta = async function() {
		_copyString(await this.rip());
	}
	/**
	 * Rip the meta info from the site, and get raw (JSON or string)
	 * @param {boolean} [OPT_preferJson] - Should JSON output be preferred over TSV/String
	 */
	MmsConstructor.prototype.ripRaw = async function(OPT_preferJson) {
		const siteInfo = this.detectSite();
		if (siteInfo.ripper){
			this.scrapedInfo = await siteInfo.ripper();
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
	MmsConstructor.prototype.spotify = function(token){
		/** @type {RequestInit} */
		const sameOriginMode = {
			mode: 'same-origin'
		};

		const init = async () => {
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
			if (_spotifyToken && !refresh) {
				return _spotifyToken;
			};

			const res = await fetch('https://open.spotify.com/get_access_token?reason=transport&productType=web_player', sameOriginMode);
			/** @type {string} */
			const token = (await res.json()).accessToken;
			return token;
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
			const endpoint = `https://api.spotify.com/v1/tracks?ids=${trackIds.join(',')}&market=from_token`;
			const resJson = await (await fetch(endpoint, getAuthFetchOptions(_spotifyToken))).json();
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
		return {
			getToken,
			getTrackById,
			getTracksById,
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
	return MmsConstructor;
})();

// @ts-ignore
window.musicMetaScraper = typeof(window.musicMetaScraper)==='object' ? window.musicMetaScraper : (new MusicMetaScraper());
// @ts-ignore
window.musicMetaScraper.displayMeta();