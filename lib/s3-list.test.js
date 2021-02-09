const s3list = require("./s3-list");
const s3 = require("@aws-sdk/client-s3");

jest.mock('@aws-sdk/client-s3');

test('exports stable API', () => {
  expect(s3list).toHaveProperty("listObjects");
  expect(s3list).toHaveProperty("resolveSymlink");
  expect(s3list).toHaveProperty("toFileSchema");
});

// test('lists objects from s3', async () => {
//   // Properties ETag, StorageClass, and Owner are left out because Eyebrowse
//   // doesn't reference them.
//   const s3response = { Contents: [
//     {
//       Key: 'foo/',
//       LastModified: new Date("2021-01-27T20:25:21.000Z"),
//       Size: 0,
//     },
//     {
//       Key: 'foo/bar/',
//       LastModified: new Date("2021-02-01T20:05:48.000Z"),
//       Size: 0,
//     },
//     {
//       Key: 'foo/bar/baz/',
//       LastModified: new Date("2021-02-01T20:05:53.000Z"),
//       Size: 0,
//     },
//     {
//       Key: 'foo/bar/baz/image.png',
//       LastModified: new Date("2021-02-01T20:06:05.000Z"),
//       Size: 2709,
//     },
//     {
//       Key: 'link__latest',
//       LastModified: new Date("2021-01-14T16:57:00.000Z"),
//       Size: 7,
//     },
//     {
//       Key: 'link__latest_sum',
//       LastModified: new Date("2021-01-26T16:24:31.000Z"),
//       Size: 21,
//     },
//     {
//       Key: 'file_at_root.txt',
//       LastModified: new Date("2021-01-14T16:57:01.000Z"),
//       Size: 100,
//     },

//     // this a file nested in a few directories, and those directories are not
//     // present in this mocked response.  this seems to happen on S3: certain
//     // folders aren't reported in the object list, so these folders existence
//     // must be inferred by parsing the paths of files within then.  In this
//     // case, "deeply" and "deeply/nested" folders should be inferred to exist.
//     {
//       Key: 'deeply/nested/file.txt',
//       LastModified: new Date("2021-01-27T20:03:31.000Z"),
//       Size: 200,
//     },
//   ]};

//   // mock out the S3 library
//   s3.ListObjectsV2Command.mockResolvedValue({});
//   s3.S3Client.prototype.send.mockImplementation(async () => {
//     return s3response;
//   });

//   const objs = await s3list.listObjects();
//   console.log(objs);
//   expect(objs).toHaveLength(10);
//   // S3Client, ListObjectsV2Command
// });


test('successfully infers existence of unreported directories', () => {
  // Properties ETag, StorageClass, and Owner are left out because Eyebrowse
  // doesn't reference them.
  const example_files = [
    {
      name: "file.txt",
      path: "deeply/nested/file.txt",
      parent: "deeply/nested",
      size: 200,
      lastModified: 'Wed, 27 Jan 2021 20:03:31 GMT',
      lastCached: 'Tue, 09 Feb 2021 19:12:57 GMT',
      dir: false
    },
  ];

  const objs = [ ...example_files, ...s3list.listDirs(example_files)];
  console.log(objs);
  // expect(objs).toHaveLength(10);
  // S3Client, ListObjectsV2Command
});
