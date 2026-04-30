import {getRequestConfig} from 'next-intl/server';
import {headers} from 'next/headers';

export default getRequestConfig(async () => {
  // You can read the locale from headers or cookies if not using path prefix
  // For now, we'll default to 'th'
  const locale = 'th';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
