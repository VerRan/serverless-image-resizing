'use strict';

const AWS = require('aws-sdk');
const S3 = new AWS.S3({
  signatureVersion: 'v4',
});
const Sharp = require('sharp');

const BUCKET = process.env.BUCKET;
const URL = process.env.URL;
const ALLOWED_DIMENSIONS = new Set();

if (process.env.ALLOWED_DIMENSIONS) {
  const dimensions = process.env.ALLOWED_DIMENSIONS.split(/\s*,\s*/);
  dimensions.forEach((dimension) => ALLOWED_DIMENSIONS.add(dimension));
}

exports.handler = function(event, context, callback) {
  const key = event.queryStringParameters.key;  
  /**support ulr fomate http://lht-image-resize.s3-website-ap-southeast-1.amazonaws.com/300x300/blue_marble.jpg **/
//   const match = key.match(/((\d+)x(\d+))\/(.*)/);
//   const dimensions = match[1];
//   const width = parseInt(match[2], 10);
//   const height = parseInt(match[3], 10);
//   const originalKey = match[4];
  
  /***support formate http://lht-image-resize.s3-website-ap-southeast-1.amazonaws.com/blue_marble.jpg?size=300x300**/
  const match_fist = key.match(/[^\/]+$/);
  var filename_param = match_fist[0];//parse filename and param string
  const originalKey=filename_param.split('?')[0];//get fileName for orginalKey
  const match = filename_param.match(/(\d+)x(\d+)/);
  const dimensions = match[0] 
  const width = parseInt(match[1], 10); 
  const height = parseInt(match[2], 10); 
  

  if(ALLOWED_DIMENSIONS.size > 0 && !ALLOWED_DIMENSIONS.has(dimensions)) {
     callback(null, {
      statusCode: '403',
      headers: {},
      body: '',
    });
    return;
  }

  S3.getObject({Bucket: BUCKET, Key: originalKey}).promise()
    .then(data => Sharp(data.Body)
      .resize(width, height)
      .toFormat('png')
      .toBuffer()
    )
    .then(buffer => S3.putObject({
        Body: buffer,
        Bucket: BUCKET,
        ContentType: 'image/png',
        Key: key,
      }).promise()
    )
    .then(() => callback(null, {
        statusCode: '301',
        headers: {'location': `${URL}/${key}`},
        body: '',
      })
    )
    .catch(err => callback(err))
}
