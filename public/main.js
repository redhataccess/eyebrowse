import Vue from "./_snowpack/pkg/vue/dist/vue.esm.js";
import "./_snowpack/pkg/@patternfly/pfe-icon.js";
import "./_snowpack/pkg/@patternfly/pfe-number.js";
import "./_snowpack/pkg/@patternfly/pfe-datetime.js";
import "./_snowpack/pkg/@patternfly/pfe-button.js";

const cache = {
  http: {},
  files: {
    // prepopulate a fake "root" path
    "": {
      dir: true,
      name: "",
      path: "",
      size: 0,
    }
  },
};

function cacheGet(type, path) {
  return cache[type][path];
}

function cacheStash(type, path, fileObj) {
  cache[type][path] = fileObj;
  console.log(`UPDATED CACHE ${type}`);
  console.table(cache[type]);
}

const defaultConfig = {
  api_url: "/"
}

async function fetchConfig() {

  if (!window.eyebrowse_config) {
    try {
      const res = await fetch("config.json");
      window.eyebrowse_config = await res.json();
    } catch (e) {
      console.error(e);
      window.eyebrowse_config = defaultConfig;
    }
  }

  return window.eyebrowse_config;
}

async function fetchBucket(path) {
  const cached = cacheGet('http', path );
  if (cached) {
    return cached.data;
  }

  const config = await fetchConfig();

  // ensure there's a trailing slash
  const apiUrlWithSlash = config.api_url.replace(/\/$/g, "") + "/";

  const res = await fetch(apiUrlWithSlash + "files/" + path);
  const resJSON = await res.json();
  const allFiles = resJSON.data.allFiles;
  const bucket = resJSON.data.bucket;

  // update http cache
  cacheStash('http', path, resJSON);

  // update file object cache
  allFiles.forEach(f => cacheStash('files', f.path, f));

  // establish references to each file's parent dir
  allFiles.forEach(f => {
    f.parentRef = cacheGet("files", f.parent);
  });

  console.log({allFiles});

  return { bucket, allFiles };
}

const app = new Vue({
  el: "#app",
  data: {
    allFiles: {},
    appName: "Eyebrowse",
    currentPath: "",
    currentDir: {},
    breadcrumbs: [],
    bucket: { bucketName: "", region: ""}
  },
  methods: {

    browseDir: async function(path) {
      this.currentPath = path;
      this.updateCurrentDir(path);
    },

    updateBucketData: async function(path) {
      const { allFiles, bucket } = await fetchBucket(this.currentPath);
      console.log(`FILE LIST RECEIVED`);
      console.table(allFiles);
      this.allFiles = allFiles;
      if (bucket) {
        this.bucket = bucket;
      }
    },

    updateBreadcrumbs: function(fromDir) {
      // update the array of breadcrumbs
      this.breadcrumbs = [];
      let next = this.currentDir;
      while(next.parentRef) {
        this.breadcrumbs.push(next);
        next = next.parentRef;
      }
      this.breadcrumbs.reverse();
    },

    updateCurrentDir: function(path) {
      // update the current dir reference
      this.currentDir = cacheGet('files', path);
      console.log(`BROWSING CURRENT DIR: ${path}`);
      console.table(this.currentDir);
    }
  },
  watch: {
    currentDir: function (dir) {
      this.updateBucketData(dir.path);
      this.updateBreadcrumbs(dir);
    },
  },
  created: async function() {
    this.browseDir("");
  },
});

window.app = app;
