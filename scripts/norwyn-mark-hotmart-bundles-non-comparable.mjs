import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
function loadEnvFile(path){try{for(const line of readFileSync(path,"utf8").split(/\r?\n/)){const t=line.trim();if(!t||t.startsWith("#"))continue;const m=t.match(/^([^=]+)=(.*)$/);if(!m)continue;const k=m[1].trim();const v=m[2].trim().replace(/^["']|["']$/g,"");if(!process.env[k])process.env[k]=v;}}catch{}}
async function fetchAll(factory,pageSize=1000){const rows=[];for(let from=0;;from+=pageSize){const {data,error}=await factory().range(from,from+pageSize-1);if(error)throw new Error(error.message);rows.push(...(data??[]));if(!data||data.length<pageSize)break;}return rows;}
loadEnvFile(resolve(process.cwd(),".env.local"));
const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
const {data:upload,error:uploadError}=await supabase.from("norwyn_validation_uploads").select("id").eq("validation_type","HOTMART").order("uploaded_at",{ascending:false}).limit(1).single();
if(uploadError)throw new Error(uploadError.message);
const rows=await fetchAll(()=>supabase.from("norwyn_hotmart_validation_rows").select("id,normalized_transaction_id,transaction_id,sale_comparable").eq("upload_id",upload.id).eq("sale_comparable",true));
const targets=rows.filter(r=>/^HP\d+C\d+$/.test(String(r.normalized_transaction_id??r.transaction_id??"")));
let updated=0;
for(const row of targets){const {error}=await supabase.from("norwyn_hotmart_validation_rows").update({sale_comparable:false}).eq("id",row.id);if(error)throw new Error(error.message);updated+=1;}
console.log(JSON.stringify({upload_id:upload.id,bundle_rows_marked_non_comparable:updated},null,2));
