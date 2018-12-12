const { flatten } = require('../../lib/utils');

describe('lib/utils', () => {
  test('return a flattened array', () => {
    const flattened = flatten([[1, 2, 3, 4]]);
    expect(flattened).toHaveLength(4);
  });
});
