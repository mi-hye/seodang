import {createDogChatHandler} from './handler.mjs';
import {runtimeConfig,runtimeDependencies} from './runtime.mjs';
import {dogChatLessons} from './lessons.mjs';

const config=runtimeConfig((name:string)=>Deno.env.get(name));
// Fail closed until credentials, verified pricing/balance and database budgets are set.
// No console logging: neither auth tokens nor learner sentences belong in logs.
Deno.serve(createDogChatHandler({config,lessons:dogChatLessons,...runtimeDependencies(config)}));
