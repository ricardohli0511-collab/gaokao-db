import type { SupportedSourceType } from '@/lib/import/types';

export interface SchoolSourceRegistryEntry {
  schoolKey: string;
  institutionName: string;
  institutionCode?: string | null;
  adapterKey: string;
  sourceType: SupportedSourceType;
  officialUrl: string;
  priority: number;
  status: 'active' | 'candidate' | 'review';
  pageMode: 'static-table' | 'filter-page' | 'article-list' | 'query-only';
  coverageYears: number[];
  coverageProvinces: string[];
  crossCheckUrls: string[];
}

export const SCHOOL_SOURCE_REGISTRY: SchoolSourceRegistryEntry[] = [
  {
    schoolKey: 'bit-undergrad',
    institutionName: '北京理工大学',
    institutionCode: null,
    adapterKey: 'bit-undergrad-html',
    sourceType: 'html',
    officialUrl: 'https://admission.bit.edu.cn/static/front/bit/basic/html_web/lnfs.html',
    priority: 100,
    status: 'candidate',
    pageMode: 'filter-page',
    coverageYears: [2025, 2024, 2023],
    coverageProvinces: ['北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江', '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州', '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆'],
    crossCheckUrls: [
      'https://admission.bit.edu.cn/',
      'https://admission.bit.edu.cn/html/1/m/168/172/index.html',
      'https://admission.bit.edu.cn/static/front/bit/basic/html_web/lnfs.html',
    ],
  },
  {
    schoolKey: 'nju-undergrad',
    institutionName: '南京大学',
    institutionCode: null,
    adapterKey: 'nju-undergrad-html',
    sourceType: 'html',
    officialUrl: 'https://bkzs.nju.edu.cn/static/front/nju/basic/html_web/lnfs.html',
    priority: 90,
    status: 'candidate',
    pageMode: 'filter-page',
    coverageYears: [2025, 2024, 2023],
    coverageProvinces: ['江苏'],
    crossCheckUrls: [
      'https://xxgk.nju.edu.cn/15509/list.htm',
      'https://bkzs.nju.edu.cn/static/front/nju/basic/html_web/lnfs.html',
    ],
  },
  {
    schoolKey: 'hit-undergrad',
    institutionName: '哈尔滨工业大学',
    institutionCode: null,
    adapterKey: 'hit-undergrad-html',
    sourceType: 'html',
    officialUrl: 'https://zsb.hit.edu.cn/information/score',
    priority: 95,
    status: 'candidate',
    pageMode: 'static-table',
    coverageYears: [2025, 2024],
    coverageProvinces: ['北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江', '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州', '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆'],
    crossCheckUrls: ['https://zsb.hit.edu.cn/information/summary', 'https://zsb.hit.edu.cn/information/score'],
  },
  {
    schoolKey: 'seu-undergrad',
    institutionName: '东南大学',
    institutionCode: null,
    adapterKey: 'seu-undergrad-html',
    sourceType: 'html',
    officialUrl: 'https://zsb.seu.edu.cn/2025/0407/c23657a524104/page.htm',
    priority: 70,
    status: 'review',
    pageMode: 'article-list',
    coverageYears: [2024, 2023],
    coverageProvinces: ['北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江', '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州', '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆'],
    crossCheckUrls: [
      'https://zsb.seu.edu.cn/2025/0407/c23657a524104/page.htm',
      'https://zsb.seu.edu.cn/2024/0312/c23657a483794/pagem.htm',
    ],
  },
];

export function getSchoolSourceByKey(schoolKey: string): SchoolSourceRegistryEntry {
  const entry = SCHOOL_SOURCE_REGISTRY.find((item) => item.schoolKey === schoolKey);
  if (!entry) {
    throw new Error(`未找到学校官网来源: ${schoolKey}`);
  }

  return entry;
}
