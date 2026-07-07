import 'server-only'
import { desc, eq } from 'drizzle-orm'
import { db } from '../index'
import { projects, type ProjectType } from '../schema'

export async function getProjects() {
  return db.select().from(projects).orderBy(desc(projects.createdAt))
}

export async function getProject(id: string) {
  const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
  return row ?? null
}

export interface CreateProjectInput {
  name: string
  type: ProjectType
  clientName?: string | null
  createdByUserId?: string | null
}

export async function createProject(input: CreateProjectInput) {
  const [row] = await db
    .insert(projects)
    .values({
      name: input.name,
      type: input.type,
      clientName: input.clientName ?? null,
      createdByUserId: input.createdByUserId ?? null,
    })
    .returning()
  return row
}

export async function deleteProject(id: string) {
  await db.delete(projects).where(eq(projects.id, id))
}
