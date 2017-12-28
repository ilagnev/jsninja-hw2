import test from 'ava';

test('ava pass simple test', t => {
  t.pass();
});

test('ava pass async test', async t => {
  const bar = Promise.resolve('bar');
  t.is(await bar, 'bar');
});
