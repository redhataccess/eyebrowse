require("dotenv").config();

const { Keystone } = require("@keystonejs/keystone");
const { Text, Float, Checkbox, DateTimeUtc, Virtual } = require("@keystonejs/fields");
const { GraphQLApp } = require("@keystonejs/app-graphql");
const { AdminUIApp } = require("@keystonejs/app-admin-ui");
const { StaticApp } = require("@keystonejs/app-static");
const { MongooseAdapter: Adapter } = require("@keystonejs/adapter-mongoose");
const cors = require("cors");

const s3list = require("./lib/s3-list");
const envs = require("./lib/envs");

/////////////////////
//  KEYSTONE INIT  //
/////////////////////

const PROJECT_NAME = "eyebrowse";
const adapterConfig = { mongoUri: `mongodb://${envs.mongo.host}:${envs.mongo.port}/${envs.mongo.database}` };

console.log(`launching with this configuration:`, {
  ...envs,

  // conceal security-related configuration values
  accessKey: envs.accessKey.replace(/./g, '*'),
  secretAccessKey: envs.secretAccessKey.replace(/./g, '*'),
  cookieSecret: envs.cookieSecret.replace(/./g, '*'),
});

const keystone = new Keystone({
  cookieSecret: envs.cookieSecret,
  adapter: new Adapter(adapterConfig),
});

keystone.createList("File", {
  schemaDoc:
    "A list of files which reside in a remote filestore, whose metadata is cached within Eyebrowse.",
  fields: {
    name: { type: Text, schemaDoc: "The filename of this object" },
    path: {
      type: Text,
      schemaDoc: "The absolute file path of this object.",
    },
    parent: {
      type: Text,
      schemaDoc: "The absolute file path of the parent directory of this.",
    },
    dir: {
      type: Checkbox,
      schemaDoc: "Whether this object is a directory.",
    },
    url: {
      type: Virtual,
      schemaDoc: "The public URL for this object",
      resolver: (item) =>
        `https://${envs.bucketName}.s3.amazonaws.com/${
          item.target || item.path
        }`,
    },
    target: {
      type: Text,
      schemaDoc:
        "An absolute path to a target file in the same file store.  Used to implement symlink-like behavior.",
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

///////////////////////////////////
//  S3 CACHING PROOF OF CONCEPT  //
///////////////////////////////////

(async () => {
  console.log(`------------------`);
  console.log(`GETTING S3 OBJECTS`);
  console.log(`------------------`);

  const s3objs = await s3list.listObjects();

  // console.log(s3objs);

  console.log(`------------------`);
  console.log(`RUNNING ID QUERY   `);
  console.log(`------------------`);

  const idQuery = `
    query {
      allFiles {
        id
        name
        path
        target
      }
    }
  `;

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

  // console.log(replaceFilesVariables.newFiles);

  try {
    console.log(`[START] insert ${s3objs.length} new records into mongo`);
    await keystone.executeGraphQL({
      context: keystone.createContext(), // skip access control for auth checking
      query: replaceFilesQuery,
      variables: replaceFilesVariables,
    });
    console.log(`[FINISH] insert ${s3objs.length} new records into mongo`);
  } catch (e) {
    console.log(`[ERROR] insert ${s3objs.length} new records into mongo`);
    console.error(e);
  }
})();

module.exports = {
  keystone,
  apps: [
    new GraphQLApp(),
    new StaticApp({ path: "/", src: "public" }),
    new AdminUIApp({ name: PROJECT_NAME, enableDefaultRoute: true }),
  ],
  configureExpress: (app) => {
    app.use(cors());
    app.set("trust proxy", true);

    app.get("/files/*", async (req, res) => {
      // enforce trailing slash
      if (!/\/$/.test(req.url)) {
        res.redirect(`${req.url}/`);
        return;
      }

      // remove leading "/files/" and trailing "/"
      const requestedDir = req.url.replace(/^\/files\//, "").replace(/\/$/, "");
      const clientFileList = await keystone.executeGraphQL({
        context: keystone.createContext(),
        query: `
          query($requestedDir: String) {
            allFiles(where: { parent: $requestedDir }, sortBy: [dir_DESC, name_ASC]) {
              id
              name
              path
              dir
              parent
              target
              size
              url
              lastModified
              lastCached
            }
          }
        `,
        variables: {
          requestedDir
        }
      });

      const data = {
        allFiles: clientFileList.data.allFiles,
        bucket: {
          region: envs.region,
          bucketName: envs.bucketName,
        }
      };

      res.type("json").send({
        status: "success",
        data,
      });
    });

    // add trailing slash if omitted
    app.get("/files", async (req, res) => res.redirect("/files/"));

  },
};
