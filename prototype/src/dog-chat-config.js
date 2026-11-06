import {communityConfig} from './community-config.js';

// Public connection settings only. Enable after the server budget and credentials
// have been configured and verified; no provider key belongs in this module.
export const dogChatConfig=Object.freeze({
 enabled:false,
 serverURL:`${communityConfig.url}/functions/v1/dog-chat`,
 authURL:communityConfig.url,
 key:communityConfig.key,
});
