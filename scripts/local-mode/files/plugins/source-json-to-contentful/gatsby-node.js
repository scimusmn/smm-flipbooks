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
        inactivityDelay: flipbook.inactivityTimeout,
        slides: flipbook.selections.map((slide, slideIndex) => ({
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
                    layout: 'FIXED',
                    placeholder: 'BLURRED',
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
          type: 'ContentfulVideoSelector',
          contentDigest: createContentDigest(transformedData),
        },
      };

      actions.createNode(node);
    });
  });
};
