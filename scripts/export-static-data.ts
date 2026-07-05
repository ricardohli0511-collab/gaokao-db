import { prisma } from '../src/lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

const OUT = path.resolve('public/data');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const institutions = await prisma.institution.findMany();
  fs.writeFileSync(path.join(OUT, 'institutions.json'), JSON.stringify(institutions));

  const records = await prisma.admissionRecord.findMany({
    include: { institution: { select: { id: true, name: true, category: true, type: true, hkCategory: true } } },
  });
  fs.writeFileSync(path.join(OUT, 'records.json'), JSON.stringify(records));

  const provinces = [
    '北京', '天津', '河北', '山西', '内蒙古',
    '辽宁', '吉林', '黑龙江',
    '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东',
    '河南', '湖北', '湖南', '广东', '广西', '海南',
    '重庆', '四川', '贵州', '云南', '西藏',
    '陕西', '甘肃', '青海', '宁夏', '新疆',
    '香港', '澳门', '台湾',
  ];

  const years = [2025, 2024, 2023];

  const associateRecords = await prisma.associateDegreeRecord.findMany({
    include: { institution: { select: { id: true, name: true, category: true, hkCategory: true } } },
  });
  fs.writeFileSync(path.join(OUT, 'associate.json'), JSON.stringify(associateRecords));

  fs.writeFileSync(path.join(OUT, 'provinces-years.json'), JSON.stringify({ provinces, years }));

  const sizes = fs.readdirSync(OUT).map((f) => `${f}: ${(fs.statSync(path.join(OUT, f)).size / 1024).toFixed(1)}KB`);
  console.log('✅ Static data exported to public/data/');
  console.log(sizes.join('\n'));

  await prisma.$disconnect();
}

main();
