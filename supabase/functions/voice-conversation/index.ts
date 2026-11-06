import {createConversationHandler} from './handler.mjs';
import {runtimeConfig,runtimeDependencies} from './runtime.mjs';
const config=runtimeConfig((name:string)=>Deno.env.get(name));
Deno.serve(createConversationHandler({config,...runtimeDependencies(config)}));
