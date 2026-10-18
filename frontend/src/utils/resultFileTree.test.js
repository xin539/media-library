import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildResultFileTree, getResultFolder, collectResultFiles, resultFileKey } from './resultFileTree.js';
const file = (path, drop = false) => ({ name: path.split('/').pop(), size: 1234, lastModified: 42, type: 'image/jpeg', [drop ? 'relativePath' : 'webkitRelativePath']: path });

test('deep folders, multiple roots, real object identity and counts', () => {
  const files = [file('1688/汽车/主图/更多/01.jpg'), file('1688/汽车/02.jpg'), file('视频/demo.mp4'), file('说明.txt')];
  const tree = buildResultFileTree(files);
  assert.equal(tree.count, 4);
  assert.equal(tree.children.size, 3);
  const folder = getResultFolder(tree, ['1688', '汽车', '主图', '更多']);
  assert.equal(collectResultFiles(folder)[0], files[0]);
  assert.equal(getResultFolder(tree, ['1688']).count, 2);
  assert.equal(getResultFolder(tree, []), tree);
  assert.equal(getResultFolder(tree, ['missing']), null);
  assert.equal(files.length, 4); // browsing never changes upload selection
});

test('subtree and file removal exclude only the selected File objects', () => {
  const files = [file('a/main/1.jpg'), file('a/main/2.jpg'), file('a/other/1.jpg'), file('b/1.jpg')];
  const tree = buildResultFileTree(files);
  const removed = new Set(collectResultFiles(getResultFolder(tree, ['a', 'main'])));
  const remaining = files.filter(item => !removed.has(item));
  assert.deepEqual(remaining, files.slice(2));
  assert.equal(getResultFolder(buildResultFileTree(remaining), ['a', 'main']), null);
  const single = [...getResultFolder(tree, ['b']).children.values()][0];
  assert.deepEqual(collectResultFiles(single), [files[3]]);
});

test('dedupe distinguishes equal filenames in distinct paths; drop and picker match', () => {
  const selected = file('a/main/1.jpg');
  assert.equal(resultFileKey(selected), resultFileKey(file('a/main/1.jpg', true)));
  assert.notEqual(resultFileKey(selected), resultFileKey(file('a/other/1.jpg')));
  assert.equal(new Set([selected, file('a/main/1.jpg'), file('a/other/1.jpg')].map(resultFileKey)).size, 2);
});

test('2000 files can be indexed and repeatedly navigated without changing selection', () => {
  const files = Array.from({ length: 2000 }, (_, i) => file(`root/group${i % 20}/deep/${i}.jpg`));
  const tree = buildResultFileTree(files);
  for (let i = 0; i < 1000; i++) assert.equal(getResultFolder(tree, ['root', `group${i % 20}`, 'deep']).count, 100);
  assert.equal(collectResultFiles(tree).length, files.length);
  assert.equal(tree.count, 2000);
});

test('empty selection does not invent folders', () => {
  assert.equal(buildResultFileTree([]).children.size, 0);
});
