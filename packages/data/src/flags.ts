/**
 * Build a flag image URL from an ISO 3166-1 alpha-2 code (or a flagcdn
 * subdivision code such as "gb-eng"). Uses the free flagcdn CDN, which serves
 * crisp scalable SVGs. Components should keep the team's flag emoji as a
 * fallback for when the image fails to load.
 */
export function flagUrl(iso2: string): string {
  return `https://flagcdn.com/${iso2.toLowerCase()}.svg`;
}
