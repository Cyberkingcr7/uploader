const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const routeName = process.env.ROUTE_NAME || 'name';
const siteDir = path.join(__dirname, 'site');

app.use(`/${routeName}`, express.static(siteDir));

app.get('/', (_req, res) => {
  res.redirect(`/${routeName}`);
});

app.get(`/${routeName}`, (_req, res) => {
  res.sendFile(path.join(siteDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Site available at /${routeName}`);
});
