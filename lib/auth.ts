import Cookies from 'js-cookie';

const AUTH_COOKIE_NAME = 'memory-book-auth';
const COOKIE_EXPIRY_DAYS = 30;

export const checkPassword = (password: string): boolean => {
  const correctPassword = process.env.NEXT_PUBLIC_SITE_PASSWORD || 'kwstasleftas';
  return password === correctPassword;
};

export const setAuthCookie = (): void => {
  Cookies.set(AUTH_COOKIE_NAME, 'authenticated', { expires: COOKIE_EXPIRY_DAYS });
};

export const getAuthCookie = (): string | undefined => {
  return Cookies.get(AUTH_COOKIE_NAME);
};

export const removeAuthCookie = (): void => {
  Cookies.remove(AUTH_COOKIE_NAME);
};

export const isAuthenticated = (): boolean => {
  return getAuthCookie() === 'authenticated';
};
