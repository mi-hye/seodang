import {developmentMode} from './build-config.js';
import {communityConfig} from './community-config.js';
// Auth, daily allowance and credit budget are enforced by the server.
export const voiceConversationConfig={enabled:developmentMode,url:communityConfig.url+'/functions/v1/voice-conversation',authURL:communityConfig.url,key:communityConfig.key};
