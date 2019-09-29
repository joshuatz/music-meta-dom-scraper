// @ts-check

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

            return result;
		}
	}
	function MmsConstructor() {
        /** @type {SongCollection} */
		this.scrapedInfo = [];
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
        // @ts-ignore
        if (typeof(window.copy)==='function'){
            // @ts-ignore
            window.copy(this.scrapedInfo);
        }
        else {
            console.warn(`copy() is not available.`);
        }
    }

    /**
     * Static Methods
     */
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

var test = new MusicMetaScraper();
test.rip();