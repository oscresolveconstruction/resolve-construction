"use server";
import {getSessionUserId} from '@/app/lib/auth';
import {getPayrollPool} from '@/app/lib/payroll-db';
import {moveExpense} from '@/app/lib/expense-allocation.mjs';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
export async function moveExpenseAction(id:number,expectedUpdatedAt:string,_state:{error:string},form:FormData){
 const actor=await getSessionUserId();
 if(!actor)return {error:'Please sign in.'};
 const projectId=Number(form.get('destinationProjectId'));
 try{await moveExpense(getPayrollPool(),actor,{id,projectId,expectedUpdatedAt,requestId:String(form.get('requestId'))});}
 catch(error){return {error:error instanceof Error?error.message:'Unable to move expense.'};}
 revalidatePath('/','layout');
 redirect(`/projects/${projectId}/expenses`);
}
