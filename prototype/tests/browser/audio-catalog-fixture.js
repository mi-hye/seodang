import {readFileSync} from 'node:fs';

const catalog=JSON.parse(readFileSync(new URL('../../assets/audio/catalog.json',import.meta.url),'utf8'));

// UI-only tests keep every real audio mapping, but skip downloading lesson packs.
// Reading locally avoids a route.fetch response outliving page reload or teardown.
export function useCatalogWithoutPacks(page){
 return page.route('**/assets/audio/catalog.json',route=>route.fulfill({json:{...catalog,packs:{}}}));
}
