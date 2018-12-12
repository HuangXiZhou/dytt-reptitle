const { options } = require('../../lib/options');

describe('/lib/option.js', () => {
  test('should return request options', () => {
    const { uri, encoding, timeout, headers, transform } = options('http://test.com');
    const expectedHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.65 Safari/537.36'
    };
    const dom = '<p>test</p>';
    expect(uri).toMatch('http');
    expect(encoding).toBeNull();
    expect(timeout).toBe(2000);
    expect(headers).toEqual(expect.objectContaining(expectedHeaders));
    expect(transform).toBeInstanceOf(Function);
    expect(transform(dom)).toBeInstanceOf(Object);
  });
});
