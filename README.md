# Render File Upload App

This app lets you upload a file or a folder and get a direct download link.

Example deployed link:

`https://your-app.onrender.com/files/abc123`

## What it does

- Opens a small upload page at `/`
- Accepts single-file uploads
- Accepts folder uploads from browsers that support folder picking
- Saves uploaded content in `uploads/`
- Returns a direct download link
- Packs folders into a single `.zip` file before upload for faster transfer

## Run locally

```bash
npm install
npm start
```

Then open:

`http://localhost:3000`

## Change the download path

By default, links use:

`/files/:id`

To change that on Render, set:

`BASE_PATH=myname`

Then your links would look like:

`https://your-app.onrender.com/myname/abc123`

## Important

This is a simple starter.

- Uploaded files are stored on the Render instance filesystem
- On many Render setups, uploaded files are not permanent across redeploys or restarts
- Folder uploads are converted in the browser into a single `.zip` archive, then uploaded as one file

If you want permanent file hosting, the next step is to store uploads in a real object store like S3, Cloudinary, or Uploadcare.
