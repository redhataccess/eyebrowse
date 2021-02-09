/////////////////////////////
//  ENVIRONMENT VARIABLES  //
/////////////////////////////

module.exports = {
  region: process.env['EYEBROWSE_S3_REGION'],
  accessKey: process.env['EYEBROWSE_S3_ACCESS_KEY'],
  secretAccessKey: process.env['EYEBROWSE_S3_SECRET_ACCESS_KEY'],
  bucketName: process.env['EYEBROWSE_S3_BUCKET_NAME'],
}
