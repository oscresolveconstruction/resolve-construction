import { notFound } from 'next/navigation';
import { db } from '../../../../src/prisma/db';

export default async function ProjectLayout({children,params}:{children:React.ReactNode;params:Promise<{id:string}>}) {
 const id=Number((await params).id);
 if(!Number.isSafeInteger(id)||id<=0)notFound();
 const project=await db.orm.public.Project.first({id});
 if(!project||project.status==='Deleted')notFound();
 return children;
}
