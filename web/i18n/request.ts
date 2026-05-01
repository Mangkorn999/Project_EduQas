import {getRequestConfig} from 'next-intl/server';
import {cookies} from 'next/headers';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const requestedLocale = cookieStore.get('EILA_LOCALE')?.value;
  const locale = requestedLocale === 'en' ? 'en' : 'th';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
