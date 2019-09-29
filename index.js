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
 * @property {string} primaryGenre
 * @property {number} [releaseYear]
 */

/**
 * @typedef {SongMeta[]} SongCollection
 */

const MusicMetaScraper = (function(){
    /**
     * Get a empty song object
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
     * 
     * @param {Element} element 
     */
    const _getInnerText = function(element){
        // @ts-ignore
        if (typeof(element.innerText)==='string'){
            // @ts-ignore
            return element.innerText;
        }
        else if (typeof(element.nodeValue)==='string') {
            return element.nodeValue.trim();
        }
        else {
            return '';
        }
    }
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
                        songTitle: _getInnerText(songElem.querySelector('.tit')),
                        primaryGenre: ''
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
		}
	}
	function MmsConstructor(preferJson) {
        /** @type {SongCollection} */
        this.scrapedInfo = [];
        this.prefersJson = typeof(preferJson)==='boolean' ? preferJson : false;
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
        return siteInfo;
	}
	MmsConstructor.prototype.displayMeta = function(){
		//
    }
    MmsConstructor.prototype.hideMeta = function(){
        //
    }
    MmsConstructor.prototype.rip = function(){
        const siteInfo = this.detectSite();
        if (siteInfo.ripper){
            this.scrapedInfo = siteInfo.ripper();
            this.copyMeta();
        }
        else {
            console.warn('Could not detect site, or no built ripper');
        }
    }
    MmsConstructor.prototype.copyMeta = function() {
        let valueToCopy = this.prefersJson ? this.scrapedInfo : MmsConstructor.metaArrToTsvString(this.scrapedInfo);
        // @ts-ignore
        if (typeof(window.copy)==='function'){
            // @ts-ignore
            window.copy(valueToCopy);
        }
        else {
            console.warn(`copy() is not available. Outputting to console instead:`);
            console.log(valueToCopy);
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

var scraper = new MusicMetaScraper();
scraper.rip();