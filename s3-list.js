require("dotenv").config();
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const axios = require("axios");
const { set, get, sortBy, find, last, dropRight } = require("lodash");
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

  for (let transformer of [flagDir, ...transformers]) {
    console.log("waiting for map", transformer);
    objects = await Promise.all(objects.map(transformer));
  }

  return [...objects, ...listDirs(objects)];
}

/**
 * Look for trailing slash in filename and path, and if found, remove it and set dir:true.
 *
 * S3 reports dirs with a trailing slash, but Eyebrowse wants the trailing
 * slash dropped and a dir:true flag set.
 */
function flagDir(fileIn) {
  let file = {...fileIn};
  const trailingSlash = /\/$/;

  if (trailingSlash.test(file.name)) {
    file.name = file.name.replace(trailingSlash, "");
    file.dir = true;
  }

  if (trailingSlash.test(file.path)) {
    file.path = file.path.replace(trailingSlash, "");
    file.dir = true;
  }

  return file;
}

/**
 * Insert directory objects.  Since S3 lists folders, but only _some_ folders and not others (unsure why),
 * this fills in the missing directory objects.  I think directories created
 * directly in S3 are listed, but ones that were created indirectly (by
 * uploading a zip file with dirs for example) do not.
 */
function listDirs(fileObjects) {
  // sort by parent in order to ensure we go from shorter paths to longer ones
  // (guaranteeing a later path never overwrites earlier one).
  return sortBy(fileObjects, "parent").map(file => {
    if (!file.parent) return;

    const dirPath = file.parent.split(/\//g)
    const name = last(dirPath);

    // only insert if the file object has a parent directory, and there isn't
    // already a file object for this directory
    if (!find(fileObjects, {name}) ) {
      return {
        name,
        path: dirPath.join("/"),
        parent: dropRight(dirPath).join("/"),
        size: null,
        lastModified: null,
        lastCached: null,
        dir: true,
      };
    }
  }).filter(n => n /* eliminate empty entries */);
}

/**
 * Given an S3 object (from .Contents[]), fetch it and return the path to the
 * file it's linking to.  Adds a new .Target property, and mutates the Key (to
 * remove 'link__')
 */
async function resolveSymlink(file, key, array) {
  // if the obj isn't a "symlink", just return the filepath (.Key)
  if (!file.name.startsWith("link__")) {
    return file;
  }

  // object is a "symlink", so fetch its contents and return them
  const url = getS3ObjectUrl(file);
  try {
    const response = await axios.get(url, { responseType: "text" });
    const targetName = response.data.split("\n")[0].trim();
    const targetObj = find(array, { name: targetName }) || {};
    // const targetUrl = new URL(target, getS3ObjectUrl(obj)).href;
    // console.log({target}, {targetUrl});
    file.target = targetName;

    // copy a few of the target's fields into the link.  if the target is a
    // "folder", no values will be copied in, so fall back to the link's
    // values.
    file.size = targetObj.size || file.size;
    file.lastModified = targetObj.lastModified || file.lastModified;
    file.dir = targetObj.dir || file.dir;

    // remove the link__ prefix from the "filename"
    file.name = file.name.replace("link__", "");
  } catch (e) {
    console.error(e);
  }

  // fetching the "symlink" target failed; return the original path as
  // a fallback
  return file;
}

/**
 * Return the public URL of an S3 object.
 */
function getS3ObjectUrl(file) {
  return `https://${envs.bucketName}.s3.amazonaws.com/${file.Key}`;
}

/**
 * Transform an S3 object (from .Contents) to an object that matches the
 * Eyebrowse File schema.
 */
function toFileSchema(s3obj) {
  const pathArray = s3obj.Key.replace(/\/$/, "").split("/");
  return {
    name: last(pathArray) || s3obj.Key,
    path: s3obj.Key,
    parent: dropRight(pathArray).join("/"),
    target: s3obj.Target,
    size: s3obj.Size,
    lastModified: s3obj.LastModified.toUTCString(),
    lastCached: new Date().toUTCString(),
    dir: false,
  };
}

module.exports = { listObjects, resolveSymlink, toFileSchema };

// If run standalone, simply print the contents of the bucket.
if (require.main === module) {
  async function main() {
    try {
      const objs = await listObjects([resolveSymlink, toFileSchema]);
      console.log(objs);
      console.log(listDirs(objs));
    } catch (error) {
      console.error(error);
    } finally {
      console.log("done");
    }

  }
  main();
}
