import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const ADMIN_EMAIL = "admin@carparts.local";
const ADMIN_PASSWORD = "admin1234";

// brand -> model -> year ranges (grouped by generation, parts usually fit the
// whole range). Model selection is tuned to the Kurdistan/Iraq market — the
// cars actually on the road here, not global catalogs.
const vehicles: Record<string, Record<string, [number, number][]>> = {
  // ── Japanese ──
  Toyota: {
    "Land Cruiser": [[2008, 2015], [2016, 2021], [2022, 2025]],
    Camry: [[2012, 2017], [2018, 2024]],
    Corolla: [[2014, 2019], [2020, 2025]],
    Hilux: [[2016, 2025]],
    Prado: [[2010, 2023]],
    RAV4: [[2013, 2018], [2019, 2025]],
    Yaris: [[2014, 2019], [2020, 2025]],
    Avalon: [[2013, 2018], [2019, 2022]],
  },
  Honda: {
    Civic: [[2012, 2015], [2016, 2021], [2022, 2025]],
    Accord: [[2013, 2017], [2018, 2022], [2023, 2025]],
    "CR-V": [[2012, 2016], [2017, 2022], [2023, 2025]],
    Pilot: [[2016, 2022]],
  },
  Nissan: {
    Altima: [[2013, 2018], [2019, 2025]],
    Patrol: [[2010, 2019], [2020, 2025]],
    Sunny: [[2012, 2025]],
    "X-Trail": [[2014, 2021]],
    Kicks: [[2018, 2025]],
    Pathfinder: [[2013, 2020], [2022, 2025]],
    Navara: [[2015, 2025]],
  },
  Mazda: {
    Mazda3: [[2014, 2018], [2019, 2025]],
    Mazda6: [[2013, 2021]],
    "CX-5": [[2013, 2016], [2017, 2025]],
    "CX-9": [[2016, 2023]],
  },
  Mitsubishi: {
    Lancer: [[2008, 2017]],
    Pajero: [[2007, 2021]],
    Outlander: [[2013, 2021], [2022, 2025]],
    L200: [[2015, 2025]],
    Attrage: [[2014, 2025]],
  },
  Subaru: {
    Impreza: [[2012, 2016], [2017, 2023]],
    Forester: [[2013, 2018], [2019, 2025]],
    Outback: [[2015, 2019], [2020, 2025]],
    XV: [[2013, 2017], [2018, 2023]],
  },
  Suzuki: {
    Swift: [[2011, 2017], [2018, 2025]],
    Vitara: [[2015, 2025]],
    Ciaz: [[2015, 2025]],
    Jimny: [[2019, 2025]],
  },
  Lexus: {
    ES: [[2013, 2018], [2019, 2025]],
    LX: [[2008, 2021], [2022, 2025]],
    RX: [[2010, 2015], [2016, 2022], [2023, 2025]],
    GX: [[2010, 2023]],
    IS: [[2014, 2020]],
  },
  Infiniti: {
    Q50: [[2014, 2024]],
    QX60: [[2013, 2020], [2022, 2025]],
    QX80: [[2011, 2024]],
    QX70: [[2009, 2017]],
  },
  Isuzu: {
    "D-Max": [[2012, 2019], [2020, 2025]],
    "MU-X": [[2014, 2020], [2021, 2025]],
  },

  // ── Korean ──
  Hyundai: {
    Elantra: [[2011, 2016], [2017, 2020], [2021, 2025]],
    Sonata: [[2015, 2019], [2020, 2025]],
    Tucson: [[2016, 2021], [2022, 2025]],
    "Santa Fe": [[2013, 2018], [2019, 2023]],
    Accent: [[2011, 2017], [2018, 2023]],
    Azera: [[2012, 2017]],
    Creta: [[2015, 2020], [2021, 2025]],
    Palisade: [[2019, 2025]],
  },
  Kia: {
    Sportage: [[2016, 2021], [2022, 2025]],
    Sorento: [[2015, 2020], [2021, 2025]],
    "Optima / K5": [[2016, 2020], [2021, 2025]],
    Picanto: [[2017, 2025]],
    Cerato: [[2013, 2018], [2019, 2024]],
    Rio: [[2012, 2016], [2017, 2023]],
    Seltos: [[2019, 2025]],
    Carnival: [[2015, 2020], [2021, 2025]],
  },

  // ── American ──
  Ford: {
    "F-150": [[2009, 2014], [2015, 2020], [2021, 2025]],
    Explorer: [[2011, 2019], [2020, 2025]],
    Edge: [[2015, 2024]],
    Escape: [[2013, 2019], [2020, 2025]],
    Taurus: [[2010, 2019]],
    Mustang: [[2015, 2023]],
  },
  Chevrolet: {
    Silverado: [[2007, 2013], [2014, 2018], [2019, 2025]],
    Tahoe: [[2007, 2014], [2015, 2020], [2021, 2025]],
    Suburban: [[2015, 2020], [2021, 2025]],
    Malibu: [[2013, 2015], [2016, 2024]],
    Camaro: [[2010, 2015], [2016, 2024]],
    Equinox: [[2010, 2017], [2018, 2024]],
    Cruze: [[2009, 2016], [2017, 2019]],
  },
  Jeep: {
    "Grand Cherokee": [[2011, 2021], [2022, 2025]],
    Wrangler: [[2007, 2017], [2018, 2025]],
    Cherokee: [[2014, 2023]],
    Compass: [[2017, 2025]],
  },
  Dodge: {
    Charger: [[2011, 2023]],
    Challenger: [[2008, 2023]],
    Durango: [[2011, 2025]],
  },
  Chrysler: {
    "300": [[2011, 2023]],
    Pacifica: [[2017, 2025]],
  },
  Ram: {
    "1500": [[2009, 2018], [2019, 2025]],
    "2500": [[2010, 2018], [2019, 2025]],
  },
  GMC: {
    Sierra: [[2007, 2013], [2014, 2018], [2019, 2025]],
    Yukon: [[2007, 2014], [2015, 2020], [2021, 2025]],
    Acadia: [[2017, 2023]],
    Terrain: [[2010, 2017], [2018, 2024]],
  },
  Cadillac: {
    Escalade: [[2007, 2014], [2015, 2020], [2021, 2025]],
    CT5: [[2020, 2025]],
    XT5: [[2017, 2024]],
    ATS: [[2013, 2019]],
  },
  Lincoln: {
    Navigator: [[2007, 2017], [2018, 2025]],
    MKZ: [[2013, 2020]],
    Aviator: [[2020, 2025]],
  },

  // ── German ──
  BMW: {
    "3 Series": [[2012, 2018], [2019, 2025]],
    "5 Series": [[2010, 2016], [2017, 2023], [2024, 2025]],
    "7 Series": [[2009, 2015], [2016, 2022], [2023, 2025]],
    X3: [[2011, 2017], [2018, 2024]],
    X5: [[2007, 2013], [2014, 2018], [2019, 2025]],
    X6: [[2008, 2014], [2015, 2019], [2020, 2025]],
  },
  "Mercedes-Benz": {
    "C-Class": [[2008, 2014], [2015, 2021], [2022, 2025]],
    "E-Class": [[2010, 2016], [2017, 2023], [2024, 2025]],
    "S-Class": [[2007, 2013], [2014, 2020], [2021, 2025]],
    GLE: [[2012, 2015], [2016, 2019], [2020, 2025]],
    GLC: [[2016, 2022], [2023, 2025]],
    "G-Class": [[2002, 2018], [2019, 2025]],
  },
  Volkswagen: {
    Passat: [[2011, 2019], [2020, 2023]],
    Golf: [[2013, 2020], [2021, 2025]],
    Tiguan: [[2009, 2017], [2018, 2024]],
    Touareg: [[2011, 2018], [2019, 2025]],
    Jetta: [[2011, 2018], [2019, 2024]],
  },
  Audi: {
    A4: [[2009, 2016], [2017, 2024]],
    A6: [[2012, 2018], [2019, 2025]],
    A8: [[2011, 2017], [2018, 2025]],
    Q5: [[2009, 2017], [2018, 2024]],
    Q7: [[2007, 2015], [2016, 2024]],
    Q8: [[2019, 2025]],
  },
  Porsche: {
    Cayenne: [[2011, 2017], [2018, 2024]],
    Macan: [[2015, 2024]],
    Panamera: [[2010, 2016], [2017, 2023]],
  },
  Opel: {
    Astra: [[2010, 2015], [2016, 2021]],
    Insignia: [[2009, 2017], [2018, 2022]],
    Corsa: [[2015, 2019], [2020, 2025]],
    Mokka: [[2013, 2019], [2021, 2025]],
  },

  // ── Chinese ──
  Chery: {
    "Tiggo 7": [[2016, 2020], [2021, 2025]],
    "Tiggo 8": [[2018, 2025]],
    "Arrizo 6": [[2018, 2025]],
  },
  Geely: {
    Coolray: [[2019, 2025]],
    Emgrand: [[2014, 2019], [2020, 2025]],
    Tugella: [[2020, 2025]],
    Monjaro: [[2022, 2025]],
  },
  Haval: {
    H6: [[2013, 2020], [2021, 2025]],
    Jolion: [[2021, 2025]],
    H9: [[2015, 2025]],
  },
  "Great Wall": {
    "Wingle 7": [[2019, 2025]],
    Poer: [[2020, 2025]],
  },
  BYD: {
    "Song Plus": [[2020, 2025]],
    "Qin Plus": [[2021, 2025]],
    Han: [[2020, 2025]],
    Tang: [[2018, 2025]],
  },
  MG: {
    MG5: [[2020, 2025]],
    ZS: [[2017, 2025]],
    HS: [[2018, 2025]],
    RX5: [[2016, 2025]],
  },
  JAC: {
    J7: [[2020, 2025]],
    S3: [[2014, 2021]],
    S4: [[2019, 2025]],
    T8: [[2018, 2025]],
  },
  Changan: {
    "CS35 Plus": [[2018, 2025]],
    "CS75 Plus": [[2019, 2025]],
    Eado: [[2013, 2019], [2020, 2025]],
    Alsvin: [[2019, 2025]],
  },
};

// "color" = requires paint color code
type PartSeed = { name: string; nameKu: string; nameAr: string; color?: true };
type SubSeed = { name: string; nameKu: string; nameAr: string; parts: PartSeed[] };

const partTaxonomy: {
  name: string;
  nameKu: string;
  nameAr: string;
  sortOrder: number;
  subs: SubSeed[];
}[] = [
  {
    name: "Exterior",
    nameKu: "دەرەوە",
    nameAr: "خارجي",
    sortOrder: 1,
    subs: [
      {
        name: "Bumpers",
        nameKu: "بامپەرەکان",
        nameAr: "الصدامات",
        parts: [
          { name: "Front Bumper", nameKu: "بامپەری پێشەوە", nameAr: "الصدام الأمامي", color: true },
          { name: "Rear Bumper", nameKu: "بامپەری دواوە", nameAr: "الصدام الخلفي", color: true },
        ],
      },
      {
        name: "Hood",
        nameKu: "کاپۆت",
        nameAr: "الكبوت",
        parts: [
          { name: "Hood", nameKu: "کاپۆت", nameAr: "الكبوت", color: true },
          { name: "Hood Hinge", nameKu: "مەفسەلەی کاپۆت", nameAr: "مفصلة الكبوت" },
        ],
      },
      {
        name: "Doors",
        nameKu: "دەرگاکان",
        nameAr: "الأبواب",
        parts: [
          {
            name: "Front Left Door",
            nameKu: "دەرگای پێشەوەی چەپ",
            nameAr: "الباب الأمامي الأيسر",
            color: true,
          },
          {
            name: "Front Right Door",
            nameKu: "دەرگای پێشەوەی ڕاست",
            nameAr: "الباب الأمامي الأيمن",
            color: true,
          },
          {
            name: "Rear Left Door",
            nameKu: "دەرگای دواوەی چەپ",
            nameAr: "الباب الخلفي الأيسر",
            color: true,
          },
          {
            name: "Rear Right Door",
            nameKu: "دەرگای دواوەی ڕاست",
            nameAr: "الباب الخلفي الأيمن",
            color: true,
          },
          { name: "Door Handle", nameKu: "دەسکی دەرگا", nameAr: "مقبض الباب", color: true },
        ],
      },
      {
        name: "Mirrors",
        nameKu: "ئاوێنەکان",
        nameAr: "المرايا",
        parts: [
          {
            name: "Left Side Mirror",
            nameKu: "ئاوێنەی لای چەپ",
            nameAr: "المرآة الجانبية اليسرى",
            color: true,
          },
          {
            name: "Right Side Mirror",
            nameKu: "ئاوێنەی لای ڕاست",
            nameAr: "المرآة الجانبية اليمنى",
            color: true,
          },
          { name: "Mirror Glass", nameKu: "شووشەی ئاوێنە", nameAr: "زجاج المرآة" },
        ],
      },
      {
        name: "Lights",
        nameKu: "چراکان",
        nameAr: "الإضاءة",
        parts: [
          {
            name: "Left Headlight",
            nameKu: "چرای پێشەوەی چەپ",
            nameAr: "المصباح الأمامي الأيسر",
          },
          {
            name: "Right Headlight",
            nameKu: "چرای پێشەوەی ڕاست",
            nameAr: "المصباح الأمامي الأيمن",
          },
          { name: "Left Taillight", nameKu: "چرای دواوەی چەپ", nameAr: "المصباح الخلفي الأيسر" },
          {
            name: "Right Taillight",
            nameKu: "چرای دواوەی ڕاست",
            nameAr: "المصباح الخلفي الأيمن",
          },
          { name: "Fog Light", nameKu: "چرای تەم", nameAr: "مصباح الضباب" },
        ],
      },
      {
        name: "Fenders",
        nameKu: "چامۆرلوغەکان",
        nameAr: "الرفارف",
        parts: [
          {
            name: "Front Left Fender",
            nameKu: "چامۆرلوغی پێشەوەی چەپ",
            nameAr: "الرفرف الأمامي الأيسر",
            color: true,
          },
          {
            name: "Front Right Fender",
            nameKu: "چامۆرلوغی پێشەوەی ڕاست",
            nameAr: "الرفرف الأمامي الأيمن",
            color: true,
          },
        ],
      },
    ],
  },
  {
    name: "Interior",
    nameKu: "ناوەوە",
    nameAr: "داخلي",
    sortOrder: 2,
    subs: [
      {
        name: "Seats",
        nameKu: "کورسییەکان",
        nameAr: "المقاعد",
        parts: [
          { name: "Driver Seat", nameKu: "کورسی شۆفێر", nameAr: "مقعد السائق" },
          { name: "Passenger Seat", nameKu: "کورسی سەرنشین", nameAr: "مقعد الراكب" },
          { name: "Rear Seat", nameKu: "کورسی دواوە", nameAr: "المقعد الخلفي" },
        ],
      },
      {
        name: "Dashboard",
        nameKu: "داشبۆرد",
        nameAr: "لوحة القيادة",
        parts: [
          { name: "Dashboard Panel", nameKu: "پانێلی داشبۆرد", nameAr: "واجهة الطبلون" },
          { name: "Instrument Cluster", nameKu: "تابلۆی گەیجەکان", nameAr: "لوحة العدادات" },
        ],
      },
      {
        name: "Panels",
        nameKu: "پانێلەکان",
        nameAr: "الألواح الداخلية",
        parts: [
          { name: "Door Panel", nameKu: "پانێلی دەرگا", nameAr: "بطانة الباب" },
          { name: "Center Console", nameKu: "کۆنسۆڵی ناوەڕاست", nameAr: "الكونسول الأوسط" },
        ],
      },
      {
        name: "AC Parts",
        nameKu: "پارچەکانی ئێرکۆندیشن",
        nameAr: "قطع التكييف",
        parts: [
          { name: "AC Compressor", nameKu: "کۆمپرێسەری ئێرکۆندیشن", nameAr: "ضاغط التكييف" },
          { name: "AC Vent", nameKu: "دەرچەی هەوا", nameAr: "فتحة التكييف" },
          { name: "Blower Motor", nameKu: "مۆتۆری بلۆوەر", nameAr: "موتور المروحة الداخلية" },
          { name: "Cabin Filter", nameKu: "فلتەری کابین", nameAr: "فلتر المكيف" },
        ],
      },
    ],
  },
  {
    name: "Engine",
    nameKu: "بزوێنەر",
    nameAr: "محرك",
    sortOrder: 3,
    subs: [
      {
        name: "Belts",
        nameKu: "قایشەکان",
        nameAr: "السيور",
        parts: [
          { name: "Timing Belt", nameKu: "قایشی تایمینگ", nameAr: "سير التايمنج" },
          { name: "Serpentine Belt", nameKu: "قایشی دینەمۆ", nameAr: "سير الدينمو" },
        ],
      },
      {
        name: "Filters",
        nameKu: "فلتەرەکان",
        nameAr: "الفلاتر",
        parts: [
          { name: "Oil Filter", nameKu: "فلتەری زەیت", nameAr: "فلتر الزيت" },
          { name: "Air Filter", nameKu: "فلتەری هەوا", nameAr: "فلتر الهواء" },
          { name: "Fuel Filter", nameKu: "فلتەری بەنزین", nameAr: "فلتر البنزين" },
        ],
      },
      {
        name: "Pumps",
        nameKu: "پۆمپەکان",
        nameAr: "المضخات",
        parts: [
          { name: "Water Pump", nameKu: "پۆمپی ئاو", nameAr: "مضخة الماء" },
          { name: "Fuel Pump", nameKu: "پۆمپی بەنزین", nameAr: "مضخة البنزين" },
          { name: "Oil Pump", nameKu: "پۆمپی زەیت", nameAr: "مضخة الزيت" },
        ],
      },
      {
        name: "Gaskets",
        nameKu: "گاسکێتەکان",
        nameAr: "الجوانات",
        parts: [
          { name: "Head Gasket", nameKu: "گاسکێتی سەری ماتۆر", nameAr: "جوان رأس المحرك" },
          {
            name: "Valve Cover Gasket",
            nameKu: "گاسکێتی قەپاغی ڤاڵڤەکان",
            nameAr: "جوان غطاء الصمامات",
          },
        ],
      },
      {
        name: "Cooling",
        nameKu: "ساردکردنەوە",
        nameAr: "التبريد",
        parts: [
          { name: "Radiator", nameKu: "ڕادیەتەر", nameAr: "الراديتر" },
          { name: "Radiator Fan", nameKu: "پانکەی ڕادیەتەر", nameAr: "مروحة الراديتر" },
          { name: "Thermostat", nameKu: "تێرمۆستات", nameAr: "الثرموستات" },
        ],
      },
      {
        name: "Ignition",
        nameKu: "داگیرساندن",
        nameAr: "الإشعال",
        parts: [
          { name: "Spark Plugs", nameKu: "بووژییەکان", nameAr: "البواجي" },
          { name: "Ignition Coil", nameKu: "کۆیلی داگیرساندن", nameAr: "كويل الإشعال" },
        ],
      },
    ],
  },
];

async function main() {
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      name: "Admin",
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
      role: "ADMIN",
    },
  });
  console.log(`Admin user: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  for (const [brandName, models] of Object.entries(vehicles)) {
    const brand = await prisma.brand.upsert({
      where: { name: brandName },
      update: {},
      create: { name: brandName },
    });
    for (const [modelName, ranges] of Object.entries(models)) {
      const model = await prisma.carModel.upsert({
        where: { brandId_name: { brandId: brand.id, name: modelName } },
        update: {},
        create: { brandId: brand.id, name: modelName },
      });
      for (const [startYear, endYear] of ranges) {
        await prisma.yearRange.upsert({
          where: {
            carModelId_startYear_endYear: { carModelId: model.id, startYear, endYear },
          },
          update: {},
          create: { carModelId: model.id, startYear, endYear },
        });
      }
    }
  }
  console.log("Vehicle taxonomy seeded.");

  for (const cat of partTaxonomy) {
    const category = await prisma.category.upsert({
      where: { name: cat.name },
      update: { nameKu: cat.nameKu, nameAr: cat.nameAr, sortOrder: cat.sortOrder },
      create: {
        name: cat.name,
        nameKu: cat.nameKu,
        nameAr: cat.nameAr,
        sortOrder: cat.sortOrder,
      },
    });
    for (const subSeed of cat.subs) {
      const sub = await prisma.subCategory.upsert({
        where: { categoryId_name: { categoryId: category.id, name: subSeed.name } },
        update: { nameKu: subSeed.nameKu, nameAr: subSeed.nameAr },
        create: {
          categoryId: category.id,
          name: subSeed.name,
          nameKu: subSeed.nameKu,
          nameAr: subSeed.nameAr,
        },
      });
      for (const part of subSeed.parts) {
        await prisma.part.upsert({
          where: { subCategoryId_name: { subCategoryId: sub.id, name: part.name } },
          update: {
            nameKu: part.nameKu,
            nameAr: part.nameAr,
            requiresColorCode: part.color === true,
          },
          create: {
            subCategoryId: sub.id,
            name: part.name,
            nameKu: part.nameKu,
            nameAr: part.nameAr,
            requiresColorCode: part.color === true,
          },
        });
      }
    }
  }
  console.log("Part taxonomy seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
