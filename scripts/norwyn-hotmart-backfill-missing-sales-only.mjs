import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
function loadEnvFile(path){try{for(const line of readFileSync(path,"utf8").split(/\r?\n/)){const t=line.trim();if(!t||t.startsWith("#"))continue;const m=t.match(/^([^=]+)=(.*)$/);if(!m)continue;const k=m[1].trim();const v=m[2].trim().replace(/^["']|["']$/g,"");if(!process.env[k])process.env[k]=v;}}catch{}}
function chunks(items,size=300){const out=[];for(let i=0;i<items.length;i+=size)out.push(items.slice(i,i+size));return out;}
async function fetchAll(factory,pageSize=1000){const rows=[];for(let from=0;;from+=pageSize){const {data,error}=await factory().range(from,from+pageSize-1);if(error)throw new Error(error.message);rows.push(...(data??[]));if(!data||data.length<pageSize)break;}return rows;}
const statusMap=new Map(Object.entries({APPROVED:"APPROVED",APROVADO:"APPROVED",COMPLETE:"COMPLETED",COMPLETO:"COMPLETED",COMPLETED:"COMPLETED",OVERDUE:"OVERDUE",ATRASADO:"OVERDUE",CANCELADO:"CANCELLED",CANCELADA:"CANCELLED",CANCELED:"CANCELLED",CANCELLED:"CANCELLED",EXPIRED:"EXPIRED",EXPIRADO:"EXPIRED",EXPIRADA:"EXPIRED",REFUNDED:"REFUNDED",REEMBOLSADO:"REFUNDED",REEMBOLSADA:"REFUNDED",PARTIALLY_REFUNDED:"REFUNDED",CHARGEBACK:"CHARGEBACK",STARTED:"STARTED",WAITING_PAYMENT:"PENDING_PAYMENT",PRINTED_BILLET:"PENDING_PAYMENT",PROCESSING_TRANSACTION:"PENDING_PAYMENT",UNDER_ANALISYS:"PENDING_PAYMENT",UNDER_ANALYSIS:"PENDING_PAYMENT",NO_FUNDS:"CANCELLED",BLOCKED:"CANCELLED",PROTESTED:"CANCELLED"}));
function token(v){return String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase().replace(/[\s-]+/g,"_");}
function canonical(v){return statusMap.get(token(v))??"UNKNOWN";}
function groupFor(v){const c=canonical(v);if(["APPROVED","COMPLETED"].includes(c))return"confirmed";if(["OVERDUE","STARTED","PENDING_PAYMENT"].includes(c))return"pending";if(["CANCELLED","EXPIRED"].includes(c))return"lost";if(c==="REFUNDED")return"refunded";if(c==="CHARGEBACK")return"chargeback";return"unknown";}
loadEnvFile(resolve(process.cwd(),".env.local"));
const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
const {data:upload,error:uploadError}=await supabase.from("norwyn_validation_uploads").select("id").eq("validation_type","HOTMART").order("uploaded_at",{ascending:false}).limit(1).single();
if(uploadError)throw new Error(uploadError.message);
const comparisons=await fetchAll(()=>supabase.from("norwyn_hotmart_validation_comparisons").select("tenant_id,validation_row_id,normalized_transaction_id").eq("upload_id",upload.id).eq("match_status","ONLY_HOTMART").eq("sale_comparable",true));
const rowIds=comparisons.map(r=>r.validation_row_id).filter(Boolean);
const rows=[];
for(const group of chunks(rowIds,80)){const {data,error}=await supabase.from("norwyn_hotmart_validation_rows").select("*").in("id",group);if(error)throw new Error(error.message);rows.push(...(data??[]));}
const byRow=new Map(comparisons.map(r=>[r.validation_row_id,r]));
const missing=rows.map(r=>({...r,normalized_transaction_id:byRow.get(r.id)?.normalized_transaction_id})).filter(r=>r.normalized_transaction_id);
let insertedRaw=0, insertedSales=0, insertedHistory=0;
for(const group of chunks(missing,300)){
  const transactions=group.map(r=>r.normalized_transaction_id);
  const {data:existing,error:existingError}=await supabase.from("comercial_vendas").select("tenant_id,transaction_id").in("transaction_id",transactions);
  if(existingError)throw new Error(existingError.message);
  const existingSet=new Set((existing??[]).map(r=>`${r.tenant_id}:${r.transaction_id}`));
  const toInsert=group.filter(r=>!existingSet.has(`${r.tenant_id}:${r.normalized_transaction_id}`));
  if(!toInsert.length)continue;
  const productPayload=[...new Map(toInsert.filter(r=>r.hotmart_product_id).map(r=>[`${r.tenant_id}:${r.hotmart_product_id}`,{tenant_id:r.tenant_id,plataforma:"hotmart",hotmart_product_id:r.hotmart_product_id,nome:r.hotmart_product_name??r.hotmart_product_id??"Produto Hotmart sem nome",ativo:true,metadata:{source:"HOTMART_OFFICIAL_EXPORT",validation_upload_id:upload.id}}])).values()];
  if(productPayload.length){const {error}=await supabase.from("comercial_produtos").upsert(productPayload,{onConflict:"tenant_id,hotmart_product_id"});if(error)throw new Error(error.message);}
  const {data:productRows,error:productError}=await supabase.from("comercial_produtos").select("id,tenant_id,hotmart_product_id").in("hotmart_product_id",[...new Set(toInsert.map(r=>r.hotmart_product_id).filter(Boolean))]);
  if(productError)throw new Error(productError.message);
  const productMap=new Map((productRows??[]).map(r=>[`${r.tenant_id}:${r.hotmart_product_id}`,r.id]));
  const rawPayload=toInsert.map(r=>({tenant_id:r.tenant_id,source:"HOTMART_OFFICIAL_EXPORT",event_id:`official-export-${upload.id}-${r.normalized_transaction_id}`,transaction_id:r.normalized_transaction_id,payload:{...(r.raw_payload??{}),validation_upload_id:upload.id,validation_row_id:r.id,source_file:r.source_file,source_row:r.source_row},status:"processado",processed_at:new Date().toISOString()}));
  const {data:rawRows,error:rawError}=await supabase.from("comercial_hotmart_raw").insert(rawPayload).select("id,tenant_id,transaction_id");
  if(rawError)throw new Error(rawError.message);
  insertedRaw+=rawRows?.length??0;
  const rawMap=new Map((rawRows??[]).map(r=>[`${r.tenant_id}:${r.transaction_id}`,r.id]));
  const salesPayload=toInsert.map(r=>{const normalizedStatus=canonical(r.raw_status);const group=groupFor(r.raw_status);const isBundleChild=/^HP\d+C\d+$/.test(r.normalized_transaction_id);const currency=r.currency??"BRL";const reason=isBundleChild?"bundle_item_requires_review":group!=="confirmed"?"not_confirmed_status":currency!=="BRL"?"non_brl_currency":"brl_confirmed_sale";return{tenant_id:r.tenant_id,transaction_id:r.normalized_transaction_id,aluno_id:null,produto_id:productMap.get(`${r.tenant_id}:${r.hotmart_product_id}`)??null,hotmart_product_id:r.hotmart_product_id,produto_nome:r.hotmart_product_name,comprador_nome:r.buyer_name,comprador_email:r.buyer_email?.toLowerCase()??null,status:r.raw_status??normalizedStatus,status_original:r.raw_status,status_normalizado:normalizedStatus,grupo_comercial:group,forma_pagamento:r.payment_method,parcelas:1,moeda:currency,valor_bruto:r.normalized_value??0,valor_liquido:null,taxas:null,coproducao:null,data_compra:r.purchase_date,data_aprovacao:["APPROVED","COMPLETED"].includes(normalizedStatus)?(r.approved_date??r.purchase_date):r.approved_date,data_reembolso:r.refund_date,data_chargeback:null,expected_payment_date:null,source_sck:null,origem:"hotmart_official_export",raw_id:rawMap.get(`${r.tenant_id}:${r.normalized_transaction_id}`),last_event_at:r.approved_date??r.purchase_date??r.created_at,imported_at:new Date().toISOString(),data_lacunas:reason==="brl_confirmed_sale"?[]:[reason],metadata:{source:"HOTMART_OFFICIAL_EXPORT",validation_upload_id:upload.id,validation_row_id:r.id,source_file:r.source_file,source_row:r.source_row,lineage:"central_validacao_backfill_0083",raw_value:r.raw_value,offer_id:r.offer_id,offer_name:r.offer_name},commercial_transaction:true,sale_confirmed:group==="confirmed",revenue_eligible:group==="confirmed"&&currency==="BRL"&&!isBundleChild,student_eligible:group==="confirmed"&&!isBundleChild,sale_comparable:true,event_class:"SALE_TRANSACTION",eligibility_reason:reason,import_run_id:"central_validacao_backfill_0083"};});
  const {data:salesRows,error:salesError}=await supabase.from("comercial_vendas").insert(salesPayload).select("id,tenant_id,transaction_id,raw_id,status_original,status_normalizado,grupo_comercial,event_class,commercial_transaction,sale_confirmed,revenue_eligible,student_eligible,data_aprovacao,data_compra,last_event_at,origem,import_run_id,metadata");
  if(salesError)throw new Error(salesError.message);
  insertedSales+=salesRows?.length??0;
  const historyPayload=(salesRows??[]).map(r=>({tenant_id:r.tenant_id,transaction_id:r.transaction_id,sale_id:r.id,raw_id:r.raw_id,status_original:r.status_original,status_normalizado:r.status_normalizado??"UNKNOWN",grupo_comercial:r.grupo_comercial??"unknown",event_class:r.event_class??"SALE_TRANSACTION",commercial_transaction:r.commercial_transaction,sale_confirmed:r.sale_confirmed,revenue_eligible:r.revenue_eligible,student_eligible:r.student_eligible,occurred_at:r.data_aprovacao??r.data_compra??r.last_event_at,source:r.origem??"hotmart",import_run_id:r.import_run_id??"central_validacao_backfill_0083",metadata:{...(r.metadata??{}),lineage:"status_history_missing_sales_only"}}));
  if(historyPayload.length){const {error}=await supabase.from("norwyn_hotmart_transaction_status_history").insert(historyPayload);if(error)throw new Error(error.message);insertedHistory+=historyPayload.length;}
}
console.log(JSON.stringify({upload_id:upload.id,missing_considered:missing.length,inserted_raw:insertedRaw,inserted_sales:insertedSales,inserted_history:insertedHistory},null,2));
