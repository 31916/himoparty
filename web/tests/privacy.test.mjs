import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));

test('tracked game files exclude local credentials and embedded secret literals',()=>{
  const files=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
  const forbidden=/(^|\/)(?:\.env(?:\..*)?|settings\.toml|secrets\.py|id_rsa|id_ed25519)$|\.(?:pem|key|p12|pfx)$/i;
  const literals=/\b\w*(?:PASSWORD|PASSWD|API_KEY|ACCESS_TOKEN|CLIENT_SECRET|SSID)\s*[:=]\s*(['"])([^'"\r\n]+)\1/i;
  const providerKeys=/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16}|AIza[\w-]{30,}|sk-(?:proj-|ant-)?[\w-]{20,})\b/;
  const privateKey=/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/;
  for(const file of files){
    assert.ok(!forbidden.test(file)||file.endsWith('.env.example'),`Local credentials must not be tracked: ${file}`);
    let data;try{data=readFileSync(new URL(file,new URL('../../',import.meta.url)));}catch(error){if(error.code==='ENOENT')continue;throw error;}
    if(data.subarray(0,8192).includes(0))continue;
    const source=data.toString('utf8');
    assert.ok(!literals.test(source)&&!providerKeys.test(source)&&!privateKey.test(source),`Possible credential in ${file}; value omitted`);
  }
});
