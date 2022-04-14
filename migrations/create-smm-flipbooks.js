module.exports = function (migration) {
  /* Title slide */

  const titleslide = migration.createContentType('titleSlide', {
    displayField: 'title',
    name: 'Title slide',
    description:
      'Introduces Flipbook theme and provides instructions, typically used as first slide.',
  });

  titleslide.createField('title', {
    name: 'Title',
    type: 'Symbol',
    localized: true,
    required: false,
    validations: [],
    disabled: false,
    omitted: false,
  });

  titleslide.changeFieldControl('title', 'builtin', 'singleLine');

  /* Slide */

  const slide = migration.createContentType('slide', {
    displayField: 'title',
    name: 'Slide',
    description: 'Pairs text with a single piece of visual media.',
  });

  slide.createField('title', {
    name: 'Title',
    type: 'Symbol',
    localized: true,
    required: false,
    validations: [],
    disabled: false,
    omitted: false,
  });

  slide.createField('body', {
    name: 'Body',
    type: 'RichText',
    localized: true,
    required: false,
    validations: [
      {
        enabledMarks: ['bold', 'italic', 'underline', 'code'],
        message: 'Only bold, italic, underline, and code marks are allowed',
      },
      {
        enabledNodeTypes: [
          'ordered-list',
          'unordered-list',
          'hr',
          'blockquote',
        ],
        message:
          'Only ordered list, unordered list, horizontal rule, and quote nodes are allowed',
      },
      {
        nodes: {},
      },
    ],
    disabled: false,
    omitted: false,
  });

  slide.createField('media', {
    name: 'Media',
    type: 'Link',
    localized: false,
    required: false,
    validations: [
      {
        linkContentType: ['accreditedMedia'],
      },
    ],
    disabled: false,
    omitted: false,
    linkType: 'Entry',
  });

  slide.changeFieldControl('title', 'builtin', 'singleLine');

  slide.changeFieldControl('body', 'builtin', 'richTextEditor');

  slide.changeFieldControl('media', 'builtin', 'entryCardEditor');

  /* Accredited media */

  const accreditedmedia = migration.createContentType('accreditedMedia', {
    displayField: 'credit',
    name: 'Accredited media',
    description: 'A media asset paired with a credit.',
  });

  accreditedmedia.createField('media', {
    name: 'Media',
    type: 'Link',
    localized: false,
    required: true,
    validations: [
      {
        linkMimetypeGroup: ['image', 'audio', 'video'],
      },
    ],
    disabled: false,
    omitted: false,
    linkType: 'Asset',
  });

  accreditedmedia.createField('credit', {
    name: 'Credit',
    type: 'Symbol',
    localized: true,
    required: false,
    validations: [],
    disabled: false,
    omitted: false,
  });

  accreditedmedia.createField('altText', {
    name: 'Alt text',
    type: 'Text',
    localized: true,
    required: false,
    validations: [],
    disabled: false,
    omitted: false,
  });

  accreditedmedia.changeFieldControl('media', 'builtin', 'assetLinkEditor');

  accreditedmedia.changeFieldControl('credit', 'builtin', 'singleLine', {
    helpText: 'Provide credit to media source when appropriate',
  });

  accreditedmedia.changeFieldControl('altText', 'builtin', 'multipleLine', {
    helpText:
      '(Accessibility) This hidden description is accessed when a visually impaired reader encounters the media with screen reader.',
  });

  /* Flipbook */

  const flipbook = migration.createContentType('flipbook', {
    displayField: 'slug',
    name: 'Flipbook',
    description:
      'Touchscreen slideshow presenting a linear sequence of slides around a theme.',
  });

  flipbook.createField('slug', {
    name: 'Slug',
    type: 'Symbol',
    localized: false,
    required: false,
    validations: [],
    disabled: false,
    omitted: false,
  });

  flipbook.createField('title', {
    name: 'Title',
    type: 'Symbol',
    localized: false,
    required: false,
    validations: [],
    disabled: false,
    omitted: false,
  });

  flipbook.createField('slides', {
    name: 'Slides',
    type: 'Array',
    localized: false,
    required: false,
    validations: [],
    disabled: false,
    omitted: false,
    items: {
      type: 'Link',
      validations: [
        {
          linkContentType: ['slide', 'titleSlide'],
        },
      ],
      linkType: 'Entry',
    },
  });

  flipbook.createField('inactivityTimeout', {
    name: 'Inactivity timeout',
    type: 'Integer',
    localized: false,
    required: false,
    validations: [
      {
        range: {
          min: 1,
          max: 99999,
        },
        message: 'Must be at least one second',
      },
    ],
    disabled: false,
    omitted: false,
  });

  flipbook.changeFieldControl('slug', 'builtin', 'slugEditor');

  flipbook.changeFieldControl('title', 'builtin', 'singleLine', {
    helpText:
      'Internal title of Flipbook. This is not displayed in the application.',
  });

  flipbook.changeFieldControl('slides', 'builtin', 'entryLinksEditor', {
    bulkEditing: false,
    showLinkEntityAction: true,
    showCreateEntityAction: true,
  });

  flipbook.changeFieldControl('inactivityTimeout', 'builtin', 'numberEditor', {
    helpText:
      'Duration (in seconds) of inactivity required to trigger app refresh, returning Flipbook to first slide.',
  });
};
