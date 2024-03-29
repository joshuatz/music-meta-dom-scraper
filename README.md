# Music-Meta-Dom-Scraper [![Netlify Status](https://api.netlify.com/api/v1/badges/28ec7c89-e928-4daa-bcb2-b6bdaa40d4fc/deploy-status)](https://app.netlify.com/sites/music-meta-dom-scraper-bookmarklet/deploys)

## What is this?
Very basic JS Bookmarklet to pull Song / Album Discography information from various websites when you are on a webpage that has song metadata, and lets you copy and paste into a spreadsheet or JSON file. 

Useful for those obsessed over cataloging their music and tracking it by hand (probably very few people).

## Demo
![Demo GIF](./demo.gif)

## What it is not
This does not use an API or headless browser; you have to navigate to the source itself and press the bookmarklet. It is not designed around bulk data extraction, other than an album at a time. I do not have plans to turn this into anything more complicated than it is already is.

## Supported sites
Right now, only:

- AllMusic
- Discogs
- Bing search results
- Google search result (usually)
- Spotify (most pages)
- Tidal (currently playing only)

This repo was mainly created as a way to consolidate the code from two separate bookmarklets I had to use scrape those sources separately.

## Short write-up
[https://joshuatz.com/projects/web-stuff/music-meta-dom-scraper/](https://joshuatz.com/projects/web-stuff/music-meta-dom-scraper/)