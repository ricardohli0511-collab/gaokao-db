/**
 * 插入香港本科国际考试录取数据
 * 数据来源：各港校官方招生页面（2025-2026学年）
 *
 * 使用方法：npx tsx scripts/data/insert-hk-international-seed.ts
 */

import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import 'dotenv/config';

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface IntlRecord {
  institutionCode: string;
  programmeName: string;
  // IB
  ibMin: number;
  // A-Level
  alevelRequirement: string;
  alevelScore: number; // converted: A*=56, A=48, B=40...
  // SAT/AP
  satMin: number | null;
  apRequirement: string | null;
}

const HKU_RECORDS: IntlRecord[] = [
  // 建筑学院
  { institutionCode: 'HKU', programmeName: '建筑学文学士', ibMin: 34, alevelRequirement: '3A', alevelScore: 144, satMin: 1380, apRequirement: '3门AP Grade 3' },
  { institutionCode: 'HKU', programmeName: '测量学理学士', ibMin: 32, alevelRequirement: '3A', alevelScore: 144, satMin: 1380, apRequirement: '3门AP Grade 3' },
  { institutionCode: 'HKU', programmeName: '园境学文学士', ibMin: 32, alevelRequirement: '3A', alevelScore: 144, satMin: 1380, apRequirement: '3门AP Grade 3' },
  { institutionCode: 'HKU', programmeName: '城市研究文学士', ibMin: 32, alevelRequirement: '3A', alevelScore: 144, satMin: 1380, apRequirement: '3门AP Grade 3' },
  // 文学院
  { institutionCode: 'HKU', programmeName: '文学士', ibMin: 32, alevelRequirement: '3A', alevelScore: 144, satMin: 1380, apRequirement: '3门AP Grade 3' },
  { institutionCode: 'HKU', programmeName: '人文与数字科技', ibMin: 32, alevelRequirement: '3A', alevelScore: 144, satMin: 1380, apRequirement: '3门AP Grade 3' },
  { institutionCode: 'HKU', programmeName: '全球创意产业', ibMin: 32, alevelRequirement: '3A', alevelScore: 144, satMin: 1380, apRequirement: '3门AP Grade 3' },
  // 商学院
  { institutionCode: 'HKU', programmeName: '工商管理学学士', ibMin: 36, alevelRequirement: '3A', alevelScore: 144, satMin: 1470, apRequirement: '4门AP Grade 5' },
  { institutionCode: 'HKU', programmeName: '经济/经济金融学学士', ibMin: 36, alevelRequirement: '3A', alevelScore: 144, satMin: 1470, apRequirement: '4门AP Grade 5' },
  { institutionCode: 'HKU', programmeName: '会计及金融/会计数据分析', ibMin: 36, alevelRequirement: '3A', alevelScore: 144, satMin: 1470, apRequirement: '4门AP Grade 5' },
  { institutionCode: 'HKU', programmeName: '商业分析', ibMin: 36, alevelRequirement: '3A', alevelScore: 144, satMin: 1470, apRequirement: '4门AP Grade 5' },
  { institutionCode: 'HKU', programmeName: 'BBA(法律)及法学士', ibMin: 41, alevelRequirement: '3A*', alevelScore: 168, satMin: 1520, apRequirement: '4门AP Grade 5' },
  { institutionCode: 'HKU', programmeName: '量化金融', ibMin: 40, alevelRequirement: '3A*+1A', alevelScore: 216, satMin: 1520, apRequirement: '4门AP Grade 5' },
  { institutionCode: 'HKU', programmeName: '资产管理与私人银行', ibMin: 39, alevelRequirement: '3A*', alevelScore: 168, satMin: 1500, apRequirement: '4门AP Grade 5' },
  { institutionCode: 'HKU', programmeName: '国际商业与环球管理', ibMin: 41, alevelRequirement: '3A*+1A', alevelScore: 216, satMin: 1560, apRequirement: '4门AP Grade 5' },
  { institutionCode: 'HKU', programmeName: '市场营销分析与科技', ibMin: 36, alevelRequirement: '3A', alevelScore: 144, satMin: 1470, apRequirement: '4门AP Grade 5' },
  // 牙医学院
  { institutionCode: 'HKU', programmeName: '牙医学士', ibMin: 41, alevelRequirement: '2A*+1A', alevelScore: 160, satMin: 1510, apRequirement: '3门AP Grade 5' },
  // 工程学院
  { institutionCode: 'HKU', programmeName: '工程精英计划', ibMin: 40, alevelRequirement: '3A*+1A', alevelScore: 216, satMin: 1430, apRequirement: '3门AP Grade 4' },
  { institutionCode: 'HKU', programmeName: '数据与系统工程', ibMin: 34, alevelRequirement: '3A', alevelScore: 144, satMin: 1380, apRequirement: '3门AP Grade 4' },
  { institutionCode: 'HKU', programmeName: '人工智能工程(工程硕士)', ibMin: 39, alevelRequirement: '3A*', alevelScore: 168, satMin: 1400, apRequirement: '3门AP Grade 4' },
  { institutionCode: 'HKU', programmeName: '环球工程与商业', ibMin: 38, alevelRequirement: '3A*', alevelScore: 168, satMin: 1380, apRequirement: '3门AP Grade 4' },
  { institutionCode: 'HKU', programmeName: '计算机/电子/电机工程', ibMin: 34, alevelRequirement: '3A', alevelScore: 144, satMin: 1380, apRequirement: '3门AP Grade 4' },
  // 法学院
  { institutionCode: 'HKU', programmeName: '法学士', ibMin: 40, alevelRequirement: '3A*', alevelScore: 168, satMin: 1500, apRequirement: '3门AP Grade 5' },
  { institutionCode: 'HKU', programmeName: '文学士及法学士(双学位)', ibMin: 41, alevelRequirement: '3A*', alevelScore: 168, satMin: 1500, apRequirement: '3门AP Grade 5' },
  // 医学院
  { institutionCode: 'HKU', programmeName: '内外全科医学士', ibMin: 43, alevelRequirement: '4A*', alevelScore: 224, satMin: 1480, apRequirement: '6门AP Grade 5' },
  { institutionCode: 'HKU', programmeName: '护理学', ibMin: 32, alevelRequirement: '3A', alevelScore: 144, satMin: 1380, apRequirement: '3门AP Grade 3' },
  { institutionCode: 'HKU', programmeName: '中医学', ibMin: 34, alevelRequirement: '3A', alevelScore: 144, satMin: 1380, apRequirement: '3门AP Grade 3' },
  { institutionCode: 'HKU', programmeName: '药剂学', ibMin: 37, alevelRequirement: '3A*', alevelScore: 168, satMin: 1380, apRequirement: '3门AP Grade 3' },
  { institutionCode: 'HKU', programmeName: '生物医学', ibMin: 38, alevelRequirement: '2A*+1A', alevelScore: 160, satMin: 1400, apRequirement: '3门AP Grade 3' },
  // 理学院
  { institutionCode: 'HKU', programmeName: '理学士', ibMin: 33, alevelRequirement: '1A*+2A', alevelScore: 152, satMin: 1400, apRequirement: '3门AP Grade 5' },
  { institutionCode: 'HKU', programmeName: '科学大师班', ibMin: 40, alevelRequirement: '4A*', alevelScore: 224, satMin: 1450, apRequirement: '3门AP Grade 5' },
  // 计算与数据科学学院
  { institutionCode: 'HKU', programmeName: '应用人工智能', ibMin: 38, alevelRequirement: '2A*+1A', alevelScore: 160, satMin: 1400, apRequirement: '3门AP Grade 5' },
  { institutionCode: 'HKU', programmeName: '金融科技', ibMin: 38, alevelRequirement: '2A*+1A', alevelScore: 160, satMin: 1400, apRequirement: '3门AP Grade 5' },
  { institutionCode: 'HKU', programmeName: '精算学', ibMin: 39, alevelRequirement: '3A*', alevelScore: 168, satMin: 1450, apRequirement: '3门AP Grade 5' },
  { institutionCode: 'HKU', programmeName: '计算与数据科学', ibMin: 38, alevelRequirement: '2A*+1A', alevelScore: 160, satMin: 1400, apRequirement: '3门AP Grade 5' },
  // 社科学院
  { institutionCode: 'HKU', programmeName: '社会科学学士', ibMin: 32, alevelRequirement: '3A', alevelScore: 144, satMin: 1380, apRequirement: '3门AP Grade 4' },
  { institutionCode: 'HKU', programmeName: '心理学学士', ibMin: 35, alevelRequirement: '3A', alevelScore: 144, satMin: 1380, apRequirement: '3门AP Grade 4' },
  { institutionCode: 'HKU', programmeName: '新闻学/媒体/AI', ibMin: 32, alevelRequirement: '3A', alevelScore: 144, satMin: 1380, apRequirement: '3门AP Grade 3' },
];

const OTHER_HK_RECORDS: IntlRecord[] = [
  // CUHK
  { institutionCode: 'CUHK', programmeName: '医学', ibMin: 40, alevelRequirement: '3A*+', alevelScore: 168, satMin: 1450, apRequirement: '4门AP Grade 5' },
  { institutionCode: 'CUHK', programmeName: '工商管理学士', ibMin: 34, alevelRequirement: '3A', alevelScore: 144, satMin: 1350, apRequirement: '3门AP Grade 3' },
  { institutionCode: 'CUHK', programmeName: '理学', ibMin: 33, alevelRequirement: '2A+1B', alevelScore: 136, satMin: 1300, apRequirement: '2门AP Grade 3' },
  // HKUST
  { institutionCode: 'HKUST', programmeName: '理学士(量化金融)', ibMin: 38, alevelRequirement: '2A*+1A', alevelScore: 160, satMin: 1420, apRequirement: '3门AP Grade 4' },
  { institutionCode: 'HKUST', programmeName: '工程学', ibMin: 34, alevelRequirement: '3A', alevelScore: 144, satMin: 1350, apRequirement: '2门AP Grade 4' },
  { institutionCode: 'HKUST', programmeName: '工商管理学士', ibMin: 36, alevelRequirement: '3A', alevelScore: 144, satMin: 1400, apRequirement: '3门AP Grade 4' },
  { institutionCode: 'HKUST', programmeName: '计算机科学', ibMin: 36, alevelRequirement: '2A*+1A', alevelScore: 160, satMin: 1380, apRequirement: '3门AP Grade 4' },
  // PolyU
  { institutionCode: 'PolyU', programmeName: '物理治疗学', ibMin: 35, alevelRequirement: '3A', alevelScore: 144, satMin: 1350, apRequirement: '2门AP Grade 3' },
  { institutionCode: 'PolyU', programmeName: '酒店及旅游管理', ibMin: 30, alevelRequirement: '3B', alevelScore: 120, satMin: 1190, apRequirement: '2门AP Grade 3' },
  { institutionCode: 'PolyU', programmeName: '设计学', ibMin: 30, alevelRequirement: '3B', alevelScore: 120, satMin: 1190, apRequirement: '2门AP Grade 3' },
  { institutionCode: 'PolyU', programmeName: '工程学', ibMin: 32, alevelRequirement: '3B+ (至少1A)', alevelScore: 128, satMin: 1250, apRequirement: '2门AP Grade 3' },
  // CityU
  { institutionCode: 'CityU', programmeName: '数据科学', ibMin: 33, alevelRequirement: '3A', alevelScore: 144, satMin: 1300, apRequirement: '2门AP Grade 3' },
  { institutionCode: 'CityU', programmeName: '工商管理学士', ibMin: 32, alevelRequirement: '2A+1B', alevelScore: 136, satMin: 1250, apRequirement: '2门AP Grade 3' },
  { institutionCode: 'CityU', programmeName: '法律学', ibMin: 35, alevelRequirement: '3A', alevelScore: 144, satMin: 1350, apRequirement: '3门AP Grade 4' },
  // HKBU
  { institutionCode: 'HKBU', programmeName: '传理学学士', ibMin: 30, alevelRequirement: '2B+1C', alevelScore: 112, satMin: 1190, apRequirement: '2门AP Grade 3' },
  { institutionCode: 'HKBU', programmeName: '视觉艺术', ibMin: 28, alevelRequirement: '3C', alevelScore: 96, satMin: 1150, apRequirement: '2门AP Grade 3' },
  // Lingnan
  { institutionCode: 'Lingnan', programmeName: '社会科学学士', ibMin: 28, alevelRequirement: '2C+1D', alevelScore: 88, satMin: 1100, apRequirement: '2门AP Grade 3' },
  { institutionCode: 'Lingnan', programmeName: '工商管理学士', ibMin: 28, alevelRequirement: '2C+1D', alevelScore: 88, satMin: 1100, apRequirement: '2门AP Grade 3' },
  // EdUHK
  { institutionCode: 'EdUHK', programmeName: '教育学士', ibMin: 26, alevelRequirement: '3D', alevelScore: 72, satMin: 1050, apRequirement: '2门AP Grade 3' },
];

// CUHK/CityU 高考统招提前批分数线 (广东)
interface GaokaoRecord {
  institutionCode: string;
  programmeName: string;
  year: number;
  subjectGroup: string;
  minScore: number;
  province: string;
}

const GAOKAO_PREAPPROVAL: GaokaoRecord[] = [
  // CUHK 广东统招提前批
  { institutionCode: 'CUHK', programmeName: '本科入学奖学金类', year: 2024, subjectGroup: '物理类', minScore: 680, province: '广东' },
  { institutionCode: 'CUHK', programmeName: '理科类', year: 2024, subjectGroup: '物理类', minScore: 665, province: '广东' },
  { institutionCode: 'CUHK', programmeName: '工科类', year: 2024, subjectGroup: '物理类', minScore: 655, province: '广东' },
  { institutionCode: 'CUHK', programmeName: '商科类', year: 2024, subjectGroup: '物理类', minScore: 655, province: '广东' },
  { institutionCode: 'CUHK', programmeName: '本科入学奖学金类', year: 2024, subjectGroup: '历史类', minScore: 648, province: '广东' },
  { institutionCode: 'CUHK', programmeName: '人文类', year: 2024, subjectGroup: '历史类', minScore: 632, province: '广东' },
  { institutionCode: 'CUHK', programmeName: '商科类', year: 2024, subjectGroup: '历史类', minScore: 632, province: '广东' },
  // CityU 广东统招提前批
  { institutionCode: 'CityU', programmeName: '工学院', year: 2024, subjectGroup: '物理类', minScore: 635, province: '广东' },
  { institutionCode: 'CityU', programmeName: '商学院', year: 2024, subjectGroup: '物理类', minScore: 630, province: '广东' },
  { institutionCode: 'CityU', programmeName: '数据科学学院', year: 2024, subjectGroup: '物理类', minScore: 640, province: '广东' },
  { institutionCode: 'CityU', programmeName: '人文社会科学院', year: 2024, subjectGroup: '历史类', minScore: 608, province: '广东' },
  { institutionCode: 'CityU', programmeName: '商学院', year: 2024, subjectGroup: '历史类', minScore: 608, province: '广东' },
  // CUHK 浙江统招
  { institutionCode: 'CUHK', programmeName: '本科入学奖学金类', year: 2024, subjectGroup: '综合', minScore: 685, province: '浙江' },
  { institutionCode: 'CUHK', programmeName: '理科/工科类', year: 2024, subjectGroup: '综合', minScore: 675, province: '浙江' },
  // CUHK 江苏统招
  { institutionCode: 'CUHK', programmeName: '本科入学奖学金类', year: 2024, subjectGroup: '物理类', minScore: 675, province: '江苏' },
  { institutionCode: 'CUHK', programmeName: '理科类', year: 2024, subjectGroup: '物理类', minScore: 660, province: '江苏' },
  // CityU 浙江
  { institutionCode: 'CityU', programmeName: '工学院/数据科学', year: 2024, subjectGroup: '综合', minScore: 660, province: '浙江' },
  // CityU 江苏
  { institutionCode: 'CityU', programmeName: '工学院/商学院', year: 2024, subjectGroup: '物理类', minScore: 630, province: '江苏' },
  // 历史数据 2023
  { institutionCode: 'CUHK', programmeName: '本科入学奖学金类', year: 2023, subjectGroup: '物理类', minScore: 675, province: '广东' },
  { institutionCode: 'CUHK', programmeName: '理科类', year: 2023, subjectGroup: '物理类', minScore: 658, province: '广东' },
];

async function main() {
  console.log('开始插入香港本科国际考试录取数据...\n');

  // 获取院校代码映射
  const institutions = await prisma.institution.findMany({
    where: { region: 'hongkong' },
    select: { id: true, code: true, name: true },
  });
  const codeToId = new Map(institutions.map(i => [i.code, i.id]));
  console.log(`找到 ${institutions.length} 所香港院校`);

  let insertedIb = 0;
  let insertedAlevel = 0;
  let insertedSat = 0;
  let insertedGaokao = 0;
  let skipped = 0;

  const ALL_INTL = [...HKU_RECORDS, ...OTHER_HK_RECORDS];

  for (const rec of ALL_INTL) {
    const institutionId = codeToId.get(rec.institutionCode);
    if (!institutionId) {
      console.warn(`⚠ 未找到院校: ${rec.institutionCode}，跳过`);
      skipped++;
      continue;
    }

    // IB 记录
    const ibKey = `${rec.institutionCode}-${rec.programmeName.replace(/\s+/g, '-')}-2025-ib`;
    const existingIb = await prisma.admissionRecord.findFirst({ where: { recordIdentityKey: ibKey } });
    if (!existingIb) {
      await prisma.admissionRecord.create({
        data: {
          recordIdentityKey: ibKey,
          examCategory: 'ib',
          year: 2025,
          province: '香港',
          subjectGroup: '',
          batch: 'Non-JUPAS',
          institutionId,
          admissionType: 'IB',
          degreeLevel: 'undergraduate',
          programmeName: rec.programmeName,
          minScore: rec.ibMin,
          granularity: 'major',
        },
      });
      insertedIb++;
    } else { skipped++; }

    // A-Level 记录
    const alKey = `${rec.institutionCode}-${rec.programmeName.replace(/\s+/g, '-')}-2025-alevel`;
    const existingAl = await prisma.admissionRecord.findFirst({ where: { recordIdentityKey: alKey } });
    if (!existingAl) {
      await prisma.admissionRecord.create({
        data: {
          recordIdentityKey: alKey,
          examCategory: 'alevel',
          year: 2025,
          province: '香港',
          subjectGroup: rec.alevelRequirement,
          batch: 'Non-JUPAS',
          institutionId,
          admissionType: 'A-Level',
          degreeLevel: 'undergraduate',
          programmeName: rec.programmeName,
          minScore: rec.alevelScore,
          granularity: 'major',
        },
      });
      insertedAlevel++;
    } else { skipped++; }

    // SAT 记录
    if (rec.satMin) {
      const satKey = `${rec.institutionCode}-${rec.programmeName.replace(/\s+/g, '-')}-2025-sat`;
      const existingSat = await prisma.admissionRecord.findFirst({ where: { recordIdentityKey: satKey } });
      if (!existingSat) {
        await prisma.admissionRecord.create({
          data: {
            recordIdentityKey: satKey,
            examCategory: 'sat',
            year: 2025,
            province: '香港',
            subjectGroup: rec.apRequirement || '',
            batch: 'Non-JUPAS',
            institutionId,
            admissionType: 'SAT',
            degreeLevel: 'undergraduate',
            programmeName: rec.programmeName,
            minScore: rec.satMin,
            granularity: 'major',
          },
        });
        insertedSat++;
      } else { skipped++; }
    }
  }

  // 高考统招提前批数据
  for (const rec of GAOKAO_PREAPPROVAL) {
    const institutionId = codeToId.get(rec.institutionCode);
    if (!institutionId) { skipped++; continue; }

    const key = `${rec.institutionCode}-${rec.programmeName.replace(/\s+/g, '-')}-${rec.year}-${rec.province}-${rec.subjectGroup}`;
    const existing = await prisma.admissionRecord.findFirst({ where: { recordIdentityKey: key } });
    if (!existing) {
      await prisma.admissionRecord.create({
        data: {
          recordIdentityKey: key,
          examCategory: 'gaokao',
          year: rec.year,
          province: rec.province,
          subjectGroup: rec.subjectGroup,
          batch: '提前批',
          institutionId,
          admissionType: '统招',
          degreeLevel: 'undergraduate',
          programmeName: rec.programmeName,
          minScore: rec.minScore,
          granularity: 'major',
        },
      });
      insertedGaokao++;
    } else { skipped++; }
  }

  console.log(`\n✅ 完成！`);
  console.log(`  IB 新增: ${insertedIb} 条`);
  console.log(`  A-Level 新增: ${insertedAlevel} 条`);
  console.log(`  SAT 新增: ${insertedSat} 条`);
  console.log(`  高考提前批 新增: ${insertedGaokao} 条`);
  console.log(`  跳过: ${skipped} 条`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
