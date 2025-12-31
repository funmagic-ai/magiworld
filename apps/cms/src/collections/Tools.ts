import type { CollectionConfig } from 'payload';

export const Tools: CollectionConfig = {
  slug: 'tools',
  admin: {
    useAsTitle: 'title',
  },
  access: {
    read: () => true,
  },
  fields: [
    // Base fields
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly identifier',
      },
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
    },
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'media',
    },

    // Type dispatcher
    {
      name: 'toolType',
      type: 'select',
      required: true,
      options: [
        { label: 'Stylize', value: 'stylize' },
        { label: 'Edit', value: 'edit' },
        { label: '3D Generation', value: '3d_gen' },
        { label: 'Crystal Engrave', value: 'crystal_engrave' },
      ],
    },

    // Conditional fields based on toolType
    {
      name: 'promptTemplate',
      type: 'textarea',
      admin: {
        description: 'Default prompt template for stylize tools',
        condition: (data) => data.toolType === 'stylize',
      },
    },
    {
      name: 'configJson',
      type: 'json',
      admin: {
        description: 'Configuration for edit/3D/fabrication tools',
        condition: (data) =>
          ['edit', '3d_gen', 'crystal_engrave'].includes(data.toolType),
      },
    },

    // AI Backend configuration
    {
      name: 'aiEndpoint',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'AI API endpoint for this tool',
      },
    },

    // Metadata
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'isFeatured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
  ],
};
