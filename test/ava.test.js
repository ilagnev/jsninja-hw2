import test from 'ava';

test('should pass simple test', t => {
  t.pass();
});

test('should pass async test', async t => {
  const bar = Promise.resolve('bar');
  t.is(await bar, 'bar');
});
