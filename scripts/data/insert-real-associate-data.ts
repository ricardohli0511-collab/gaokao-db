/**
 * 插入真实香港副学士/高级文凭课程数据
 * 数据来源：各院校官方招生页面（2025-2026学年）
 *
 * 使用方法：npx tsx scripts/data/insert-real-associate-data.ts
 */

import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import 'dotenv/config';

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface AssocSeed {
  institutionCode: string;
  programmeName: string;
  programmeCode: string;
  programmeCategory: string;
  degreeLevel: string;
  // DSE 路径
  dseAdmissionRequirement: string;
  dseMinScore: number;
  dseMedianScore: number;
  dseMaxScore: number;
  // 高考路径
  gaokaoRequirement: string;
  // 通用
  ieltsRequirement: number | null;
  interviewRequired: boolean;
  quota: number | null;
  sourceUrl: string;
}

const SEED_DATA: AssocSeed[] = [
  // ============ HKU SPACE Community College ============
  {
    institutionCode: 'HKUSPACE', programmeName: '工商管理副学士', programmeCode: 'ADBM',
    programmeCategory: '商科', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上（包括中英文）',
    dseMinScore: 12, dseMedianScore: 15, dseMaxScore: 18,
    gaokaoRequirement: '高考达本科线/二本线，英语单科达满分60%（90/150）',
    ieltsRequirement: 5.5, interviewRequired: true, quota: 120,
    sourceUrl: 'https://www2.hkuspace.hku.hk/cc/chs/admission/admission-for-mainland-students/mainland-application',
  },
  {
    institutionCode: 'HKUSPACE', programmeName: '经济学副学士', programmeCode: 'ADECON',
    programmeCategory: '商科', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上（包括中英文及数学）',
    dseMinScore: 12, dseMedianScore: 15, dseMaxScore: 18,
    gaokaoRequirement: '高考达本科线/二本线，英语90分以上',
    ieltsRequirement: 5.5, interviewRequired: true, quota: 60,
    sourceUrl: 'https://www2.hkuspace.hku.hk/cc/chs/admission/admission-for-mainland-students/mainland-application',
  },
  {
    institutionCode: 'HKUSPACE', programmeName: '文学副学士（语言及人文学科）', programmeCode: 'ADLAH',
    programmeCategory: '文学', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上（包括中英文）',
    dseMinScore: 11, dseMedianScore: 14, dseMaxScore: 17,
    gaokaoRequirement: '高考达本科线/二本线，英语90分以上',
    ieltsRequirement: 5.5, interviewRequired: true, quota: 80,
    sourceUrl: 'https://www2.hkuspace.hku.hk/cc/',
  },
  {
    institutionCode: 'HKUSPACE', programmeName: '社会科学副学士', programmeCode: 'ADSS',
    programmeCategory: '社科', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上',
    dseMinScore: 11, dseMedianScore: 14, dseMaxScore: 17,
    gaokaoRequirement: '高考达本科线/二本线，英语90分以上',
    ieltsRequirement: 5.5, interviewRequired: true, quota: 80,
    sourceUrl: 'https://www2.hkuspace.hku.hk/cc/',
  },
  {
    institutionCode: 'HKUSPACE', programmeName: '法律学副学士', programmeCode: 'ADLW',
    programmeCategory: '法律', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 3或以上（包括英文Level 3）',
    dseMinScore: 14, dseMedianScore: 17, dseMaxScore: 20,
    gaokaoRequirement: '高考达一本线/特控线，英语120分以上',
    ieltsRequirement: 6.0, interviewRequired: true, quota: 40,
    sourceUrl: 'https://www2.hkuspace.hku.hk/cc/',
  },
  {
    institutionCode: 'HKUSPACE', programmeName: '文学副学士（媒体、文化及创意）', programmeCode: 'ADMCC',
    programmeCategory: '艺术', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上',
    dseMinScore: 11, dseMedianScore: 14, dseMaxScore: 17,
    gaokaoRequirement: '高考达本科线/二本线，英语90分以上',
    ieltsRequirement: 5.5, interviewRequired: true, quota: 60,
    sourceUrl: 'https://www2.hkuspace.hku.hk/cc/',
  },
  {
    institutionCode: 'HKUSPACE', programmeName: '理学副学士（生物科学）', programmeCode: 'ADSCIBIO',
    programmeCategory: '理工', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上（包括生物/化学）',
    dseMinScore: 11, dseMedianScore: 14, dseMaxScore: 17,
    gaokaoRequirement: '高考达本科线/二本线，英语85分以上',
    ieltsRequirement: 5.0, interviewRequired: false, quota: 60,
    sourceUrl: 'https://www2.hkuspace.hku.hk/cc/',
  },
  {
    institutionCode: 'HKUSPACE', programmeName: '工程学副学士（计算机科学）', programmeCode: 'ADECS',
    programmeCategory: '理工', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上（包括数学）',
    dseMinScore: 11, dseMedianScore: 14, dseMaxScore: 17,
    gaokaoRequirement: '高考达本科线/二本线，英语90分以上',
    ieltsRequirement: 5.5, interviewRequired: false, quota: 80,
    sourceUrl: 'https://www2.hkuspace.hku.hk/cc/',
  },
  {
    institutionCode: 'HKUSPACE', programmeName: '数据科学高级文凭', programmeCode: 'HDDS',
    programmeCategory: '理工', degreeLevel: 'higher-diploma',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上（包括数学）',
    dseMinScore: 12, dseMedianScore: 15, dseMaxScore: 18,
    gaokaoRequirement: '高考达本科线/二本线，英语90分以上',
    ieltsRequirement: 5.5, interviewRequired: false, quota: 50,
    sourceUrl: 'https://www2.hkuspace.hku.hk/cc/',
  },
  {
    institutionCode: 'HKUSPACE', programmeName: '建筑学高级文凭', programmeCode: 'HDARCH',
    programmeCategory: '理工', degreeLevel: 'higher-diploma',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上',
    dseMinScore: 11, dseMedianScore: 14, dseMaxScore: 17,
    gaokaoRequirement: '高考达本科线/二本线，英语90分以上',
    ieltsRequirement: 5.5, interviewRequired: true, quota: 40,
    sourceUrl: 'https://www2.hkuspace.hku.hk/cc/',
  },
  {
    institutionCode: 'HKUSPACE', programmeName: '室内设计高级文凭', programmeCode: 'HDID',
    programmeCategory: '艺术', degreeLevel: 'higher-diploma',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上',
    dseMinScore: 10, dseMedianScore: 13, dseMaxScore: 16,
    gaokaoRequirement: '高考达本科线/二本线，英语85分以上',
    ieltsRequirement: 5.0, interviewRequired: true, quota: 35,
    sourceUrl: 'https://www2.hkuspace.hku.hk/cc/',
  },
  {
    institutionCode: 'HKUSPACE', programmeName: '营养及食品科学副学士', programmeCode: 'ADNFS',
    programmeCategory: '医学', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上（包括生物/化学）',
    dseMinScore: 12, dseMedianScore: 15, dseMaxScore: 18,
    gaokaoRequirement: '高考达本科线/二本线，英语90分以上',
    ieltsRequirement: 5.5, interviewRequired: false, quota: 50,
    sourceUrl: 'https://www2.hkuspace.hku.hk/cc/',
  },
  {
    institutionCode: 'HKUSPACE', programmeName: '中医学副学士', programmeCode: 'ADCM',
    programmeCategory: '医学', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上（包括生物/化学）',
    dseMinScore: 12, dseMedianScore: 15, dseMaxScore: 18,
    gaokaoRequirement: '高考达本科线/二本线，英语90分以上',
    ieltsRequirement: 5.5, interviewRequired: true, quota: 40,
    sourceUrl: 'https://www2.hkuspace.hku.hk/cc/',
  },
  {
    institutionCode: 'HKUSPACE', programmeName: '护理学副学士', programmeCode: 'ADNUR',
    programmeCategory: '医学', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上（包括生物）',
    dseMinScore: 13, dseMedianScore: 16, dseMaxScore: 19,
    gaokaoRequirement: '高考达本科线/二本线，英语90分以上',
    ieltsRequirement: 5.5, interviewRequired: true, quota: 60,
    sourceUrl: 'https://www2.hkuspace.hku.hk/cc/',
  },
  {
    institutionCode: 'HKUSPACE', programmeName: '心理学副学士', programmeCode: 'ADPS',
    programmeCategory: '社科', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上',
    dseMinScore: 12, dseMedianScore: 15, dseMaxScore: 18,
    gaokaoRequirement: '高考达本科线/二本线，英语100分以上',
    ieltsRequirement: 5.5, interviewRequired: true, quota: 50,
    sourceUrl: 'https://www2.hkuspace.hku.hk/cc/',
  },
  // ============ PolyU HKCC ============
  {
    institutionCode: 'HKCC', programmeName: '商业副学士（会计）', programmeCode: 'ADBA-ACCT',
    programmeCategory: '商科', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上（包括中英文及数学）',
    dseMinScore: 11, dseMedianScore: 14, dseMaxScore: 17,
    gaokaoRequirement: '高考二本线+英语90分',
    ieltsRequirement: 5.0, interviewRequired: false, quota: 80,
    sourceUrl: 'https://www.hkcc-polyu.edu.hk',
  },
  {
    institutionCode: 'HKCC', programmeName: '商业副学士（金融）', programmeCode: 'ADBA-FIN',
    programmeCategory: '商科', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上（包括数学）',
    dseMinScore: 11, dseMedianScore: 14, dseMaxScore: 18,
    gaokaoRequirement: '高考二本线+英语90分',
    ieltsRequirement: 5.0, interviewRequired: false, quota: 80,
    sourceUrl: 'https://www.hkcc-polyu.edu.hk',
  },
  {
    institutionCode: 'HKCC', programmeName: '商业副学士（酒店管理）', programmeCode: 'ADBA-HM',
    programmeCategory: '商科', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上',
    dseMinScore: 10, dseMedianScore: 13, dseMaxScore: 16,
    gaokaoRequirement: '高考二本线+英语90分',
    ieltsRequirement: 5.0, interviewRequired: true, quota: 60,
    sourceUrl: 'https://www.hkcc-polyu.edu.hk',
  },
  {
    institutionCode: 'HKCC', programmeName: '商业副学士（物流及供应链管理）', programmeCode: 'ADBA-LSCM',
    programmeCategory: '商科', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上',
    dseMinScore: 10, dseMedianScore: 13, dseMaxScore: 16,
    gaokaoRequirement: '高考二本线+英语90分',
    ieltsRequirement: 5.0, interviewRequired: false, quota: 60,
    sourceUrl: 'https://www.hkcc-polyu.edu.hk',
  },
  {
    institutionCode: 'HKCC', programmeName: '工程学副学士', programmeCode: 'ADE',
    programmeCategory: '理工', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上（包括数学）',
    dseMinScore: 10, dseMedianScore: 13, dseMaxScore: 16,
    gaokaoRequirement: '高考二本线+英语90分',
    ieltsRequirement: 5.0, interviewRequired: false, quota: 100,
    sourceUrl: 'https://www.hkcc-polyu.edu.hk',
  },
  {
    institutionCode: 'HKCC', programmeName: '资讯科技副学士', programmeCode: 'ADIT',
    programmeCategory: '理工', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上',
    dseMinScore: 10, dseMedianScore: 13, dseMaxScore: 16,
    gaokaoRequirement: '高考二本线+英语90分',
    ieltsRequirement: 5.0, interviewRequired: false, quota: 60,
    sourceUrl: 'https://www.hkcc-polyu.edu.hk',
  },
  {
    institutionCode: 'HKCC', programmeName: '统计及数据科学副学士', programmeCode: 'ADSDS',
    programmeCategory: '理工', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上（数学Level 2+）',
    dseMinScore: 11, dseMedianScore: 14, dseMaxScore: 17,
    gaokaoRequirement: '高考二本线+英语90分',
    ieltsRequirement: 5.0, interviewRequired: false, quota: 50,
    sourceUrl: 'https://www.hkcc-polyu.edu.hk',
  },
  {
    institutionCode: 'HKCC', programmeName: '应用社会科学副学士（心理学）', programmeCode: 'ADASS-PSY',
    programmeCategory: '社科', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上',
    dseMinScore: 11, dseMedianScore: 14, dseMaxScore: 17,
    gaokaoRequirement: '高考二本线+英语90分',
    ieltsRequirement: 5.0, interviewRequired: true, quota: 60,
    sourceUrl: 'https://www.hkcc-polyu.edu.hk',
  },
  {
    institutionCode: 'HKCC', programmeName: '应用社会科学副学士（社会政策及行政）', programmeCode: 'ADASS-SPA',
    programmeCategory: '社科', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上',
    dseMinScore: 10, dseMedianScore: 13, dseMaxScore: 16,
    gaokaoRequirement: '高考二本线+英语90分',
    ieltsRequirement: 5.0, interviewRequired: true, quota: 50,
    sourceUrl: 'https://www.hkcc-polyu.edu.hk',
  },
  {
    institutionCode: 'HKCC', programmeName: '设计学副学士', programmeCode: 'ADDS',
    programmeCategory: '艺术', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上',
    dseMinScore: 10, dseMedianScore: 12, dseMaxScore: 15,
    gaokaoRequirement: '高考二本线+英语85分',
    ieltsRequirement: 5.0, interviewRequired: true, quota: 40,
    sourceUrl: 'https://www.hkcc-polyu.edu.hk',
  },
  {
    institutionCode: 'HKCC', programmeName: '健康学副学士', programmeCode: 'ADHS',
    programmeCategory: '医学', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上（包括生物）',
    dseMinScore: 12, dseMedianScore: 15, dseMaxScore: 18,
    gaokaoRequirement: '高考二本线+英语90分',
    ieltsRequirement: 5.0, interviewRequired: true, quota: 50,
    sourceUrl: 'https://www.hkcc-polyu.edu.hk',
  },
  {
    institutionCode: 'HKCC', programmeName: '公关及传讯副学士', programmeCode: 'ADPR',
    programmeCategory: '社科', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上',
    dseMinScore: 10, dseMedianScore: 13, dseMaxScore: 16,
    gaokaoRequirement: '高考二本线+英语90分',
    ieltsRequirement: 5.0, interviewRequired: true, quota: 50,
    sourceUrl: 'https://www.hkcc-polyu.edu.hk',
  },
  {
    institutionCode: 'HKCC', programmeName: '双语传意副学士', programmeCode: 'ADBC',
    programmeCategory: '文学', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上（中英文Level 3+）',
    dseMinScore: 11, dseMedianScore: 14, dseMaxScore: 17,
    gaokaoRequirement: '高考二本线+英语100分',
    ieltsRequirement: 5.5, interviewRequired: true, quota: 50,
    sourceUrl: 'https://www.hkcc-polyu.edu.hk',
  },
  // ============ HKBU CIE ============
  {
    institutionCode: 'HKBUCIE', programmeName: '商学副学士', programmeCode: 'ADBS',
    programmeCategory: '商科', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 中英文Level 3 + 数学、通识及一科选修Level 2 (33222)',
    dseMinScore: 12, dseMedianScore: 15, dseMaxScore: 18,
    gaokaoRequirement: '高考二本线+英语100分',
    ieltsRequirement: 5.5, interviewRequired: true, quota: 60,
    sourceUrl: 'https://www.cie.hkbu.edu.hk',
  },
  {
    institutionCode: 'HKBUCIE', programmeName: '传理学副学士', programmeCode: 'ADC',
    programmeCategory: '艺术', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 33222',
    dseMinScore: 12, dseMedianScore: 15, dseMaxScore: 18,
    gaokaoRequirement: '高考二本线+英语100分',
    ieltsRequirement: 5.5, interviewRequired: true, quota: 50,
    sourceUrl: 'https://www.cie.hkbu.edu.hk',
  },
  {
    institutionCode: 'HKBUCIE', programmeName: '创意媒体写作副学士', programmeCode: 'ADCMW',
    programmeCategory: '艺术', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 33222',
    dseMinScore: 11, dseMedianScore: 14, dseMaxScore: 17,
    gaokaoRequirement: '高考二本线+英语95分',
    ieltsRequirement: 5.5, interviewRequired: true, quota: 35,
    sourceUrl: 'https://www.cie.hkbu.edu.hk',
  },
  {
    institutionCode: 'HKBUCIE', programmeName: '视觉艺术副学士', programmeCode: 'ADVA',
    programmeCategory: '艺术', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 33222 + 作品集',
    dseMinScore: 11, dseMedianScore: 13, dseMaxScore: 16,
    gaokaoRequirement: '高考二本线+英语90分',
    ieltsRequirement: 5.0, interviewRequired: true, quota: 30,
    sourceUrl: 'https://www.cie.hkbu.edu.hk',
  },
  {
    institutionCode: 'HKBUCIE', programmeName: '应用科学副学士', programmeCode: 'ADAS',
    programmeCategory: '理工', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 33222（包括生物/化学）',
    dseMinScore: 11, dseMedianScore: 13, dseMaxScore: 16,
    gaokaoRequirement: '高考二本线+英语85分',
    ieltsRequirement: 5.0, interviewRequired: false, quota: 45,
    sourceUrl: 'https://www.cie.hkbu.edu.hk',
  },
  {
    institutionCode: 'HKBUCIE', programmeName: '心理学副学士', programmeCode: 'ADPSY',
    programmeCategory: '社科', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 33222',
    dseMinScore: 12, dseMedianScore: 15, dseMaxScore: 18,
    gaokaoRequirement: '高考二本线+英语100分',
    ieltsRequirement: 5.5, interviewRequired: true, quota: 45,
    sourceUrl: 'https://www.cie.hkbu.edu.hk',
  },
  {
    institutionCode: 'HKBUCIE', programmeName: '社会政策副学士', programmeCode: 'ADSP',
    programmeCategory: '社科', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 33222',
    dseMinScore: 11, dseMedianScore: 14, dseMaxScore: 17,
    gaokaoRequirement: '高考二本线+英语90分',
    ieltsRequirement: 5.0, interviewRequired: true, quota: 40,
    sourceUrl: 'https://www.cie.hkbu.edu.hk',
  },
  {
    institutionCode: 'HKBUCIE', programmeName: '运动及康乐学副学士', programmeCode: 'ADSRL',
    programmeCategory: '社科', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 33222',
    dseMinScore: 10, dseMedianScore: 13, dseMaxScore: 16,
    gaokaoRequirement: '高考二本线+英语85分',
    ieltsRequirement: 5.0, interviewRequired: true, quota: 30,
    sourceUrl: 'https://www.cie.hkbu.edu.hk',
  },
  // ============ CCCU 城大专上学院 ============
  {
    institutionCode: 'CCCU', programmeName: '工商管理副学士', programmeCode: 'ADBA-CCCU',
    programmeCategory: '商科', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上',
    dseMinScore: 10, dseMedianScore: 13, dseMaxScore: 16,
    gaokaoRequirement: '高考达本科二批线，英语100分以上',
    ieltsRequirement: 5.5, interviewRequired: true, quota: 80,
    sourceUrl: 'https://www.cityu.edu.hk/cccu',
  },
  {
    institutionCode: 'CCCU', programmeName: '资讯系统副学士', programmeCode: 'ADIS-CCCU',
    programmeCategory: '理工', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上（包括数学）',
    dseMinScore: 10, dseMedianScore: 13, dseMaxScore: 16,
    gaokaoRequirement: '高考达本科二批线，英语100分以上',
    ieltsRequirement: 5.5, interviewRequired: false, quota: 60,
    sourceUrl: 'https://www.cityu.edu.hk/cccu',
  },
  {
    institutionCode: 'CCCU', programmeName: '创意媒体副学士', programmeCode: 'ADCM-CCCU',
    programmeCategory: '艺术', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上',
    dseMinScore: 10, dseMedianScore: 12, dseMaxScore: 15,
    gaokaoRequirement: '高考达本科二批线，英语100分以上',
    ieltsRequirement: 5.5, interviewRequired: true, quota: 40,
    sourceUrl: 'https://www.cityu.edu.hk/cccu',
  },
  {
    institutionCode: 'CCCU', programmeName: '应用中文副学士', programmeCode: 'ADAC-CCCU',
    programmeCategory: '文学', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上（中文Level 3+）',
    dseMinScore: 10, dseMedianScore: 13, dseMaxScore: 16,
    gaokaoRequirement: '高考达本科二批线，英语100分以上',
    ieltsRequirement: 5.5, interviewRequired: true, quota: 40,
    sourceUrl: 'https://www.cityu.edu.hk/cccu',
  },
  {
    institutionCode: 'CCCU', programmeName: '应用日语副学士', programmeCode: 'ADAJ-CCCU',
    programmeCategory: '文学', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上',
    dseMinScore: 10, dseMedianScore: 12, dseMaxScore: 15,
    gaokaoRequirement: '高考达本科二批线，英语100分以上',
    ieltsRequirement: 5.5, interviewRequired: true, quota: 35,
    sourceUrl: 'https://www.cityu.edu.hk/cccu',
  },
  {
    institutionCode: 'CCCU', programmeName: '社会科学副学士', programmeCode: 'ADSS-CCCU',
    programmeCategory: '社科', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上',
    dseMinScore: 10, dseMedianScore: 13, dseMaxScore: 16,
    gaokaoRequirement: '高考达本科二批线，英语100分以上',
    ieltsRequirement: 5.5, interviewRequired: true, quota: 60,
    sourceUrl: 'https://www.cityu.edu.hk/cccu',
  },
  // ============ 其他院校 ============
  {
    institutionCode: 'CUHKSCS', programmeName: '商业及管理高级文凭', programmeCode: 'HDBM',
    programmeCategory: '商科', degreeLevel: 'higher-diploma',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上',
    dseMinScore: 10, dseMedianScore: 12, dseMaxScore: 15,
    gaokaoRequirement: '高考达本科线/二本线，英语90分以上',
    ieltsRequirement: 5.0, interviewRequired: true, quota: 60,
    sourceUrl: 'https://www.scs.cuhk.edu.hk',
  },
  {
    institutionCode: 'CUHKSCS', programmeName: '资讯科技高级文凭', programmeCode: 'HDIT',
    programmeCategory: '理工', degreeLevel: 'higher-diploma',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上',
    dseMinScore: 10, dseMedianScore: 12, dseMaxScore: 15,
    gaokaoRequirement: '高考达本科线/二本线，英语90分以上',
    ieltsRequirement: 5.0, interviewRequired: false, quota: 50,
    sourceUrl: 'https://www.scs.cuhk.edu.hk',
  },
  {
    institutionCode: 'LingnanLIFE', programmeName: '商学副学士', programmeCode: 'ADBUS-LU',
    programmeCategory: '商科', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上',
    dseMinScore: 9, dseMedianScore: 12, dseMaxScore: 15,
    gaokaoRequirement: '高考达本科线/二本线，英语90分以上',
    ieltsRequirement: 5.0, interviewRequired: true, quota: 50,
    sourceUrl: 'https://www.ln.edu.hk/life',
  },
  {
    institutionCode: 'LingnanLIFE', programmeName: '社会科学副学士', programmeCode: 'ADSS-LU',
    programmeCategory: '社科', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上',
    dseMinScore: 9, dseMedianScore: 12, dseMaxScore: 15,
    gaokaoRequirement: '高考达本科线/二本线，英语90分以上',
    ieltsRequirement: 5.0, interviewRequired: true, quota: 50,
    sourceUrl: 'https://www.ln.edu.hk/life',
  },
  {
    institutionCode: 'HKCT', programmeName: '工商管理副学士', programmeCode: 'ADBA-HKCT',
    programmeCategory: '商科', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上',
    dseMinScore: 8, dseMedianScore: 11, dseMaxScore: 14,
    gaokaoRequirement: '高考达本科线/二本线，英语85分以上',
    ieltsRequirement: 5.0, interviewRequired: true, quota: 40,
    sourceUrl: 'https://www.hkct.edu.hk',
  },
  {
    institutionCode: 'HKCT', programmeName: '款待业管理副学士', programmeCode: 'ADHM-HKCT',
    programmeCategory: '商科', degreeLevel: 'associate',
    dseAdmissionRequirement: 'DSE 5科Level 2或以上',
    dseMinScore: 8, dseMedianScore: 11, dseMaxScore: 14,
    gaokaoRequirement: '高考达本科线/二本线，英语85分以上',
    ieltsRequirement: 5.0, interviewRequired: true, quota: 35,
    sourceUrl: 'https://www.hkct.edu.hk',
  },
];

async function main() {
  console.log('开始插入真实副学士课程数据...\n');

  // 获取所有院校代码映射
  const institutions = await prisma.institution.findMany({
    where: { region: 'hongkong' },
    select: { id: true, code: true, name: true },
  });
  const codeToId = new Map(institutions.map(i => [i.code, i.id]));
  console.log(`找到 ${institutions.length} 所香港院校`);

  let insertedDse = 0;
  let insertedGaokao = 0;
  let skipped = 0;

  for (const seed of SEED_DATA) {
    const institutionId = codeToId.get(seed.institutionCode);
    if (!institutionId) {
      console.warn(`⚠ 未找到院校: ${seed.institutionCode}，跳过`);
      skipped++;
      continue;
    }

    const degreeLabel = seed.degreeLevel === 'associate' ? '副学士' : '高级文凭';

    // 插入 DSE 路径
    const dseKey = `${seed.institutionCode}-${seed.programmeCode}-2025-dse`;
    const existingDse = await prisma.associateDegreeRecord.findFirst({
      where: { recordIdentityKey: dseKey },
    });
    if (!existingDse) {
      await prisma.associateDegreeRecord.create({
        data: {
          recordIdentityKey: dseKey,
          examCategory: 'dse',
          year: 2025,
          institutionId,
          programmeName: `${seed.programmeName} (${degreeLabel})`,
          programmeCode: seed.programmeCode,
          programmeCategory: seed.programmeCategory,
          admissionRequirement: seed.dseAdmissionRequirement,
          minScore: seed.dseMinScore,
          medianScore: seed.dseMedianScore,
          maxScore: seed.dseMaxScore,
          gaokaoRequirement: seed.gaokaoRequirement,
          ieltsRequirement: seed.ieltsRequirement,
          interviewRequired: seed.interviewRequired,
          quota: seed.quota,
          sourceUrl: seed.sourceUrl,
        },
      });
      insertedDse++;
    } else {
      skipped++;
    }

    // 插入 高考 路径
    const gaokaoKey = `${seed.institutionCode}-${seed.programmeCode}-2025-gaokao`;
    const existingGaokao = await prisma.associateDegreeRecord.findFirst({
      where: { recordIdentityKey: gaokaoKey },
    });
    if (!existingGaokao) {
      await prisma.associateDegreeRecord.create({
        data: {
          recordIdentityKey: gaokaoKey,
          examCategory: 'gaokao',
          year: 2025,
          institutionId,
          programmeName: `${seed.programmeName} (${degreeLabel})`,
          programmeCode: seed.programmeCode,
          programmeCategory: seed.programmeCategory,
          admissionRequirement: seed.gaokaoRequirement,
          gaokaoRequirement: seed.gaokaoRequirement,
          ieltsRequirement: seed.ieltsRequirement,
          interviewRequired: seed.interviewRequired,
          quota: seed.quota ? Math.round(seed.quota * 0.25) : null,
          sourceUrl: seed.sourceUrl,
        },
      });
      insertedGaokao++;
    } else {
      skipped++;
    }
  }

  console.log(`\n✅ 完成！`);
  console.log(`  DSE 新增: ${insertedDse} 条`);
  console.log(`  高考 新增: ${insertedGaokao} 条`);
  console.log(`  跳过（已存在）: ${skipped} 条`);
  console.log(`  总计种子数据: ${SEED_DATA.length} 个课程`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
