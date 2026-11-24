import fs from 'node:fs';
if(fs.existsSync('.env.local'))process.loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
for(const path of ['/auth/v1/settings','/rest/v1/households?select=id&limit=1']){
 try{const response=await fetch(url+path,{headers:{apikey:key},signal:AbortSignal.timeout(10000)});const data=await response.json();console.log(JSON.stringify({endpoint:path.split('?')[0],status:response.status,code:data.code??null,anonymousRows:Array.isArray(data)?data.length:undefined,signupDisabled:path.includes('settings')?data.disable_signup:undefined}));}catch{console.log(JSON.stringify({endpoint:path.split('?')[0],error:'connection-unavailable'}));}
}
