import type { GlobalConfig } from 'payload';

export const HomeConfig: GlobalConfig = {
  slug: 'home-config',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'mainBanners',
      type: 'array',
      maxRows: 3,
      admin: {
        description: 'Main carousel banners (max 3)',
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'subtitle',
          type: 'text',
        },
        {
          name: 'link',
          type: 'relationship',
          relationTo: 'tools',
        },
      ],
    },
    {
      name: 'sideBanners',
      type: 'array',
      minRows: 2,
      maxRows: 2,
      admin: {
        description: 'Side banners (exactly 2)',
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'link',
          type: 'relationship',
          relationTo: 'tools',
        },
      ],
    },
  ],
};
