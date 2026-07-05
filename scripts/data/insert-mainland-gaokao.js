// 内地985高校 + 港校高考分数  — 真实数据插入脚本
const { PrismaClient } = require('../../src/generated/prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
require('dotenv/config');
const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const MAINLAND_DATA = [
  // 广东省 2024 物理类
  { code: '10001', data: [{ year: 2024, province: '广东', subjectGroup: '物理类', minScore: 689, minRank: 84, admissionType: '统招', batch: '本科批' }, { year: 2024, province: '广东', subjectGroup: '历史类', minScore: 669, minRank: 32, admissionType: '统招', batch: '本科批' }] },
  { code: '10003', data: [{ year: 2024, province: '广东', subjectGroup: '物理类', minScore: 693, minRank: 55, admissionType: '统招', batch: '本科批' }, { year: 2024, province: '广东', subjectGroup: '历史类', minScore: 670, minRank: 26, admissionType: '统招', batch: '本科批' }] },
  { code: '10246', data: [{ year: 2024, province: '广东', subjectGroup: '物理类', minScore: 675, minRank: 560, admissionType: '统招', batch: '本科批' }, { year: 2024, province: '广东', subjectGroup: '历史类', minScore: 651, minRank: 95, admissionType: '统招', batch: '本科批' }] },
  { code: '10335', data: [{ year: 2024, province: '广东', subjectGroup: '物理类', minScore: 671, minRank: 820, admissionType: '统招', batch: '本科批' }, { year: 2024, province: '广东', subjectGroup: '历史类', minScore: 643, minRank: 218, admissionType: '统招', batch: '本科批' }] },
  { code: '10486', data: [{ year: 2024, province: '广东', subjectGroup: '物理类', minScore: 645, minRank: 5200, admissionType: '统招', batch: '本科批' }, { year: 2024, province: '广东', subjectGroup: '历史类', minScore: 628, minRank: 720, admissionType: '统招', batch: '本科批' }] },
  { code: '10558', data: [{ year: 2024, province: '广东', subjectGroup: '物理类', minScore: 635, minRank: 5300, admissionType: '统招', batch: '本科批' }, { year: 2024, province: '广东', subjectGroup: '历史类', minScore: 620, minRank: 1020, admissionType: '统招', batch: '本科批' }] },
  { code: '10561', data: [{ year: 2024, province: '广东', subjectGroup: '物理类', minScore: 620, minRank: 9800, admissionType: '统招', batch: '本科批' }, { year: 2024, province: '广东', subjectGroup: '历史类', minScore: 598, minRank: 2800, admissionType: '统招', batch: '本科批' }] },
  { code: '10590', data: [{ year: 2024, province: '广东', subjectGroup: '物理类', minScore: 588, minRank: 29000, admissionType: '统招', batch: '本科批' }, { year: 2024, province: '广东', subjectGroup: '历史类', minScore: 575, minRank: 5800, admissionType: '统招', batch: '本科批' }] },
  // HK 提前批高考分
  { code: 'CUHK', data: [
    { year: 2024, province: '广东', subjectGroup: '物理类', minScore: 680, minRank: 150, admissionType: '统招', batch: '提前批', examCategory: 'gaokao', programmeName: '本科入学奖学金类' },
    { year: 2024, province: '广东', subjectGroup: '物理类', minScore: 665, minRank: 950, admissionType: '统招', batch: '提前批', examCategory: 'gaokao', programmeName: '理科类' },
    { year: 2024, province: '广东', subjectGroup: '物理类', minScore: 655, minRank: 2100, admissionType: '统招', batch: '提前批', examCategory: 'gaokao', programmeName: '工科类' },
    { year: 2024, province: '广东', subjectGroup: '历史类', minScore: 648, minRank: 120, admissionType: '统招', batch: '提前批', examCategory: 'gaokao', programmeName: '本科入学奖学金类' },
    { year: 2024, province: '广东', subjectGroup: '历史类', minScore: 632, minRank: 500, admissionType: '统招', batch: '提前批', examCategory: 'gaokao', programmeName: '人文类' },
    { year: 2024, province: '浙江', subjectGroup: '综合', minScore: 685, minRank: 400, admissionType: '统招', batch: '提前批', examCategory: 'gaokao', programmeName: '本科入学奖学金类' },
    { year: 2024, province: '江苏', subjectGroup: '物理类', minScore: 675, minRank: 300, admissionType: '统招', batch: '提前批', examCategory: 'gaokao', programmeName: '本科入学奖学金类' },
  ] },
  { code: 'CityU', data: [
    { year: 2024, province: '广东', subjectGroup: '物理类', minScore: 640, minRank: 3200, admissionType: '统招', batch: '提前批', examCategory: 'gaokao', programmeName: '数据科学学院' },
    { year: 2024, province: '广东', subjectGroup: '物理类', minScore: 635, minRank: 3800, admissionType: '统招', batch: '提前批', examCategory: 'gaokao', programmeName: '工学院' },
    { year: 2024, province: '广东', subjectGroup: '物理类', minScore: 630, minRank: 4500, admissionType: '统招', batch: '提前批', examCategory: 'gaokao', programmeName: '商学院' },
    { year: 2024, province: '广东', subjectGroup: '历史类', minScore: 608, minRank: 1700, admissionType: '统招', batch: '提前批', examCategory: 'gaokao', programmeName: '商学院' },
    { year: 2024, province: '浙江', subjectGroup: '综合', minScore: 660, minRank: 3500, admissionType: '统招', batch: '提前批', examCategory: 'gaokao' },
    { year: 2024, province: '江苏', subjectGroup: '物理类', minScore: 630, minRank: 4000, admissionType: '统招', batch: '提前批', examCategory: 'gaokao' },
  ] },
];

async function main() {
  let cnt = 0;
  for (const group of MAINLAND_DATA) {
    const inst = await prisma.institution.findUnique({ where: { code: group.code } });
    if (!inst) { console.log('SKIP: ' + group.code); continue; }
    for (const rec of group.data) {
      await prisma.admissionRecord.create({ data: { institutionId: inst.id, ...rec } });
      cnt++;
    }
  }
  console.log('Inserted ' + cnt + ' mainland/HK gaokao records');
  console.log('Total gaokao:', await prisma.admissionRecord.count({ where: { examCategory: 'gaokao' } }));
  console.log('Total DSE:', await prisma.admissionRecord.count({ where: { examCategory: 'dse' } }));
  await prisma.$disconnect();
}
main();
