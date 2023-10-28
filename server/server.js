const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const server = http.createServer(app);

// Create a middleware for handling errors
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Internal Server Error');
});

// Create / route
app.get('/', (req, res) => {
  fs.createReadStream('index.html').pipe(res);
});

const videoDirectory = './videos';

app.get('/videos', (req, res) => {
  fs.readdir(videoDirectory, (err, files) => {
    if (err) {
      next(err); // Pass the error to the error handling middleware
      return;
    }

    const videoLinks = files.map((file) => {
      const videoName = path.basename(file, '.mp4');
      return `<a href="/video/${videoName}">${videoName}</a><br>`;
    });

    const videoList = videoLinks.join('<br>');

    res.send(`<h1>Available Videos:</h1>${videoList}`);
  });
});

app.get('/video/:videoID', async (req, res, next) => {
  const videoID = req.params.videoID;

  const filePath = path.resolve(`./videos/${videoID}.mp4`);
  try {
    const stat = await fs.promises.stat(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    next(err); // Pass the error to the error handling middleware
  }
});

/* Check if the system has an environment variable for the port, otherwise defaults to 3000 */
const PORT = process.env.PORT || 3000;

// Start the server
server.listen(PORT, () => {
  console.log(`Server listening on port: ${PORT}`);
});
