#!/usr/bin/env python3
"""Configure a dedicated cron secret in Edge Functions and Vault. Never print it."""
import json,secrets,urllib.request
from pathlib import Path
root=Path(__file__).resolve().parents[2]
env={}
for line in (root/'.env').read_text().splitlines():
 if '=' in line and not line.lstrip().startswith('#'):
  key,value=line.split('=',1);env[key]=value.strip().strip('\"\'')
project=env['EXPO_PUBLIC_SUPABASE_URL'].split('//')[1].split('.')[0]
token=(Path.home()/'.supabase/access-token').read_text().strip()
def management(path,body):
 request=urllib.request.Request('https://api.supabase.com/v1/projects/'+project+path,method='POST',headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},data=json.dumps(body).encode())
 with urllib.request.urlopen(request,timeout=30) as response:return json.loads(response.read() or b'null')
rows=management('/database/query',{'query':"select decrypted_secret from vault.decrypted_secrets where name='community_photo_cleanup_credentials'"})
credentials=json.loads(rows[0]['decrypted_secret']) if rows else {'token':secrets.token_urlsafe(48),'anon':env['EXPO_PUBLIC_SUPABASE_ANON_KEY']}
management('/secrets',[{'name':'COMMUNITY_PHOTO_CLEANUP_SECRET','value':credentials['token']}])
if not rows:
 encoded=json.dumps(credentials).replace("'","''")
 management('/database/query',{'query':"select vault.create_secret('"+encoded+"','community_photo_cleanup_credentials','Dedicated server-only cleanup invocation token');"})
print('Dedicated photo cleanup credential configured; secret not displayed.')
