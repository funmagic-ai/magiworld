import type { CollectionConfig } from 'payload';

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    {
      name: 'externalId',
      type: 'text',
      admin: {
        description: 'External auth provider ID (e.g., Logto)',
        readOnly: true,
      },
    },
  ],
};
