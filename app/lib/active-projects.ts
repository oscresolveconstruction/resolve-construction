import 'server-only';
import { db } from '../../src/prisma/db';

export async function activeProjects() {
 return (await db.orm.public.Project.all()).filter(project=>project.status!=='Deleted');
}
