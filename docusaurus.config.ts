import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'CCRP',
  tagline: 'The Coalesced Chunk Retrieval Protocol',
  favicon: 'img/favicon.png',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://ccrp.dev',
  baseUrl: '/',

  organizationName: 'ccrp-dev',
  projectName: 'ccrp',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
    [
      'redocusaurus',
      {
        specs: [
          {
            spec: './spec/openapi.yaml',
            route: '/api/',
          },
        ],
        theme: {
          primaryColor: '#FFFFDD',
        },
      },
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    image: 'img/ccrp-social-card.jpg',
    navbar: {
      title: 'CCRP: Coalesced Chunk Retrieval Protocol',
      logo: {
        alt: 'CCRP Logo',
        src: 'img/ccrp.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        { to: '/api', label: 'API Spec', position: 'left' },
        {
          href: 'https://github.com/ccrp-dev/ccrp',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Documentation',
              to: '/docs/ccrp-intro',
            },
          ],
        },
        {
          title: 'API',
          items: [
            {
              label: 'API Spec',
              to: '/api',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/ccrp-dev/ccrp',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Coalesced Chunk Retrieval Protocol. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
