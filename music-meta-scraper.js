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
            primaryGenre: ''
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
                // @ts-ignore
                const [artistName,albumTitle] = albumInfoArea.querySelector('.carousel-title').innerText.split('/').map((t)=>t.trim());
                albumInfoArea.querySelectorAll('.items .item.sel .det a[aria-label]').forEach(songElem => {
                    result.push({
                        albumTitle: albumTitle,
                        artistName: artistName,
                        songTitle: _getInnerText(songElem.querySelector('.tit')),
                        primaryGenre: ''
                    });
                });
            }
            else {
                const songArea = document.querySelector("div[class*=entity][data-feedbk-ids*=Song]");
                if (songArea){
                    let songInfo = _dummySong();
                    songInfo.songTitle = _getInnerText(songArea.querySelector('h2'));
                    const advancedDetails = songArea.querySelectorAll("ul[class*=List]")[0].querySelectorAll("ul > li");
                    for (let x=0; x<advancedDetails.length; x++){
                        const currentLabel = (advancedDetails[x].querySelector("span").innerText).replace(/:/,"");
                        const currentValue = (/[^:]+/.exec(/:.+/.exec(_getInnerText(advancedDetails[x]))[0])[0]).trim();
                        if (/[Aa]lbum/.test(currentLabel)==true){
                            songInfo.albumTitle = currentValue;
                        }
                        else if (/[Aa]rtist/.test(currentLabel)==true){
                            songInfo.artistName = currentValue;
                        }
                        else if (/[Dd]uration/.test(currentLabel)==true){
                            songInfo.durationLength = currentValue;
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
                    }
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
	return MmsConstructor;
})();