Eyebrowse
=========

A prototype S3 bucket file browser.

Eyebrowse reads the contents of an S3 bucket, caches the file list locally in mongodb, and provides a simple UI for browsing and downloading the files.

## Prerequisites

Nodejs and Mongodb.

## Launching

Start the server.
```
npm install

# for production
npm start

# for development
npm run dev
```

Build and launch the client.

```
cd client
npm install
npm start
```

## Configuration

The Eyebrowse server is configured with environment variables and the client is configured with a `config.json` file.

### Configuring the server

Eyebrowse is configured with the following environment variables.

 - `EYEBROWSE_COOKIE_SECRET` - A long, random string used for generating user session cookies.  Allows sessions to persist between restarts of Eyebrowse.  Generate a value with `openssl rand -hex 32` and read more in [Keystone's docs](https://www.keystonejs.com/guides/production/#cookie-secret).

 - `EYEBROWSE_S3_REGION` - The S3 region. Default: none.
 - `EYEBROWSE_S3_BUCKET_NAME` - The name of your bucket. Default none.
 - `EYEBROWSE_S3_ACCESS_KEY` - Your access key. Default none.
 - `EYEBROWSE_S3_SECRET_ACCESS_KEY` - Your secret access key. Default none.

 - `EYEBROWSE_MONGO_HOST` - The hostname of your mongodb instance. Default `"localhost"`
 - `EYEBROWSE_MONGO_PORT` - The port of your mongodb instance. Default `27017`
 - `EYEBROWSE_MONGO_DATABASE` - The database to use.  Default: `"eyebrowse"`
 - `EYEBROWSE_MONGO_USER` - The mongodb user.  Default: none.
 - `EYEBROWSE_MONGO_PASSWORD` - The user's password to use.  Default: none.

 - `EYEBROWSE_DISPLAY_HIDDEN` - Whether or not to display files whose names begin with `.`, such as `.htaccess`.  Enable with `EYEBROWSE_DISPLAY_HIDDEN=true`.  Default: `false`.

These environment variables can be set as normal, _or_ placed into a `.env` file at the root of the project.  The latter is a better option for local development than production.

### Configuring the client

The client has a single configuration option, `api_url`, which is the URL to the Eyebrowse API.

Default *config.json*
```json
{
    "api_url": "http://localhost:3000"
}
```

If the API and client are being served under the same hostname, a host-relative `api_url` can be used, such as:

```json
    "api_url": "/"
```


To improve performance, you can avoid the round-trip fetch of config.json by embedding the configuration within index.html.

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
