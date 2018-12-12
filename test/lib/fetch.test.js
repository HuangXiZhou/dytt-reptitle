const { fetch } = require('../../lib/fetch');

describe('lib/fetch', () => {
  test('return a promise', () => {
    expect.assertions(1);
    return fetch('https://jsonplaceholder.typicode.com/todos/1').then(res => {
      const { id } = JSON.parse(res);
      expect(id).toBe(1);
    });
  });
});
