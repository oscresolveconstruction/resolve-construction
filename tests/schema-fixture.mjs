import {readFile} from 'node:fs/promises';
// Empty supporting tables used by existing app routes and prefetches. Test only.
export async function createSupportingTables(pool){
 const schema=await readFile(new URL('../src/prisma/contract.prisma',import.meta.url),'utf8');
 for(const match of schema.matchAll(/model (\w+) \{([\s\S]*?)\n\}/g)){
  const [,name,body]=match;
  if(['AppUser','Customer','Project','Invoice','Payment','ExtraWork'].includes(name))continue;
  const columns=[];
  for(const line of body.split('\n')){
   const field=line.trim().match(/^(\w+)\s+(Int|String|Boolean|Decimal|TimestamptzString|temporal.updatedAtString\(\))(\?)?(?:\s|$)/);
   if(!field)continue;
   const [,key,type,nullable]=field;
   const sqlType={Int:'integer',String:'text',Boolean:'boolean',Decimal:'numeric',TimestamptzString:'timestamptz','temporal.updatedAtString()':'timestamptz'}[type];
   columns.push(`"${key}" ${key==='id'?'serial PRIMARY KEY':sqlType}${nullable||key==='id'?'':' NOT NULL'}${sqlType==='timestamptz'&&!nullable?' DEFAULT now()':''}`);
  }
  await pool.query(`CREATE TABLE "${name}" (${columns.join(',')})`);
 }
}
