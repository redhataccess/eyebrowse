require("dotenv").config();
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const axios = require("axios");
const { get, find, last, dropRight } = require("lodash");
const envs = require("./envs");

const client = new S3Client({
  region: process.env["EYEBROWSE_S3_REGION"],
  credentials: {
    accessKeyId: process.env["EYEBROWSE_S3_ACCESS_KEY"],
    secretAccessKey: process.env["EYEBROWSE_S3_SECRET_ACCESS_KEY"],
  },
});

/**
 * Get a list of all objects in the bucket.  If there are more than 1,000
 * objects, a series of API requests will be made and the results combined,
 * until all objects have been listed.
 *
 * @param {Function} transformer a function that can be run to transform the response received from S3.
 */
async function listObjects(transformers = []) {
  let objects = [];
  let continueListing = true; // should we keep fetching?
  let ContinuationToken; // what's the continuation token to use in the next pass?

  while (continueListing) {
    const listObjCmd = new ListObjectsV2Command({
      Bucket: process.env["EYEBROWSE_S3_BUCKET_NAME"],
      ContinuationToken,
      // MaxKeys: 1, /* default: 1000 */
    });

    const data = await client.send(listObjCmd);

    // add the contents to the running list
    objects.push(...data.Contents);

    // determine if we need to keep listing; save the continuation token.
    if (data.IsTruncated) {
      ContinuationToken = data.NextContinuationToken;
    } else {
      continueListing = false;
    }
  }

  for (let transformer of transformers) {
    console.log("waiting for map", transformer);
    objects = await Promise.all(objects.map(transformer));
  }

  return objects;
}

/**
 * Given an S3 object (from .Contents[]), fetch it and return the path to the
 * file it's linking to.  Adds a new .Target property, and mutates the Key (to
 * remove 'link__')
 */
async function resolveSymlink(obj, key, array) {
  // if the obj isn't a "symlink", just return the filepath (.Key)
  if (!obj.Key.startsWith("link__")) {
    return obj;
  }

  // object is a "symlink", so fetch its contents and return them
  const url = getS3ObjectUrl(obj);
  try {
    const response = await axios.get(url, { responseType: "text" });
    const targetName = response.data.split("\n")[0].trim();
    const targetObj = find(array, { Key: targetName }) || {};
    // const targetUrl = new URL(target, getS3ObjectUrl(obj)).href;
    // console.log({target}, {targetUrl});
    obj.Target = targetName;

    // copy in the size and lastModified of the target.  if the target is a
    // "folder", no values will be copied in, so fall back to the link's
    // values.
    obj.Size = targetObj.Size || obj.Size;
    obj.LastModified = targetObj.LastModified || obj.LastModified;

    // remove the link__ prefix from the "filename"
    obj.Key = obj.Key.replace("link__", "");
  } catch (e) {
    console.error(e);
  }

  // fetching the "symlink" target failed; return the original path as
  // a fallback
  return obj;
}

/**
 * Return the public URL of an S3 object.
 */
function getS3ObjectUrl(obj) {
  return `https://${envs.bucketName}.s3.amazonaws.com/${obj.Key}`;
}

/**
 * Transform an S3 object (from .Contents) to an object that matches the
 * Eyebrowse File schema.
 */
function toFileSchema(s3obj) {
  const pathArray = s3obj.Key.split("/");
  return {
    name: last(pathArray),
    path: s3obj.Key,
    parent: dropRight(pathArray).join("/"),
    target: s3obj.Target,
    size: s3obj.Size,
    lastModified: s3obj.LastModified.toUTCString(),
    lastCached: new Date().toUTCString(),
  };
}

module.exports = { listObjects, resolveSymlink, toFileSchema };

// If run standalone, simply print the contents of the bucket.
if (require.main === module) {
  async function main() {
    try {
      const objs = await listObjects([resolveSymlink]);
      console.log(objs);
    } catch (error) {
      console.error(error);
    } finally {
      console.log("done");
    }
  }
  main();
}
