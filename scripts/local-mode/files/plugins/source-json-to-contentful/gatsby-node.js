/* eslint-disable */
const fs = require('fs');
const path = require('path');

exports.createSchemaCustomization = async ({ actions }) => {
  const { createTypes } = actions;

  createTypes(`
    type ContentfulLocale implements Node {
      code: String!
      name: String!
      default: Boolean!
    }

    type ContentfulFlipbook implements Node {
      slug: String!
      inactivityTimeout: Int!
      node_locale: String!
      # IMPORTANT: link, because slides are real nodes
      slides: [ContentfulSlideContentfulTitleSlideUnion] @link(from: "slides___NODE")
    }

    union ContentfulSlideContentfulTitleSlideUnion = ContentfulTitleSlide | ContentfulSlide

    # Both slide types are Nodes (not embedded objects)
    type ContentfulTitleSlide implements Node {
      id: ID!
      node_locale: String!
      title: String
    }

    type ContentfulSlide implements Node {
      id: ID!
      node_locale: String!
      title: String
      body: ContentfulRichText
      media: ContentfulMedia
    }

    type ContentfulRichText {
      raw: String!
    }

    type ContentfulMedia {
      credit: String
      altText: ContentfulAltText
      media: ContentfulAsset
    }

    type ContentfulAltText {
      altText: String
    }

    type ContentfulAsset {
      file: ContentfulFileDetails
      url: String
      localFile: File @link
    }

    type ContentfulFileDetails {
      contentType: String
      url: String
    }
  `);
};

exports.sourceNodes = async ({
  actions,
  createNodeId,
  createContentDigest,
  reporter,
}) => {
  const { createNode } = actions;

  // Load your JSON robustly relative to project root
  const jsonPath = path.resolve(process.cwd(), 'static', 'content.json');
  if (!fs.existsSync(jsonPath)) {
    reporter.panicOnBuild(`[local-contentful] Missing data file at ${jsonPath}`);
    return;
  }
  let jsonData;
  try {
    jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(jsonData);
  } catch (e) {
    reporter.panicOnBuild(`[local-contentful] Failed to parse JSON: ${e.message}`);
    return;
  }

  const locales = jsonData.locales || [];
  const flipbooks = jsonData.flipbooks || [];

  // Create locales
  locales.forEach((locale) => {
    const node = {
      code: locale.code,
      name: locale.name,
      default: !!locale.default,
      id: createNodeId(`locale-${locale.code}`),
      internal: {
        type: 'ContentfulLocale',
        contentDigest: createContentDigest(locale),
      },
    };
    createNode(node);
  });

  const defaultLocaleCode = (locales.find((l) => l.default) || locales[0] || {}).code;

  const getLocalized = (value, localeCode) => {
    if (value == null) return null;
    // If value is primitive or already stringified, return as-is
    if (typeof value !== 'object') return value;
    // Locale map object
    if (Object.prototype.hasOwnProperty.call(value, localeCode)) return value[localeCode];
    if (defaultLocaleCode && Object.prototype.hasOwnProperty.call(value, defaultLocaleCode)) {
      return value[defaultLocaleCode];
    }
    return null;
  };

  // For each flipbook, create a node per locale and link slide nodes
  flipbooks.forEach((fb, fbIndex) => {
    locales.forEach((locale) => {
      const nodeLocale = locale.code;

      // Build slide nodes for this locale
      const slideIds = [];
      const slides = fb.slides || [];

      slides.forEach((s, i) => {
        const isTitle = s.type === 'title';

        if (isTitle) {
          const id = createNodeId(`title-${fb.slug || `flipbook-${fbIndex + 1}`}-${nodeLocale}-${i}`);
          const titleNode = {
            id,
            node_locale: nodeLocale,
            title: getLocalized(s.title, nodeLocale),
            internal: {
              type: 'ContentfulTitleSlide',
              contentDigest: createContentDigest({
                fb, s, nodeLocale, i,
              }),
            },
          };
          createNode(titleNode);
          slideIds.push(id);
        } else {
          const id = createNodeId(`slide-${fb.slug || `flipbook-${fbIndex + 1}`}-${nodeLocale}-${i}`);

          // Media mapping
          const media = s.media || {};

          console.log('media');
          console.log(media);

          const slideNode = {
            id,
            node_locale: nodeLocale,
            title: getLocalized(s.title, nodeLocale),
            body: s.body
              ? { raw: String(getLocalized(s.body, nodeLocale) || '') }
              : null,
            media: Object.keys(media).length
              ? {
                credit: media.credit || 'media-default-credit',
                altText: 'default-alt-text',
                media: {
                  file: {
                    contentType: (media.type === 'video' ? 'video/mp4' : 'image/png'),
                    url: media.url || 'default-url',
                  },
                  url: media.url || null,
                  localFile: media.url,
                },
              }
              : null,
            internal: {
              type: 'ContentfulSlide',
              contentDigest: createContentDigest({
                fb, s, nodeLocale, i,
              }),
            },
          };

          createNode(slideNode);
          slideIds.push(id);
        }
      });

      const flipbookNode = {
        slug: fb.slug || `flipbook-${fbIndex + 1}`,
        inactivityTimeout: Number.isInteger(fb.inactivityTimeout) ? fb.inactivityTimeout : 120,
        node_locale: nodeLocale,
        slides___NODE: slideIds,
        id: createNodeId(`flipbook-${fb.slug || `flipbook-${fbIndex + 1}`}-${nodeLocale}`),
        internal: {
          type: 'ContentfulFlipbook',
          contentDigest: createContentDigest({
            fb, nodeLocale, slideIds,
          }),
        },
      };

      console.log('Created flipbook node:');
      console.log(flipbookNode);

      createNode(flipbookNode);
    });
  });

  reporter.info(
    `[local-contentful] Created ${locales.length} ContentfulLocale nodes, ${flipbooks.length * locales.length} ContentfulFlipbook nodes, and ${flipbooks.reduce((acc, fb) => acc + ((fb.slides && fb.slides.length) || 0), 0) * locales.length} slide nodes.`,
  );
};
