// export function removeTrailingSlashes(link: string): string {
//   return removeStartSlash(removeEndSlash(link));
// }

export function removeEndSlash(link: string): string {
  return link.replace(/\/$/, '');
}

export function removeStartSlash(link: string): string {
  return link.replace(/^\//, '');
}

export function normalizeLink(link) {
  return link.replace(/\/$/, '');
}
export function addExtension(link) {
  if (link === '' || link === '/') {
    return '/';
  }
  if(link.endsWith('.html')) {
    return link;
  }
  return `${link}.html`;
}
