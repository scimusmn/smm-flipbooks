import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

function Video({ src, active }) {
  const vidRef = useRef(null);

  useEffect(() => {
    if (active) {
      vidRef.current.currentTime = 0;
      vidRef.current.play();
    } else {
      vidRef.current.pause();
    }
  }, [active]);

  return (
    <video
      loop
      preload="auto"
      ref={vidRef}
    >
      <source src={src} />
      <track kind="captions" srcLang="en" src={null} />
    </video>
  );
}

Video.propTypes = {
  src: PropTypes.string.isRequired,
  active: PropTypes.bool.isRequired,
};

export default Video;
