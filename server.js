const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const archiver = require('archiver');

const app = express();
const port = process.env.PORT || 3000;
const basePath = process.env.BASE_PATH || 'files';
const uploadsDir = path.join(__dirname, 'uploads');
const singleFilesDir = path.join(uploadsDir, 'single');
const folderUploadsDir = path.join(uploadsDir, 'folders');
const publicDir = path.join(__dirname, 'public');
const fileMapPath = path.join(__dirname, 'file-map.json');

fs.mkdirSync(singleFilesDir, { recursive: true });
fs.mkdirSync(folderUploadsDir, { recursive: true });

const readFileMap = () => {
  try {
    return JSON.parse(fs.readFileSync(fileMapPath, 'utf8'));
  } catch (_error) {
    return {};
  }
};

const writeFileMap = (map) => {
  fs.writeFileSync(fileMapPath, JSON.stringify(map, null, 2));
};

const safeRelativePath = (inputPath) => {
  const normalized = path.posix.normalize(String(inputPath).replace(/\\/g, '/'));
  const parts = normalized.split('/').filter((part) => part && part !== '.' && part !== '..');
  return parts.join('/');
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);
    const safeName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${extension}`;
    cb(null, safeName);
  }
});

const upload = multer({ storage });

app.use(express.urlencoded({ extended: false }));
app.use(express.static(publicDir));
app.use('/vendor/jszip', express.static(path.join(__dirname, 'node_modules', 'jszip', 'dist')));

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const fileId = crypto.randomBytes(5).toString('hex');
  const fileMap = readFileMap();

  fileMap[fileId] = {
    type: 'file',
    storedName: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    createdAt: new Date().toISOString()
  };

  const sourcePath = path.join(uploadsDir, req.file.filename);
  const finalPath = path.join(singleFilesDir, req.file.filename);
  fs.renameSync(sourcePath, finalPath);

  writeFileMap(fileMap);

  const origin = `${req.protocol}://${req.get('host')}`;
  const downloadUrl = `${origin}/${basePath}/${fileId}`;

  return res.json({
    type: 'file',
    fileId,
    originalName: req.file.originalname,
    downloadUrl
  });
});

app.post('/upload-folder', upload.array('files'), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No folder files uploaded.' });
  }

  const folderId = crypto.randomBytes(5).toString('hex');
  const folderRoot = path.join(folderUploadsDir, folderId);
  fs.mkdirSync(folderRoot, { recursive: true });

  const storedFiles = [];

  for (const file of req.files) {
    const relativePath = safeRelativePath(file.originalname);

    if (!relativePath) {
      continue;
    }

    const destinationPath = path.join(folderRoot, relativePath);
    const destinationDir = path.dirname(destinationPath);
    fs.mkdirSync(destinationDir, { recursive: true });
    fs.renameSync(path.join(uploadsDir, file.filename), destinationPath);
    storedFiles.push(relativePath);
  }

  if (storedFiles.length === 0) {
    return res.status(400).json({ error: 'Folder upload did not contain usable files.' });
  }

  const topFolderName = storedFiles[0].split('/')[0];
  const fileMap = readFileMap();

  fileMap[folderId] = {
    type: 'folder',
    folderName: topFolderName,
    storedFiles,
    createdAt: new Date().toISOString()
  };

  writeFileMap(fileMap);

  const origin = `${req.protocol}://${req.get('host')}`;
  const downloadUrl = `${origin}/${basePath}/${folderId}`;

  return res.json({
    type: 'folder',
    fileId: folderId,
    originalName: topFolderName,
    downloadUrl
  });
});

app.get(`/${basePath}/:id`, (req, res) => {
  const fileMap = readFileMap();
  const fileEntry = fileMap[req.params.id];

  if (!fileEntry) {
    return res.status(404).send('File not found.');
  }

  if (fileEntry.type === 'folder') {
    const folderPath = path.join(folderUploadsDir, req.params.id);

    if (!fs.existsSync(folderPath)) {
      return res.status(404).send('Stored folder is missing.');
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileEntry.folderName || 'folder'}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', () => {
      if (!res.headersSent) {
        res.status(500).send('Could not create ZIP archive.');
      } else {
        res.end();
      }
    });

    archive.pipe(res);
    archive.directory(folderPath, fileEntry.folderName || false);
    archive.finalize();
    return;
  }

  const filePath = path.join(singleFilesDir, fileEntry.storedName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Stored file is missing.');
  }

  return res.download(filePath, fileEntry.originalName);
});

app.listen(port, () => {
  console.log(`Upload service running on port ${port}`);
  console.log(`Download links use /${basePath}/:id`);
});
