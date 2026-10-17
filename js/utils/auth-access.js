export const isOperator = claims => claims?.atlasOperator === true;
export function loginDestination(claims, search='') {
  if(new URLSearchParams(search).get('next')==='market')return '/?catalog=1';
  return isOperator(claims)?'/index.html':'/?catalog=1';
}
export function loginError(code) {
  const messages={
    'auth/popup-closed-by-user':'Sign-in was cancelled. Please try again.',
    'auth/popup-blocked':'Allow popups for this site, then try Google sign-in again.',
    'auth/account-exists-with-different-credential':'Sign in with your existing email and password first. Your account uses a different sign-in method.',
    'auth/operation-not-allowed':'Google sign-in is not available yet. Please contact support.',
    'auth/unauthorized-domain':'Sign-in is unavailable on this website address. Please contact support.',
    'auth/network-request-failed':'Could not connect. Check your connection and try again.',
  };
  return messages[code]||'Sign-in failed. Check your account details and try again.';
}
