import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DocumentsView } from "@/components/documents/documents-view";

export default async function DocumentsPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const [resumes, jds] = await Promise.all([
    prisma.resume.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.jobDescription.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
  ]);

  return <DocumentsView initialResumes={resumes} initialJds={jds} />;
}
