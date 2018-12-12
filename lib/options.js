const iconv = require('iconv-lite');
const cheerio = require('cheerio');

/**
 * create fetch options
 *
 * @param uri {String}
 * @return options {Object}
 */
exports.options = (uri) => {
  return {
    uri,
    encoding: null,
    timeout: 2000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.65 Safari/537.36'
    },
    transform: (body) => {
      body = iconv.decode(body, 'gb2312');
      return cheerio.load(body);
    }
  };
};
