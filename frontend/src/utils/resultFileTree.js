// UI index only: keep the original File objects and their upload paths intact.
export const resultFilePath = (file) => file.relativePath || file.webkitRelativePath || file.name;
export const resultFileKey = (file) => JSON.stringify([resultFilePath(file), file.name, file.size, file.lastModified]);

export function buildResultFileTree(files) {
  const root = { id: '', name: '', path: '', type: 'folder', children: new Map(), count: 0 };
  for (const file of files) {
    const parts = resultFilePath(file).split('/').filter(Boolean);
    let folder = root;
    folder.count++;
    for (const name of parts.slice(0, -1)) {
      const id = `folder:${name}`;
      if (!folder.children.has(id)) {
        const path = folder.path ? `${folder.path}/${name}` : name;
        folder.children.set(id, { id: path, name, path, type: 'folder', children: new Map(), count: 0 });
      }
      folder = folder.children.get(id);
      folder.count++;
    }
    const id = resultFileKey(file);
    folder.children.set(`file:${id}`, { id, name: file.name, path: resultFilePath(file), type: 'file', file });
  }
  return root;
}

export function getResultFolder(root, path) {
  let folder = root;
  for (const name of path) {
    folder = folder.children.get(`folder:${name}`);
    if (!folder) return null;
  }
  return folder;
}

export function collectResultFiles(node) {
  const files = [];
  const stack = [node];
  while (stack.length) {
    const current = stack.pop();
    if (current.type === 'file') files.push(current.file);
    else for (const child of current.children.values()) stack.push(child);
  }
  return files;
}
