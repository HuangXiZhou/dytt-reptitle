/**
 * Flatten array
 *
 * @param {Array} source
 * @returns {Array}
 */
exports.flatten = (source) => {
  while (source.some(item => Array.isArray(item))) {
    source = [].concat(...source);
  }
  return source;
};
