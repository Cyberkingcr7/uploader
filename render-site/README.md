# Render JS Site

This is a small Node/Express app that serves a static website from:

`your-app.onrender.com/name`

## Files

- `server.js`: Express server
- `site/`: Put your website files here
- `render.yaml`: Optional Render config

## Local run

```bash
npm install
npm start
```

Then open:

`http://localhost:3000/name`

## Change the short path

By default the route is `name`.

You can change it by setting the `ROUTE_NAME` environment variable on Render, for example:

`ROUTE_NAME=myname`

That would make the site available at:

`your-app.onrender.com/myname`
