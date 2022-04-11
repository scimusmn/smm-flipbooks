const path = require('path');

exports.onCreateWebpackConfig = ({ actions }) => {
  actions.setWebpackConfig({
    resolve: {
      alias: {
        '@components': path.resolve(__dirname, './src/components'),
        '@styles': path.resolve(__dirname, './src/styles'),
      },
    },
  });
};

exports.createPages = async ({ actions, graphql }) => {
  const { createPage } = actions;

  // language=GraphQL <- Enables code formatting for Gatsby's unique GraphQL function
  const {
    // Query Contentful content types that render to a page
    // The slug field is the bare minimum required for page creation
    data: {
      allFlipbooks,
      allLocales,
    },
  } = await graphql(`
    {
      allFlipbooks: allContentfulFlipbook {
        edges {
          node {
            slug
            node_locale
          }
        }
      }
      allLocales: allContentfulLocale {
        edges {
          node {
            code
          }
        }
      }
    }
  `);

  // Pair content types with page templates
  const pageTypes = [
    {
      entries: allFlipbooks.edges,
      slugPrefix: '/',
      template: './src/templates/Flipbook/index.js',
    },
  ];

  const locales = allLocales.edges.map(({ node }) => node.code);

  pageTypes.forEach((pageType) => {
    pageType.entries.forEach(({ node }) => {
      // Ensure slug exists
      if (node.slug !== null) {
        // Create pages specific to each locale
        locales.forEach((locale) => {
          createPage({
            component: path.resolve(pageType.template),
            context: {
              slug: node.slug,
              locales: [locale],
            },
            path: `${pageType.slugPrefix + locale}/${node.slug}`,
          });
        });

        // Create a page that includes all locales
        createPage({
          component: path.resolve(pageType.template),
          context: {
            slug: node.slug,
            locales,
          },
          path: pageType.slugPrefix + node.slug,
        });
      }
    });
  });
};
