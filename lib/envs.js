/////////////////////////////
//  ENVIRONMENT VARIABLES  //
/////////////////////////////

module.exports = {
  mongo: {
    host: process.env['EYEBROWSE_MONGO_HOST'] || "localhost",
    port: process.env['EYEBROWSE_MONGO_PORT'] || 27017,
    database: process.env['EYEBROWSE_MONGO_DATABASE'] || "eyebrowse",
  },
  region: process.env['EYEBROWSE_S3_REGION'],
  accessKey: process.env['EYEBROWSE_S3_ACCESS_KEY'],
  secretAccessKey: process.env['EYEBROWSE_S3_SECRET_ACCESS_KEY'],
  bucketName: process.env['EYEBROWSE_S3_BUCKET_NAME'],
  cookieSecret: process.env['EYEBROWSE_COOKIE_SECRET'],
}
