/* eslint no-console: 0 */
import React from 'react';
import { graphql, Link } from 'gatsby';
import PropTypes from 'prop-types';
import { GatsbyImage, getImage } from 'gatsby-plugin-image';
import { renderRichText } from 'gatsby-source-contentful/rich-text';
import SwiperCore, { Pagination, Navigation } from 'swiper';
import { Swiper, SwiperSlide } from 'swiper/react';
import { useIdleTimer } from 'react-idle-timer';
import Video from '../../components/Video';

import 'swiper/swiper-bundle.min.css';
import 'swiper/swiper.min.css';

SwiperCore.use([Pagination, Navigation]);

export const slideTypes = graphql`
  fragment SlideTypes on ContentfulSlideContentfulTitleSlideUnion {
    ... on ContentfulTitleSlide {
      __typename
      node_locale
      id
      title
    }
    ... on ContentfulSlide {
      __typename
      node_locale
      id
      title
      body {
        raw
      }
      media {
        credit
        altText {
          altText
        }
        media {
          file {
            contentType
            url
          }
          localFile {
            publicURL
            childImageSharp {
              gatsbyImageData(
                width: 950
                height: 1080
                layout: FIXED
                placeholder: BLURRED
              )
            }
          }
        }
      }
    }
  }
`;

export const pageQuery = graphql`
  fragment FlipbookFragment on ContentfulFlipbook {
    slug
    inactivityTimeout
    node_locale
    slides {
      ...SlideTypes
    }
  } 
  query ($slug: String!, $locales: [String]) {
    allContentfulLocale {
      edges {
        node {
          code
          name
          default
        }
      }
    }
    allContentfulFlipbook(
      filter: {
        slug: { eq: $slug }
        node_locale: { in: $locales }
      }
    ) {
      edges {
        node {
          ...FlipbookFragment
        }
      }
    }
  }
`;

function Flipbook({ data, pageContext, location }) {
  console.log('Page data:', data);
  console.log('Page context:', pageContext);
  console.log('Page location:', location);

  const localeNodes = data.allContentfulFlipbook.edges.map((edge) => edge.node);

  // Array of multi-locale slides
  const slides = localeNodes[0].slides.map((slide, i) => localeNodes.map((node) => node.slides[i]));

  const localesInfo = data.allContentfulLocale.edges.map((edge) => edge.node);
  // Filter out current locale
  const buttonLocales = localesInfo.filter((locale) => !pageContext.locales.includes(locale.code));
  const intlNames = new Intl.DisplayNames('en', { type: 'language', languageDisplay: 'dialect' });

  // Inactivity timeout
  const { inactivityTimeout } = localeNodes[0];
  useIdleTimer({
    timeout: inactivityTimeout * 1000,
    debounce: 500,
    startOnMount: false,
    onIdle: () => window.location.reload(false),
  });

  const getAltText = (altObj) => {
    if (altObj) return altObj.altText;
    return 'Image';
  };

  const renderLocaleButtons = () => (
    <div className="locale-buttons">
      { buttonLocales && buttonLocales.map((localeInfo) => (
        <Link
          key={localeInfo.code}
          to={`/${localeInfo.code}/${pageContext.slug}`}
          className={`locale-button ${localeInfo.code}`}
        >
          {intlNames.of(localeInfo.code)}
        </Link>
      ))}
    </div>
  );

  const renderTitleSlide = (slide) => (
    <SwiperSlide key={slide[0].id} className="title-slide">
      <div className="separator" />
      {slide.map((locale) => (
        <h1 className={locale.node_locale} key={locale.node_locale}>{locale.title}</h1>
      ))}
    </SwiperSlide>
  );

  const renderSlides = slides.map((slide) => {
    // eslint-disable-next-line no-underscore-dangle
    if (slide[0].__typename === 'ContentfulTitleSlide') return renderTitleSlide(slide);

    return (
      <SwiperSlide key={slide[0].id}>
        {({ isActive }) => (
          <div>
            {/* Title and body for each locale */}
            {slide.map((locale) => (
              <div className={`${locale.node_locale} text-container`} key={locale.node_locale}>
                <h2>{(locale.title && locale.title) || null}</h2>
                <div className="separator" />
                <div className="body">
                  {(locale.body && renderRichText(locale.body)) || null}
                </div>
              </div>
            ))}
            {/* Media */}
            {(slide[0].media && slide[0].media.media) && (
              <div className="media">
                {
                (slide[0].media.media.file.contentType).includes('video')
                  ? <Video src={slide[0].media.media.localFile.publicURL} active={isActive} />
                  : (
                    <GatsbyImage
                      image={getImage(slide[0].media.media.localFile)}
                      alt={getAltText(slide[0].media.altText)}
                      loading="eager"
                    />
                  )
                }
                <span className="credit">{slide[0].media.credit}</span>
              </div>
            )}
          </div>
        )}
      </SwiperSlide>
    );
  });

  return (
    <>
      <Swiper
        spaceBetween={0}
        slidesPerView={1}
        centeredSlides
        navigation
        direction="vertical"
        pagination={{
          clickable: true,
        }}
        className={localeNodes[0].slug}
      >
        {renderSlides}
      </Swiper>
      {renderLocaleButtons()}
    </>
  );
}

Flipbook.propTypes = {
  data: PropTypes.objectOf(PropTypes.object).isRequired,
  pageContext: PropTypes.objectOf(PropTypes.any).isRequired,
  location: PropTypes.objectOf(PropTypes.any).isRequired,
};

export default Flipbook;
