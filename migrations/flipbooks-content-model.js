/* eslint-disable no-console */
require('dotenv').config({
  path: './.env.development',
});

const contentful = require('contentful-management');

// Use the contentful management api token, not the content delivery api
const client = contentful.createClient({
  accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN,
});

const envName = process.env.CONTENTFUL_ENVIRONMENT;
const spaceId = process.env.CONTENTFUL_SPACE_ID;

console.log('Running migration for...', envName, spaceId);
console.log('...', contentful, client);

// Reference
// https://github.com/scimusmn/smm-video-selectors/blob/master/migrations/video-selector-model.js
