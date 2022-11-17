const aws = require('aws-sdk');

exports.signS3 = (req, res, next) => {
  const { userId } = req.userData;
  const { clientId } = req.params;

  aws.config.region = 'eu-west-3';

  const s3 = new aws.S3();
  const fileName = `avatar-${clientId || userId}-${new Date().toISOString()}`;
  const fileType = req.query['file-type'];
  const s3Params = {
    Bucket: process.env.S3_BUCKET,
    Key: fileName,
    Expires: 60,
    ContentType: fileType,
    ACL: 'public-read',
  };

  s3.listObjects({ Bucket: process.env.S3_BUCKET }, (err, data) => {
    data.Contents.map((image) => {
      if (clientId) {
        if (image.Key.includes(`avatar-${clientId}`)) {
          s3.deleteObject(
            { Bucket: process.env.S3_BUCKET, Key: image.Key },
            (err, data) => {
              console.log(err);
            }
          );
        }
      }
      if (!clientId) {
        if (image.Key.includes(`avatar-${userId}`)) {
          s3.deleteObject(
            { Bucket: process.env.S3_BUCKET, Key: image.Key },
            (err, data) => {
              console.log(err);
            }
          );
        }
      }
    });
  });

  s3.getSignedUrl('putObject', s3Params, (err, data) => {
    if (err) {
      console.log(err);
      return res.end();
    }
    const returnData = {
      signedRequest: data,
      url: `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${fileName}`,
    };
    res.write(JSON.stringify(returnData));
    res.end();
  });
};
