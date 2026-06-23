export function getBasePath() {
  const { pathname } = window.location;
  return pathname.startsWith('/-/') ? '/-/' : '/';
}
