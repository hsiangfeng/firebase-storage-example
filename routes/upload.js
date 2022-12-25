const firebaseAdmin = require('../connection/firebase');

const { v4: uuidv4 } = require('uuid');
const express = require('express');
const router = express.Router();
const multer  = require('multer');
const tinify = require("tinify");

tinify.key = process.env.TINYPNG_API_KEY;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,  // 5MB
  },
});

const bucket = firebaseAdmin.storage().bucket();

router.post('/image', upload.single('file'), function (req, res) {
  const file = req.file;

  tinify.fromBuffer(file.buffer).toBuffer(function(err, resultData) {
    if (err) throw err;

    const blob = bucket.file(`images/${uuidv4()}.${file.originalname.split('.').pop()}`);
    const blobStream = blob.createWriteStream()

    blobStream.on('finish', () => {
      res.send('上傳成功');
    });

    blobStream.on('error', (err) => {
      res.status(500).send('上傳失敗');
    });

    blobStream.end(resultData);
  });
});

router.get('/image', function (req, res) {
  // 取得檔案列表
  bucket.getFiles().then((data) => {
    
    return data[0]
  }).then(async (files) => {
    const fileList = [];
    for (const file of files) {
      // 取得檔案的簽署 URL
      const fileUrl = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491'
      });
      fileList.push({
        fileName: file.name,
        imgUrl: fileUrl
      });
    }
    res.send(fileList);
  }).catch((err) => {
    res.status(500).send('取得檔案列表失敗');
  });
});

router.delete('/image', function (req, res) {
  const fileName = req.query.fileName;
  const blob = bucket.file(fileName);
  blob.delete().then(() => {
    res.send('刪除成功');
  }).catch((err) => {
    res.status(500).send('刪除失敗');
  });
});


module.exports = router;
