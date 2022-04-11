import React from 'react';
import {
  graphql, useStaticQuery, Link,
} from 'gatsby';

function IndexPage() {
  const data = useStaticQuery(graphql`
    query {
      allSitePage(
        filter: {path: {nin: ["/", "/404.html", "/404.html", "/404/", "/dev-404-page/"]}},
        sort: {fields: path, order: ASC}) {
        edges {
          node {
            path
          }
        }
      }
    }
  `);

  const { allSitePage } = data;

  return (
    <div className="links-container">
      <h1>Flipbooks</h1>
      <ul>
        {allSitePage.edges.map((edge) => (
          <li key={edge.node.path}>
            <Link to={edge.node.path} key={edge.node.path}>
              {edge.node.path}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default IndexPage;
