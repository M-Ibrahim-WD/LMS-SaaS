const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { email: true, fullName: true, role: true, createdAt: true }
  });
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: { name: true, inviteCode: true, createdAt: true }
  });
  const courses = await prisma.course.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { title: true, status: true, createdAt: true, instructor: { select: { email: true } } }
  });
  const counts = {
    users: await prisma.user.count(),
    tenants: await prisma.tenant.count(),
    courses: await prisma.course.count(),
    payments: await prisma.payment.count(),
    reviews: await prisma.courseReview.count(),
    certificates: await prisma.certificate.count(),
  };
  console.log(JSON.stringify({ counts, users, tenants, courses }, null, 2));
  await prisma.$disconnect();
})().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
