const { options } = require('./lib/options');
const { fetch } = require('./lib/fetch');
const { flatten } = require('./lib/utils');
const Promise = require('bluebird');
const limit = require('p-limit')(10);
const MOVIE_DETAIL_PAGE_URI_SELECTOR = '.co_content8 .ulink';
const MOVIE_TITLE_SELECTOR = '#header > div > div.bd2 > div.bd3 > div.bd3r > div.co_area2 > div.title_all > h1 > font';
const MOVIE_IMAGE_SELECTOR = '#Zoom span img';
const MOVIE_DOWNLOAD_LINK_SELECTOR = '#Zoom > span > table > tbody > tr > td > a';
const DEFAULT_INCLUDE = ['title', 'imgUrl', 'desc', 'downloadLink', 'descPageLink'];
const MOVIE_DESC_SELETOR = '#Zoom > span > p:nth-child(1)';

/**
 * Get movie detail page links
 *
 * @param {Object} cheerio
 * @returns {Array} movieDetailPageLinks
 */
function handleGetMovieDetailPageLinks (cheerio) {
  return cheerio(MOVIE_DETAIL_PAGE_URI_SELECTOR).map((idx, ele) => {
    return cheerio(ele).attr('href');
  }).get() || [];
}

/**
 * Get movie details
 *
 * @param {Object} cheerio
 * @param {Object} config
 * @returns {Array} movieDetails
 */
function handleGetMovieDetails (cheerio, uri, config) {
  let { include } = config;
  if (!include.length) include = DEFAULT_INCLUDE;
  let result = {};
  include.forEach(item => {
    if (item === 'title') {
      const title = cheerio(MOVIE_TITLE_SELECTOR).text();
      if (title) result[item] = cheerio(MOVIE_TITLE_SELECTOR).text();
      else return false;
    }
    if (item === 'imgUrl') {
      const imgUrl = cheerio(MOVIE_IMAGE_SELECTOR).eq(0).map((idx, ele) => {
        return cheerio(ele).attr('src');
      }).get()[0];
      if (imgUrl) result[item] = imgUrl;
      else return false;
    }
    if (item === 'desc') {
      const desc = cheerio(MOVIE_DESC_SELETOR).text();
      if (desc) result[item] = desc.match(/(◎简　　介=?)(.*)(?=【下载地址】)/)[2].match(/(.*)(?=◎)/)[0].replace(/\s/g, ''); // eslint-disable-line
      else return false;
    }
    if (item === 'downloadLink') {
      const downloadLink = cheerio(MOVIE_DOWNLOAD_LINK_SELECTOR).text();
      if (downloadLink) result[item] = downloadLink;
      else return false;
    }
    if (item === 'descPageLink') {
      const descPageLink = uri;
      if (descPageLink) result[item] = descPageLink;
      else return false;
    }
  });
  return JSON.stringify(result) === '{}' ? undefined : result;
}

/**
 * Get Dytt movies
 *
 * @param {Object} config
 * @returns {Promise} movieDetails
 */
module.exports = (config) => {
  config = config || { page: 1, include: DEFAULT_INCLUDE };
  if (!config.page) throw Error('Config.page is required');
  let pool = [];
  for (let i = 0; i < 1; i++) {
    pool.push(limit(() =>
      fetch({ ...options(`https://www.dytt8.net/html/gndy/dyzz/list_23_${i + 1}.html`) })
        .then($ => handleGetMovieDetailPageLinks($))
        .catch(err => err.toString())
    ));
  }
  return Promise.all(pool)
    .then(movieDetailPageLinks => flatten(movieDetailPageLinks)) // get solo movie link
    .then(movieDetailPageLinks => {
      pool = [];
      for (let i = 0; i < movieDetailPageLinks.length; i++) {
        pool.push(limit(() =>
          fetch({ ...options(`https://www.dytt8.net${movieDetailPageLinks[i]}`) })
            .then($ => handleGetMovieDetails($, `https://www.dytt8.net${movieDetailPageLinks[i]}`, config))
            .catch(err => err.toString())
        ));
      }
      return pool;
    })
    .then(pool => Promise.all(pool)) // get solo movie details
    .then(result => result.filter(v => v));
};
