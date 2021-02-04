import Vue from "vue/dist/vue.esm";
import "@patternfly/pfe-icon";
import "@patternfly/pfe-number";
import "@patternfly/pfe-datetime";
import "@patternfly/pfe-button";

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
  console.log('cache updated', {cache});
}

async function fetchConfig() {
  if (!window.eyebrowse_config) {
    const res = await fetch("config.json");
    window.eyebrowse_config = await res.json();
  }
  return window.eyebrowse_config;
}

async function fetchFileList(path) {
  const cached = cacheGet('http', path );
  if (cached) {
    return cached;
  }
  const config = await fetchConfig();
  const res = await fetch(config.api_url + "/files/" + path);
  const fileList = await res.json();
  const allFiles = fileList.data.allFiles;

  // update http cache
  cacheStash('http', path, allFiles);

  // update file object cache
  allFiles.forEach(f => cacheStash('files', f.path, f));

  // establish references to each file's parent dir
  allFiles.forEach(f => {
    f.parentRef = cacheGet("files", f.parent);
  });

  console.log({allFiles});

  return allFiles;
}

const app = new Vue({
  el: "#app",
  data: {
    allFiles: {},
    appName: "Eyebrowse",
    currentPath: "",
    currentDir: {},
    breadcrumbs: [],
  },
  methods: {
    openFile: function (event) {
      console.log(`NOIMPL open file`);
    },
    browseDir: async function(path) {
      this.currentPath = path;
      const allFiles = await fetchFileList(this.currentPath);
      console.table(allFiles);
      this.allFiles = allFiles;

      // update the current dir reference
      this.currentDir = cacheGet('files', path);
      console.log({currentDir: this.currentDir});

      // update the array of breadcrumbs
      this.breadcrumbs = [];
      let next = this.currentDir;
      while(next.parentRef) {
        this.breadcrumbs.push(next);
        next = next.parentRef;
      }
      this.breadcrumbs.reverse();

      console.log('breadcrumbs', this.breadcrumbs);
    },
    // browseDir: async function (dir) {
    //   console.log({ currentPathSplit: this.currentPathSplit});
    // }
  },
  watch: {
    // currentPath: function (val) {
    //   console.log({currentPath: val});
    // },
  },
  created: async function() {
    this.browseDir("");
  },
});

window.app = app;
