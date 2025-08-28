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

  // Load JSON data from static/content.json
  const jsonPath = path.join(process.cwd(), 'static', 'content.json');
  let jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

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
  flipbooks.forEach((flipbook, flipbookIndex) => {
    locales.forEach((locale) => {
      const nodeLocale = locale.code;

      // Build slide nodes for this locale
      const slideIds = [];
      const slides = flipbook.slides || [];

      slides.forEach((slide, i) => {
        const isTitle = slide.type === 'title';

        if (isTitle) {
          const id = createNodeId(`title-${flipbook.slug || `flipbook-${flipbookIndex + 1}`}-${nodeLocale}-${i}`);
          const titleNode = {
            id,
            node_locale: nodeLocale,
            title: getLocalized(slide.title, nodeLocale),
            internal: {
              type: 'ContentfulTitleSlide',
              contentDigest: createContentDigest({
                flipbook, slide, nodeLocale, i,
              }),
            },
          };
          createNode(titleNode);
          slideIds.push(id);
        } else {
            const id = createNodeId(`slide-${flipbook.slug || `flipbook-${flipbookIndex + 1}`}-${nodeLocale}-${i}`);

            // Media mapping
            const media = slide.media || {};

            const slideNode = {
              id,
              node_locale: nodeLocale,
              title: getLocalized(slide.title, nodeLocale),
              body: slide.body
                ? { raw: String(getLocalized(slide.body, nodeLocale) || '') }
                : null,
              media: {
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
              },
              internal: {
                type: 'ContentfulSlide',
                contentDigest: createContentDigest({
                flipbook, slide, nodeLocale, i,
                }),
              },
            };

          createNode(slideNode);
          slideIds.push(id);
        }
      });

      const flipbookNode = {
        slug: flipbook.slug || `flipbook-${flipbookIndex + 1}`,
        inactivityTimeout: Number.isInteger(flipbook.inactivityTimeout) ? flipbook.inactivityTimeout : 120,
        node_locale: nodeLocale,
        slides___NODE: slideIds,
        id: createNodeId(`flipbook-${flipbook.slug || `flipbook-${flipbookIndex + 1}`}-${nodeLocale}`),
        internal: {
          type: 'ContentfulFlipbook',
          contentDigest: createContentDigest({
            flipbook, nodeLocale, slideIds,
          }),
        },
      };

      createNode(flipbookNode);
    });
  });

  reporter.info(
    `[source-json-to-contentful] Created ${locales.length} ContentfulLocale nodes, ${flipbooks.length * locales.length} ContentfulFlipbook nodes, and ${flipbooks.reduce((acc, flipbook) => acc + ((flipbook.slides && flipbook.slides.length) || 0), 0) * locales.length} slide nodes.`,
  );
};
