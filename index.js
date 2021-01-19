require("dotenv").config();
const { Keystone } = require("@keystonejs/keystone");
const { Text, Float, DateTimeUtc, Virtual } = require("@keystonejs/fields");
const { GraphQLApp } = require("@keystonejs/app-graphql");
const { AdminUIApp } = require("@keystonejs/app-admin-ui");
const { StaticApp } = require("@keystonejs/app-static");
const { MongooseAdapter: Adapter } = require("@keystonejs/adapter-mongoose");
const s3list = require("./s3-list");
const envs = require("./envs");

/////////////////////
//  KEYSTONE INIT  //
/////////////////////

const PROJECT_NAME = "eyebrowse";
const adapterConfig = { mongoUri: "mongodb://localhost/eyebrowse" };

const keystone = new Keystone({
  adapter: new Adapter(adapterConfig),
});

keystone.createList("File", {
  schemaDoc:
    "A list of files which reside in a remote filestore, whose metadata is cached within Eyebrowse.",
  fields: {
    name: { type: Text, schemaDoc: "The path and name of this object" },
    url: {
      type: Virtual,
      schemaDoc: "The public URL for this object",
      resolver: (item) =>
        `https://${envs.bucketName}.s3.amazonaws.com/${item.name}`,
    },
    size: { type: Float, schemaDoc: "The filesize, in bytes, of this object" },
    lastModified: {
      type: DateTimeUtc,
      schemaDoc: "The last time this object was modified, as reported by S3",
    },
    lastCached: {
      type: DateTimeUtc,
      schemaDoc: "The last time this object was cached by Eyebrowse",
    },
  },
});

//////////////////////////
//  PROCESS "SYMLINKS"  //
//////////////////////////

(async () => {
  console.log(`------------------`);
  console.log(`GETTING S3 OBJECTS`);
  console.log(`------------------`);

  const s3objs = await s3list.listObjects([
    s3list.resolveSymlink,
    s3list.toFileSchema,
  ]);
  console.log(s3objs);

  const idQuery = `
    query {
      allFiles {
        id
      }
    }
  `;

  console.log(`------------------`);
  console.log(`RUNNING ID QUERY   `);
  console.log(`------------------`);

  const idQueryResponse = await keystone.executeGraphQL({
    context: keystone.createContext(), // skip access control for auth checking
    query: idQuery,
  });

  const ids = idQueryResponse.data.allFiles;

  console.log(`existing ids`, ids);

  console.log(`---------------------`);
  console.log(`RUNNING REPLACE QUERY`);
  console.log(`---------------------`);

  const replaceFilesQuery = `
    mutation($ids: [ID!], $newFiles: [FilesCreateInput]) {
      deleteFiles(ids: $ids) {
        id
      }
      createFiles(
        data: $newFiles
      ) {
        id
      }
    }
  `;

  const replaceFilesVariables = {
    ids: ids.map((i) => i.id),
    newFiles: s3objs.map((o) => ({ data: o })),
  };

  console.log(replaceFilesVariables);

  try {
    const replaceFilesQueryResponse = await keystone.executeGraphQL({
      context: keystone.createContext(), // skip access control for auth checking
      query: replaceFilesQuery,
      variables: replaceFilesVariables,
    });
  } catch (e) {
    console.error(e);
  }
})();

///////////////////////////////////
//  S3 CACHING PROOF OF CONCEPT  //
///////////////////////////////////

(async () => {
  const objs = await s3list.listObjects();
  console.log(objs);
})();

module.exports = {
  keystone,
  apps: [
    new GraphQLApp(),
    new StaticApp({ path: "/", src: "public" }),
    new AdminUIApp({ name: PROJECT_NAME, enableDefaultRoute: true }),
  ],
};
