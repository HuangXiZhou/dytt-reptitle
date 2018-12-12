const rp = require('request-promise');

/**
 * create fetch
 *
 * @param options {Object}
 * @return Promise {Any}
 */
exports.fetch = (options) => rp(options);
