exports.createSchemaCustomization = async ({ actions }) => {
  const { createTypes } = actions;

  // Contentful-like schema that matches your queries & fragments
  createTypes(`
    type ContentfulLocale implements Node @dontInfer {
      code: String!
      name: String!
      default: Boolean!
    }

    type ContentfulFlipbook implements Node @dontInfer {
      slug: String!
      inactivityTimeout: Int!
      node_locale: String!
      slides: [ContentfulSlideContentfulTitleSlideUnion!]!
    }

    union ContentfulSlideContentfulTitleSlideUnion = ContentfulTitleSlide | ContentfulSlide

    type ContentfulTitleSlide @dontInfer {
      id: ID!
      node_locale: String!
      title: String
    }

    # Matches the fields your fragment/query reads
    type ContentfulSlide @dontInfer {
      id: ID!
      node_locale: String!
      title: String
      body: ContentfulRichText
      media: ContentfulMedia
    }

    type ContentfulRichText @dontInfer {
      raw: String!
    }

    type ContentfulMedia @dontInfer {
      credit: String
      altText: ContentfulAltText
      media: ContentfulAsset
    }

    type ContentfulAltText @dontInfer {
      altText: String
    }

    type ContentfulAsset @dontInfer {
      file: ContentfulFileDetails
      url: String
      # IMPORTANT: store File node id in "localFile___NODE" during sourcing
      localFile: File @link
    }

    type ContentfulFileDetails @dontInfer {
      contentType: String
      url: String
    }
  `);
};

exports.sourceNodes = async ({ actions, createNodeId, createContentDigest }) => {
  // eslint-disable-next-line global-require, import/no-unresolved
  const jsonData = require('../../static/content.json');

  // Transform Locales from JSON into Contentful structure
  jsonData.locales.forEach((locale) => {
    const transformedData = {
      code: locale.code,
      name: locale.name,
      default: locale.default,
    };

    const node = {
      ...transformedData,
      // Required fields
      id: createNodeId(transformedData.code),
      internal: {
        type: 'ContentfulLocale',
        contentDigest: createContentDigest(transformedData),
      },
    };

    actions.createNode(node);
  });

  // Get default locale code
  const defaultLocale = jsonData.locales.find((locale) => locale.default).code;

  function getLocalized(fieldValue, localeCode) {
    // Return the value as-is if it's not a locale object
    if (typeof fieldValue !== 'object') {
      return fieldValue;
    }
    // If it's an object with locale keys, return the value for requested locale
    if (fieldValue[localeCode]) {
      return fieldValue[localeCode];
    }
    // If the requested locale doesn't exist, fall back to default locale value
    if (fieldValue[defaultLocale]) {
      return fieldValue[defaultLocale];
    }
    console.warn(`Unable to localize field value ${localeCode} - ${fieldValue}`);
    return null;
  }

  // Transform Flipbooks from JSON into Contentful structure
  jsonData.flipbooks.forEach((flipbook, index) => {
    // Create one node per locale (to match Contentful's locale structure)
    // These locale nodes are merged in front-end queries
    jsonData.locales.forEach((locale) => {
      const transformedData = {
        slug: flipbook.slug || `flipbook-${index + 1}`, // If no slug is provided, use a default
        node_locale: locale.code,
        inactivityTimeout: flipbook.inactivityTimeout,
        slides: flipbook.slides.map((slide, slideIndex) => ({
          __typename:
            slide.type === 'title'
              ? 'ContentfulTitleSlide'
              : 'ContentfulSlide', // "title" -> "ContentfulTitleSlide", else "ContentfulSlide"
          id: slide.id || `slide-${slideIndex}`, // If no ID is provided, use a default
          title: getLocalized(slide.title, locale.code),
          body: {
            raw: getLocalized(slide.body, locale.code),
          },
          media: {
            credit: slide.media.credit || '',
            altText: slide.media.altText || '',
            media: {
              file: {
                contentType: slide.media.type === 'video' ? 'video/mp4' : 'image/png',
              },
              localFile: {
                publicURL: slide.media.url,
                childImageSharp: {
                  gatsbyImageData: {
                    width: flipbook.mediaWidth || 950,
                    height: flipbook.mediaHeight || 1080,
                    // layout: 'FIXED',
                    // placeholder: 'BLURRED',
                  },
                },
              },
            },
          },
        })),
      };

      const node = {
        ...transformedData,
        // Required fields
        id: createNodeId(`${transformedData.slug}-${locale.code}`),
        internal: {
          type: 'ContentfulFlipbook',
          contentDigest: createContentDigest(transformedData),
        },
      };

      actions.createNode(node);
    });
  });
};
