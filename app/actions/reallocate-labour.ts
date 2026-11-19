"use server";
import {getSessionUserId} from '@/app/lib/auth';
import {getPayrollPool} from '@/app/lib/payroll-db';
import {reallocateLabour} from '@/app/lib/labour-allocation.mjs';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';

export async function reallocateLabourAction(_state: {error:string},form:FormData) {
 const actor=await getSessionUserId();
 if(!actor)return {error:'Please sign in.'};
 try {
  await reallocateLabour(getPayrollPool(),actor,{requestId:String(form.get('requestId')),projectId:Number(form.get('projectId')),entries:JSON.parse(String(form.get('entries')??'[]'))});
 }catch(error){return {error:error instanceof Error?error.message:'Unable to move hours.'};}
 for(const path of ['/labour','/projects','/','/company-finances','/monthly-payroll'])revalidatePath(path,'layout');
 redirect('/labour?reallocated=1');
}
