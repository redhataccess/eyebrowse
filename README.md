Eyebrowse
=========

A prototype S3 bucket file browser.

Eyebrowse reads the contents of an S3 bucket, caches the file list locally in mongodb, and provides a simple UI for browsing and downloading the files.

## Prerequisites

Nodejs and Mongodb.  Currently, mongodb must be running on localhost with the default port, but it will be made configurable soon.

## Launching

Start the server.
```
npm install

# for production
npm start

# for development
npm run dev
```

Start the client server.

```
cd client
npm install
npm start
```

## Configuration

Eyebrowse is configured with the following environment variables.

 - `EYEBROWSE_S3_REGION` - The S3 region. Default: none.
 - `EYEBROWSE_S3_BUCKET_NAME` - The name of your bucket. Default none.
 - `EYEBROWSE_S3_ACCESS_KEY` - Your access key. Default none.
 - `EYEBROWSE_S3_SECRET_ACCESS_KEY` - Your secret access key. Default none.

 - `EYEBROWSE_MONGO_HOST` - The hostname of your mongodb instance. Default `"localhost"`
 - `EYEBROWSE_MONGO_PORT` - The port of your mongodb instance. Default `27017`
 - `EYEBROWSE_MONGO_DATABASE` - The database to use.  Default: `"eyebrowse"`

These environment variables can be set as normal, _or_ placed into a `.env` file at the root of the project.  The latter is a better option for local development than production.

## Symlinking

S3 doesn't have a concept of linking, so Eyebrowse simulates symlinks with the following scheme.  If you wish to have a symlink named `latest` that links to the latest version artifact directory `build/artifacts/v2.0.0`, 

Filename: _link__latest_
```
build/artifacts/v2.0.0
```

The `link__` name prefix indicates to Eyebrowse that this file is intended to be a symlink.  The file contains the path to the link target.

Here's more clarification about the link behavior.

 - Link filename must begin with `link__`
 - Link must be a text file
 - The first line of the text file must be the path to the desired link target
 - The link target may be a file or a directory
 - The path must be absolute (or if you prefer, relative to the root of the bucket)
 - The path must not begin with a slash
