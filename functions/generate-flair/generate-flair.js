const jimp = require('jimp');
const { S3Client, PutObjectCommand, } = require('@aws-sdk/client-s3');
const fetch = require('node-fetch');

const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.FLAIR_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.FLAIR_AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.FLAIR_AWS_REGION,
});

const region = process.env.FLAIR_AWS_REGION;
const bucket = 'uniform-mesh-docs-assets';
const folder = 'flair-memes';

exports.handler = async (event) => {
  const numPiecesOfFlair = event.queryStringParameters['numPieces'] || 37;

  const blobUrl = await getBlobUrl(numPiecesOfFlair);
  
  return {
    statusCode: 200,
    body: blobUrl,
    headers: {
      "access-control-allow-origin": "*",
    },
  };
};

async function getBlobUrl(numPiecesOfFlair) {
  const blobKey = `${folder}/flair-meme-${numPiecesOfFlair}.jpg`
  const blobUrl = `https://${bucket}.s3.${region}.amazonaws.com/${blobKey}`;

  const doesBlobExist = await blobExists(blobUrl);
  if (doesBlobExist) {
    return blobUrl;
  }

  const image = await createImage(numPiecesOfFlair);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: blobKey,
    ContentType: 'image/jpeg',
    Body: image,
    ACL: 'public-read'
  });

  await s3Client.send(command);
  
  return blobUrl;
}

async function blobExists(blobUrl) {
  
  try {
    const blob = await fetch(blobUrl);
    return blob.ok;
  } catch(err) {
    console.error(`Error fetching blob '${blobUrl}': ${err.message}`);
    return false;
  }
}

async function createImage(numPiecesOfFlair) {
  const templateFileName = 'https://uniform-mesh-docs-assets.s3.us-east-2.amazonaws.com/office-space-flair-350x262.jpg';
  const imageCaption = `If you want me to wear ${numPiecesOfFlair} pieces of flair, make the minimum ${numPiecesOfFlair} pieces of flair!!`;

  const image = await jimp.read(templateFileName);
      
  const font = await jimp.loadFont('https://raw.githubusercontent.com/oliver-moran/jimp/master/packages/jimp/fonts/open-sans/open-sans-32-white/open-sans-32-white.fnt');
  
  const file = image.print(font, 10, 20, imageCaption, 280);
  
  const output = await file.getBufferAsync(jimp.MIME_JPEG);

  return output;
}


