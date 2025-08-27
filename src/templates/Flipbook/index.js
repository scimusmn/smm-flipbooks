/* eslint no-console: 0 */
import React, { useState, useEffect } from 'react';
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
  const localeNodes = data.allContentfulFlipbook.edges.map((edge) => edge.node);

  // Array of multi-locale slides
  const slides = localeNodes[0].slides.map((slide, i) => localeNodes.map((node) => node.slides[i]));
  const localesInfo = data.allContentfulLocale.edges.map((edge) => edge.node);

  // get default locale info
  const defaultLocale = localesInfo.filter((locale) => locale.default === true);

  // Filter out current locale
  const buttonLocales = localesInfo.filter((locale) => !pageContext.locales.includes(locale.code));
  const intlNames = new Intl.DisplayNames('en', { type: 'language', languageDisplay: 'dialect' });

  // To sync slide index between locales
  const [currentSlide, setCurrentSlide] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    let slideIndex = params.get('currentSlide');
    if (!slideIndex) slideIndex = 0;
    setCurrentSlide(parseInt(slideIndex, 10));
  }, []);

  // Inactivity timeout
  const { inactivityTimeout } = localeNodes[0];
  useIdleTimer({
    timeout: inactivityTimeout * 1000,
    debounce: 500,
    startOnMount: false,
    onIdle: () => window.location.replace(`${window.origin}/${defaultLocale[0].code}/${pageContext.slug}?currentSlide=0`),
  });

  const getAltText = (altObj) => {
    if (altObj) return altObj.altText;
    return 'Image';
  };

  const attemptRichText = (text) => {
    if (!text) return null;

    // If text is not valid JSON, return text.raw
    // If valid JSON, assume it can be converted through renderRichText
    let validJSON = false;
    try {
      JSON.parse(text.raw);
      validJSON = true;
    } catch (error) {
      validJSON = false;
    }

    if (validJSON) {
      return renderRichText(text);
    }

    return text.raw;
  };

  const setUrlParam = (key, value) => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set(key, value);
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      window.history.replaceState(null, null, newUrl);
    }
  };

  const onSlideChange = (swiper) => {
    const { realIndex } = swiper;
    setUrlParam('currentSlide', realIndex);
    setCurrentSlide(realIndex);
  };

  const renderLocaleButtons = () => (
    <div className="locale-buttons">
      { buttonLocales && buttonLocales.map((localeInfo) => (
        <Link
          key={localeInfo.code}
          to={`/${localeInfo.code}/${pageContext.slug}?currentSlide=${currentSlide}`}
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
                  {(locale.body && attemptRichText(locale.body)) || null}
                </div>
              </div>
            ))}
            {/* Media */}
            {(slide[0].media && slide[0].media.media) && (
            <div className="media">
              {
          (() => {
            const isVideo = (slide[0].media.media.file.contentType).includes('video');
            if (isVideo) {
              const videoSrc = slide[0].media.media.localFile
                ? slide[0].media.media.localFile.publicURL
                : slide[0].media.media.file.url;
              return (
                <Video
                  src={videoSrc}
                  active={isActive}
                />
              );
            } if (slide[0].media.media.localFile) {
              return (
                <GatsbyImage
                  image={getImage(slide[0].media.media.localFile)}
                  alt={getAltText(slide[0].media.altText)}
                  loading="eager"
                />
              );
            }
            return (
              <img
                src={slide[0].media.media.file.url}
                alt={getAltText(slide[0].media.altText)}
              />
            );
          })()
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
      {currentSlide !== null
      && (
      <Swiper
        initialSlide={currentSlide}
        spaceBetween={0}
        slidesPerView={1}
        centeredSlides
        navigation
        direction="vertical"
        pagination={{
          clickable: true,
        }}
        onSlideChange={onSlideChange}
        className={localeNodes[0].slug}
      >
        {renderSlides}
      </Swiper>
      )}
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
