import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { hashSync } from 'bcryptjs';
import 'dotenv/config';

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const admin = await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: hashSync('admin123', 10),
    },
  });
  console.log('管理员创建成功:', admin.username);

  const mainlandInstitutions = await Promise.all([
    prisma.institution.upsert({ where: { name: '北京大学' }, create: { name: '北京大学', code: '10001', category: '985', type: '综合', province: '北京', city: '北京', region: 'mainland', website: 'https://www.pku.edu.cn' }, update: {} }),
    prisma.institution.upsert({ where: { name: '清华大学' }, create: { name: '清华大学', code: '10003', category: '985', type: '理工', province: '北京', city: '北京', region: 'mainland', website: 'https://www.tsinghua.edu.cn' }, update: {} }),
    prisma.institution.upsert({ where: { name: '复旦大学' }, create: { name: '复旦大学', code: '10246', category: '985', type: '综合', province: '上海', city: '上海', region: 'mainland', website: 'https://www.fudan.edu.cn' }, update: {} }),
    prisma.institution.upsert({ where: { name: '中山大学' }, create: { name: '中山大学', code: '10558', category: '985', type: '综合', province: '广东', city: '广州', region: 'mainland', website: 'https://www.sysu.edu.cn' }, update: {} }),
    prisma.institution.upsert({ where: { name: '华南理工大学' }, create: { name: '华南理工大学', code: '10561', category: '985', type: '理工', province: '广东', city: '广州', region: 'mainland', website: 'https://www.scut.edu.cn' }, update: {} }),
    prisma.institution.upsert({ where: { name: '深圳大学' }, create: { name: '深圳大学', code: '10590', category: '普通本科', type: '综合', province: '广东', city: '深圳', region: 'mainland', website: 'https://www.szu.edu.cn' }, update: {} }),
    prisma.institution.upsert({ where: { name: '浙江大学' }, create: { name: '浙江大学', code: '10335', category: '985', type: '综合', province: '浙江', city: '杭州', region: 'mainland', website: 'https://www.zju.edu.cn' }, update: {} }),
    prisma.institution.upsert({ where: { name: '武汉大学' }, create: { name: '武汉大学', code: '10486', category: '985', type: '综合', province: '湖北', city: '武汉', region: 'mainland', website: 'https://www.whu.edu.cn' }, update: {} }),
  ]);
  console.log('插入了 ' + mainlandInstitutions.length + ' 所内地院校');

  const hkInstitutions = await Promise.all([
    prisma.institution.upsert({ where: { name: '香港大学' }, create: { name: '香港大学', code: 'HKU', category: '港八大', type: '综合', province: '香港', city: '香港岛', region: 'hongkong', hkCategory: 'ugc-funded', website: 'https://www.hku.hk' }, update: {} }),
    prisma.institution.upsert({ where: { name: '香港中文大学' }, create: { name: '香港中文大学', code: 'CUHK', category: '港八大', type: '综合', province: '香港', city: '沙田', region: 'hongkong', hkCategory: 'ugc-funded', website: 'https://www.cuhk.edu.hk' }, update: {} }),
    prisma.institution.upsert({ where: { name: '香港科技大学' }, create: { name: '香港科技大学', code: 'HKUST', category: '港八大', type: '理工', province: '香港', city: '西贡', region: 'hongkong', hkCategory: 'ugc-funded', website: 'https://www.ust.hk' }, update: {} }),
    prisma.institution.upsert({ where: { name: '香港城市大学' }, create: { name: '香港城市大学', code: 'CityU', category: '港八大', type: '综合', province: '香港', city: '九龙塘', region: 'hongkong', hkCategory: 'ugc-funded', website: 'https://www.cityu.edu.hk' }, update: {} }),
    prisma.institution.upsert({ where: { name: '香港理工大学' }, create: { name: '香港理工大学', code: 'PolyU', category: '港八大', type: '理工', province: '香港', city: '红磡', region: 'hongkong', hkCategory: 'ugc-funded', website: 'https://www.polyu.edu.hk' }, update: {} }),
    prisma.institution.upsert({ where: { name: '香港浸会大学' }, create: { name: '香港浸会大学', code: 'HKBU', category: '港八大', type: '综合', province: '香港', city: '九龙塘', region: 'hongkong', hkCategory: 'ugc-funded', website: 'https://www.hkbu.edu.hk' }, update: {} }),
    prisma.institution.upsert({ where: { name: '岭南大学' }, create: { name: '岭南大学', code: 'Lingnan', category: '港八大', type: '综合', province: '香港', city: '屯门', region: 'hongkong', hkCategory: 'ugc-funded', website: 'https://www.ln.edu.hk' }, update: {} }),
    prisma.institution.upsert({ where: { name: '香港教育大学' }, create: { name: '香港教育大学', code: 'EdUHK', category: '港八大', type: '师范', province: '香港', city: '大埔', region: 'hongkong', hkCategory: 'ugc-funded', website: 'https://www.eduhk.hk' }, update: {} }),
    prisma.institution.upsert({ where: { name: '香港都会大学' }, create: { name: '香港都会大学', code: 'HKMU', category: '自资院校', type: '综合', province: '香港', city: '九龙', region: 'hongkong', hkCategory: 'self-financed', website: 'https://www.hkmu.edu.hk' }, update: {} }),
    prisma.institution.upsert({ where: { name: '香港树仁大学' }, create: { name: '香港树仁大学', code: 'HKSYU', category: '自资院校', type: '综合', province: '香港', city: '北角', region: 'hongkong', hkCategory: 'self-financed', website: 'https://www.hksyu.edu' }, update: {} }),
    prisma.institution.upsert({ where: { name: '香港恒生大学' }, create: { name: '香港恒生大学', code: 'HSUHK', category: '自资院校', type: '综合', province: '香港', city: '沙田', region: 'hongkong', hkCategory: 'self-financed', website: 'https://www.hsu.edu.hk' }, update: {} }),
    prisma.institution.upsert({ where: { name: '香港珠海学院' }, create: { name: '香港珠海学院', code: 'HKCHC', category: '自资院校', type: '综合', province: '香港', city: '屯门', region: 'hongkong', hkCategory: 'self-financed', website: 'https://www.chuhai.edu.hk' }, update: {} }),
    prisma.institution.upsert({ where: { name: 'HKU SPACE' }, create: { name: 'HKU SPACE', code: 'HKUSPACE', category: '副学士院校', type: '综合', province: '香港', city: '香港岛', region: 'hongkong', hkCategory: 'sub-degree', website: 'https://www.hkuspace.hku.hk' }, update: {} }),
    prisma.institution.upsert({ where: { name: 'HKCC (香港理工大学专上学院)' }, create: { name: 'HKCC (香港理工大学专上学院)', code: 'HKCC', category: '副学士院校', type: '理工', province: '香港', city: '红磡', region: 'hongkong', hkCategory: 'sub-degree', website: 'https://www.hkcc-polyu.edu.hk' }, update: {} }),
    prisma.institution.upsert({ where: { name: 'HKBU CIE (香港浸会大学国际学院)' }, create: { name: 'HKBU CIE (香港浸会大学国际学院)', code: 'HKBUCIE', category: '副学士院校', type: '综合', province: '香港', city: '九龙塘', region: 'hongkong', hkCategory: 'sub-degree', website: 'https://www.cie.hkbu.edu.hk' }, update: {} }),
    prisma.institution.upsert({ where: { name: '香港城市大学专上学院' }, create: { name: '香港城市大学专上学院', code: 'CCCU', category: '副学士院校', type: '综合', province: '香港', city: '九龙', region: 'hongkong', hkCategory: 'sub-degree', website: 'https://www.cityu.edu.hk/cccu' }, update: {} }),
    prisma.institution.upsert({ where: { name: '香港中文大学专业进修学院' }, create: { name: '香港中文大学专业进修学院', code: 'CUHKSCS', category: '副学士院校', type: '综合', province: '香港', city: '沙田', region: 'hongkong', hkCategory: 'sub-degree', website: 'https://www.scs.cuhk.edu.hk' }, update: {} }),
    prisma.institution.upsert({ where: { name: '岭南大学持续进修学院' }, create: { name: '岭南大学持续进修学院', code: 'LingnanLIFE', category: '副学士院校', type: '综合', province: '香港', city: '屯门', region: 'hongkong', hkCategory: 'sub-degree', website: 'https://www.ln.edu.hk/life' }, update: {} }),
    prisma.institution.upsert({ where: { name: '香港科技专上书院' }, create: { name: '香港科技专上书院', code: 'HKCT', category: '副学士院校', type: '综合', province: '香港', city: '九龙', region: 'hongkong', hkCategory: 'sub-degree', website: 'https://www.hkct.edu.hk' }, update: {} }),
    prisma.institution.upsert({ where: { name: '东华学院' }, create: { name: '东华学院', code: 'TWC', category: '自资院校', type: '综合', province: '香港', city: '九龙', region: 'hongkong', hkCategory: 'self-financed', website: 'https://www.twc.edu.hk' }, update: {} }),
    prisma.institution.upsert({ where: { name: '明爱专上学院' }, create: { name: '明爱专上学院', code: 'CIHE', category: '自资院校', type: '综合', province: '香港', city: '将军澳', region: 'hongkong', hkCategory: 'self-financed', website: 'https://www.cihe.edu.hk' }, update: {} }),
    prisma.institution.upsert({ where: { name: '香港演艺学院' }, create: { name: '香港演艺学院', code: 'HKAPA', category: '法定院校', type: '艺术', province: '香港', city: '湾仔', region: 'hongkong', hkCategory: 'ugc-funded', website: 'https://www.hkapa.edu' }, update: {} }),
    prisma.institution.upsert({ where: { name: '香港高等教育科技学院' }, create: { name: '香港高等教育科技学院', code: 'THEi', category: '自资院校', type: '理工', province: '香港', city: '柴湾', region: 'hongkong', hkCategory: 'self-financed', website: 'https://www.thei.edu.hk' }, update: {} }),
    prisma.institution.upsert({ where: { name: '耀中幼教学院' }, create: { name: '耀中幼教学院', code: 'YCCECE', category: '自资院校', type: '师范', province: '香港', city: '香港仔', region: 'hongkong', hkCategory: 'self-financed', website: 'https://www.yccece.edu.hk' }, update: {} }),
  ]);
  console.log('插入了 ' + hkInstitutions.length + ' 所香港院校');

  const totalInstitutions = mainlandInstitutions.length + hkInstitutions.length;
  console.log('院校总计: ' + totalInstitutions + ' 所（内地 ' + mainlandInstitutions.length + ' + 香港 ' + hkInstitutions.length + '）');

  const frameworks = await Promise.all([
    prisma.examFramework.create({ data: { examCategory: 'gaokao', key: 'gaokao', label: '国内高考', scoreMode: 'total_score', subjectRequirementMode: 'subject_group', officialSourceFeasibility: 'high' } }),
    prisma.examFramework.create({ data: { examCategory: 'dse', key: 'dse', label: 'DSE 香港中学文凭', scoreMode: 'best_n_subjects', subjectRequirementMode: 'specified_subjects', officialSourceFeasibility: 'high' } }),
    prisma.examFramework.create({ data: { examCategory: 'ib', key: 'ib', label: 'IB 国际文凭', scoreMode: 'total_score', subjectRequirementMode: 'none', officialSourceFeasibility: 'medium' } }),
    prisma.examFramework.create({ data: { examCategory: 'alevel', key: 'alevel', label: 'GCE A-Level', scoreMode: 'grade_combination', subjectRequirementMode: 'specified_subjects', officialSourceFeasibility: 'medium' } }),
    prisma.examFramework.create({ data: { examCategory: 'sat', key: 'sat', label: 'SAT', scoreMode: 'total_score', subjectRequirementMode: 'ap_required', officialSourceFeasibility: 'medium' } }),
    prisma.examFramework.create({ data: { examCategory: 'act', key: 'act', label: 'ACT', scoreMode: 'total_score', subjectRequirementMode: 'ap_required', officialSourceFeasibility: 'medium' } }),
    prisma.examFramework.create({ data: { examCategory: 'ap', key: 'ap', label: 'AP', scoreMode: 'ap_count', subjectRequirementMode: 'subject_specific', officialSourceFeasibility: 'medium' } }),
  ]);
  console.log('插入了 ' + frameworks.length + ' 条考试体系记录');

  const gaokaoFramework = frameworks.find(f => f.key === 'gaokao')!;
  const ibFramework = frameworks.find(f => f.key === 'ib')!;
  const alevelFramework = frameworks.find(f => f.key === 'alevel')!;
  const satFramework = frameworks.find(f => f.key === 'sat')!;
  const dseFramework = frameworks.find(f => f.key === 'dse')!;

  const templates = await Promise.all([
    prisma.examRequirementTemplate.create({ data: { examFrameworkId: gaokaoFramework.id, institutionName: '港八大', programName: '本科', requirementText: '高考成绩达一本线/特控线以上，超一本线80-150分；英语110-135分（满分150）；多数需要面试', sourceUrl: 'https://www.jupas.edu.hk' } }),
    prisma.examRequirementTemplate.create({ data: { examFrameworkId: gaokaoFramework.id, institutionName: '自资院校', programName: '本科', requirementText: '高考成绩达二本线/本科线至一本线；英语100-110分', sourceUrl: 'https://www.jupas.edu.hk' } }),
    prisma.examRequirementTemplate.create({ data: { examFrameworkId: gaokaoFramework.id, institutionName: '副学士院校', programName: '副学士/高级文凭', requirementText: '高考成绩达本科线/二本线；英语90-100分（满分150）；大部分需要面试', sourceUrl: 'https://www2.hkuspace.hku.hk/cc/chs/admission/admission-for-mainland-students/mainland-application' } }),
    prisma.examRequirementTemplate.create({ data: { examFrameworkId: ibFramework.id, institutionName: '港八大', programName: '本科', requirementText: 'IB总分32-43分；港大医学43分、法学40分、商科36分、建筑34分；理工/中大一般32-36分', sourceUrl: 'https://admissions.hku.hk/apply/international' } }),
    prisma.examRequirementTemplate.create({ data: { examFrameworkId: ibFramework.id, institutionName: '副学士院校', programName: '副学士/高级文凭', requirementText: 'IB文凭总分24分或以上即可申请', sourceUrl: 'https://www.cie.hkbu.edu.hk' } }),
    prisma.examRequirementTemplate.create({ data: { examFrameworkId: alevelFramework.id, institutionName: '港八大', programName: '本科', requirementText: 'GCE A-Level 3A-4A*；港大医学4A*、法学3A*、商科3A-3A*、工程3A；PolyU 3科AL Grade B或以上', sourceUrl: 'https://admissions.hku.hk/apply/international' } }),
    prisma.examRequirementTemplate.create({ data: { examFrameworkId: alevelFramework.id, institutionName: '副学士院校', programName: '副学士/高级文凭', requirementText: 'GCE A-Level 1科E级或以上即可申请（2科AS Level等同1科A-Level）', sourceUrl: 'https://www.cityu.edu.hk/cccu' } }),
    prisma.examRequirementTemplate.create({ data: { examFrameworkId: satFramework.id, institutionName: '港八大', programName: '本科', requirementText: 'SAT 1380-1560 + 3-5门AP Grade 3-5；港大国际商业1560+AP 5四门、医学1510+AP 5三门、商科1470+AP 5四门；PolyU SAT 1190+AP 2门', sourceUrl: 'https://admissions.hku.hk/apply/international' } }),
    prisma.examRequirementTemplate.create({ data: { examFrameworkId: dseFramework.id, institutionName: '港八大', programName: '本科', requirementText: 'DSE Best 5/6 22-49分；港大医学42+、法学35+、商科35+；中大医学40+；科大工程22+', sourceUrl: 'https://www.jupas.edu.hk' } }),
  ]);
  console.log('插入了 ' + templates.length + ' 条录取要求模板');

  console.log('\n--- Seed 完成 ---');
  console.log('管理员账号: admin / admin123');
  console.log('院校: ' + totalInstitutions + ' 所（无录取记录，请运行导入脚本）');
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
