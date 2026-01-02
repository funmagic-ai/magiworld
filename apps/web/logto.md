Installation
Install Logto SDK
npm
pnpm
yarn

pnpm add @logto/next
2
Prepare configs
Prepare configuration for the Logto client:

app/logto.ts

export const logtoConfig = {
  endpoint: 'https://287uy2.logto.app/',
  appId: '2xltgoq2kef1ooe06tigf',
  appSecret: 'vwyW8M4e3BupmghVerupTDHRswnmrlaD',
  baseUrl: 'http://localhost:3000', // Change to your own base URL
  cookieSecret: 'uJ63HIPKujP6BrsSj7nbtxVLH5t3vNt8', // Auto-generated 32 digit secret
  cookieSecure: process.env.NODE_ENV === 'production',
};
export const logtoConfig = {
  endpoint: 'https://287uy2.logto.app/',
  appId: '2xltgoq2kef1ooe06tigf',
  appSecret: 'vwyW8M4e3BupmghVerupTDHRswnmrlaD',
  baseUrl: 'http://localhost:3000', // Change to your own base URL
  cookieSecret: 'uJ63HIPKujP6BrsSj7nbtxVLH5t3vNt8', // Auto-generated 32 digit secret
  cookieSecure: process.env.NODE_ENV === 'production',
};

After adding , you can access endpoints at https://{{custom_domain}}/.
3
Configure redirect URIs
2 URIs
Before we dive into the details, here's a quick overview of the end-user experience. The sign-in process can be simplified as follows:

1. Invoke sign-in
2. Finish sign-in
Your app
Logto
Your app invokes the sign-in method.
The user is redirected to the Logto sign-in page. For native apps, the system browser is opened.
The user signs in and is redirected back to your app (configured as the redirect URI).
This authentication process follows the  protocol, and Logto enforces strict security measures to protect user sign-in.
If you have multiple apps, you can use the same identity provider (Logto). Once the user signs in to one app, Logto will automatically complete the sign-in process when the user accesses another app.
To learn more about the rationale and benefits of redirect-based sign-in, see .

In the following steps, we assume your app is running on http://localhost:3000/.

Now, let's configure your redirect URI. E.g. http://localhost:3000/callback.

Redirect URI
Required
http://localhost:3000/callback
Just like signing in, users should be redirected to Logto for signing out of the shared session. Once finished, it would be great to redirect the user back to your website. For example, add http://localhost:3000/ as the post sign-out redirect URI below.

Post sign-out redirect URI
http://localhost:3000/
4
Handle the callback
Add a callback route to your app:

app/callback/route.ts

import { handleSignIn } from '@logto/next/server-actions';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { logtoConfig } from '../logto';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  await handleSignIn(logtoConfig, searchParams);

  redirect('/');
}
import { handleSignIn } from '@logto/next/server-actions';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { logtoConfig } from '../logto';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  await handleSignIn(logtoConfig, searchParams);

  redirect('/');
}
5
Implement sign-in and sign-out
Implement sign-in and sign-out button
In Next.js App Router, events are handled in client components, so we need to create two components first: SignIn and SignOut.

app/sign-in.tsx

'use client';

type Props = {
  onSignIn: () => Promise<void>;
};

const SignIn = ({ onSignIn }: Props) => {
  return (
    <button
      onClick={() => {
        onSignIn();
      }}
    >
      Sign In
    </button>
  );
};

export default SignIn;
'use client';

type Props = {
  onSignIn: () => Promise<void>;
};

const SignIn = ({ onSignIn }: Props) => {
  return (
    <button
      onClick={() => {
        onSignIn();
      }}
    >
      Sign In
    </button>
  );
};

export default SignIn;
app/sign-out.tsx

'use client';

type Props = {
  onSignOut: () => Promise<void>;
};

const SignOut = ({ onSignOut }: Props) => {
  return (
    <button
      onClick={() => {
        onSignOut();
      }}
    >
      Sign Out
    </button>
  );
};

export default SignOut;
'use client';

type Props = {
  onSignOut: () => Promise<void>;
};

const SignOut = ({ onSignOut }: Props) => {
  return (
    <button
      onClick={() => {
        onSignOut();
      }}
    >
      Sign Out
    </button>
  );
};

export default SignOut;
Remember to add 'use client' to the top of the file to indicate that these components are client components.

Add buttons to home page
Now let's add the sign-in and sign-out buttons in your hoem page. We need to call the server actions in SDK when needed. To help with this, use getLogtoContext to fetch authentication status.

app/page.tsx

import { getLogtoContext, signIn, signOut } from '@logto/next/server-actions';
import SignIn from './sign-in';
import SignOut from './sign-out';
import { logtoConfig } from './logto';

const Home = () => {
  const { isAuthenticated, claims } = await getLogtoContext(logtoConfig);

  return (
    <nav>
      {isAuthenticated ? (
        <p>
          Hello, {claims?.sub},
          <SignOut
            onSignOut={async () => {
              'use server';

              await signOut(logtoConfig);
            }}
          />
        </p>
      ) : (
        <p>
          <SignIn
            onSignIn={async () => {
              'use server';

              await signIn(logtoConfig);
            }}
          />
        </p>
      )}
    </nav>
  );
};

export default Home;
import { getLogtoContext, signIn, signOut } from '@logto/next/server-actions';
import SignIn from './sign-in';
import SignOut from './sign-out';
import { logtoConfig } from './logto';

const Home = () => {
  const { isAuthenticated, claims } = await getLogtoContext(logtoConfig);

  return (
    <nav>
      {isAuthenticated ? (
        <p>
          Hello, {claims?.sub},
          <SignOut
            onSignOut={async () => {
              'use server';

              await signOut(logtoConfig);
            }}
          />
        </p>
      ) : (
        <p>
          <SignIn
            onSignIn={async () => {
              'use server';

              await signIn(logtoConfig);
            }}
          />
        </p>
      )}
    </nav>
  );
};

export default Home;
6
Checkpoint: Test your application
Now, you can test your application:

Run your application, you will see the sign-in button.
Click the sign-in button, the SDK will init the sign-in process and redirect you to the Logto sign-in page.
After you signed in, you will be redirected back to your application and see the sign-out button.
Click the sign-out button to sign out.