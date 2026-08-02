import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// Development-only credentials. These are public (this file is committed), so
// they are used ONLY to bootstrap an empty local database — see main().
const ADMIN_EMAIL = "admin@carparts.local";
const ADMIN_PASSWORD = "admin1234";

/*
  Business payment-receiving details come from the environment rather than this
  file, so real account numbers are never committed. When a variable is unset
  (a fresh clone, CI, a new developer) the seed writes a clearly-labelled
  placeholder instead — the app already detects those and shows a warning on
  the admin settings page and the customer payment screen, so nothing breaks
  and nobody mistakes them for real details. See .env.example.
*/
const PLACEHOLDER = "PLACEHOLDER — set before launch";
const fromEnv = (key: string) => process.env[key]?.trim() || PLACEHOLDER;

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

/*
  Indicative price ranges in USD, keyed by English part name. These are shown
  on the request form as "typical range" so a customer who is only price-
  checking gets an answer immediately — they are deliberately wide and are
  never a quote; the real number comes from the itemised quote.

  Applied only to parts that have no range yet, so anything an admin has since
  tuned in the parts screen is never overwritten. A part missing from this map
  simply shows no range.
*/
const PRICE_RANGES: Record<string, [number, number]> = {
  // Exterior — bumpers, hood, doors
  "Front Bumper": [80, 150],
  "Rear Bumper": [90, 320],
  Hood: [120, 260],
  "Hood Hinge": [15, 40],
  "Front Left Door": [180, 400],
  "Front Right Door": [180, 400],
  "Rear Left Door": [170, 380],
  "Rear Right Door": [170, 380],
  "Door Handle": [15, 45],
  // Exterior — mirrors, lights, fenders
  "Left Side Mirror": [45, 140],
  "Right Side Mirror": [45, 140],
  "Mirror Glass": [12, 35],
  "Left Headlight": [70, 260],
  "Right Headlight": [70, 260],
  "Left Taillight": [50, 180],
  "Right Taillight": [50, 180],
  "Fog Light": [25, 70],
  "Front Left Fender": [60, 150],
  "Front Right Fender": [60, 150],
  // Exterior — body kit & styling
  "Front Body Kit": [250, 700],
  "Rear Body Kit": [220, 650],
  Grille: [60, 220],
  "Mirror Covers": [30, 90],
  "Side Skirts": [120, 350],
  "Rear Diffuser": [90, 260],
  Spoiler: [80, 250],
  "Running Boards": [130, 380],
  // Interior
  "Driver Seat": [150, 450],
  "Passenger Seat": [140, 420],
  "Rear Seat": [180, 500],
  "Dashboard Panel": [200, 600],
  "Instrument Cluster": [120, 400],
  "Door Panel": [60, 180],
  "Center Console": [80, 260],
  "AC Compressor": [120, 350],
  "AC Vent": [10, 35],
  "Blower Motor": [45, 130],
  "Cabin Filter": [8, 25],
  // Engine
  "Timing Belt": [20, 70],
  "Serpentine Belt": [12, 40],
  "Oil Filter": [5, 20],
  "Air Filter": [8, 30],
  "Fuel Filter": [10, 35],
  "Water Pump": [30, 100],
  "Fuel Pump": [45, 160],
  "Oil Pump": [50, 170],
  "Head Gasket": [30, 110],
  "Valve Cover Gasket": [15, 50],
  Radiator: [60, 200],
  "Radiator Fan": [45, 150],
  Thermostat: [12, 40],
  "Spark Plugs": [15, 60],
  "Ignition Coil": [20, 80],
};

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
        nameKu: "بۆنیت",
        nameAr: "البونيت",
        parts: [
          { name: "Hood", nameKu: "بۆنیت", nameAr: "البونيت", color: true },
          { name: "Hood Hinge", nameKu: "مەفسەلەی بۆنیت", nameAr: "مفصلة البونيت" },
        ],
      },
      {
        // Doors are named by driver / passenger side rather than left / right:
        // that is how customers actually describe them, and it removes the
        // "is left the driver's side?" ambiguity. Iraq drives on the right,
        // so the driver's side is the LEFT side of the car — which is what the
        // English names below refer to.
        name: "Doors",
        nameKu: "دەرگاکان",
        nameAr: "الأبواب",
        parts: [
          {
            name: "Front Left Door",
            nameKu: "دەرگای سایەق",
            nameAr: "باب السائق",
            color: true,
          },
          {
            name: "Front Right Door",
            nameKu: "دەرگای سەکن",
            nameAr: "باب الراكب",
            color: true,
          },
          {
            name: "Rear Left Door",
            nameKu: "دەرگای پشتی سایەق",
            nameAr: "الباب الخلفي - جهة السائق",
            color: true,
          },
          {
            name: "Rear Right Door",
            nameKu: "دەرگای پشتی سەکن",
            nameAr: "الباب الخلفي - جهة الراكب",
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
            nameKu: "ئاوێنەی لای سایەق",
            nameAr: "مرآة جهة السائق",
            color: true,
          },
          {
            name: "Right Side Mirror",
            nameKu: "ئاوێنەی لای سەکن",
            nameAr: "مرآة جهة الراكب",
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
            nameKu: "چرای پێشەوەی لای سایەق",
            nameAr: "المصباح الأمامي - جهة السائق",
          },
          {
            name: "Right Headlight",
            nameKu: "چرای پێشەوەی لای سەکن",
            nameAr: "المصباح الأمامي - جهة الراكب",
          },
          {
            name: "Left Taillight",
            nameKu: "چرای دواوەی لای سایەق",
            nameAr: "المصباح الخلفي - جهة السائق",
          },
          {
            name: "Right Taillight",
            nameKu: "چرای دواوەی لای سەکن",
            nameAr: "المصباح الخلفي - جهة الراكب",
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
            nameKu: "چامۆرلوغی لای سایەق",
            nameAr: "الرفرف الأمامي - جهة السائق",
            color: true,
          },
          {
            name: "Front Right Fender",
            nameKu: "چامۆرلوغی لای سەکن",
            nameAr: "الرفرف الأمامي - جهة الراكب",
            color: true,
          },
        ],
      },
      {
        // Body-kit / styling upgrades. Like every other part in this taxonomy
        // these are not tied to a brand — Part belongs to a SubCategory only,
        // so all of these are selectable for any brand, model and year.
        name: "Body Kit & Styling",
        nameKu: "بۆدی کیت و جوانکاری",
        nameAr: "أطقم البودي والتزيين",
        parts: [
          { name: "Front Body Kit", nameKu: "بۆدی کیتی پێشەوە", nameAr: "طقم بودي أمامي", color: true },
          { name: "Rear Body Kit", nameKu: "بۆدی کیتی دواوە", nameAr: "طقم بودي خلفي", color: true },
          { name: "Grille", nameKu: "گریلی پێشەوە", nameAr: "شبك الصدام", color: true },
          { name: "Mirror Covers", nameKu: "قەپاغی ئاوێنەکان", nameAr: "أغطية المرايا", color: true },
          { name: "Side Skirts", nameKu: "سکێرتی تەنیشت", nameAr: "سكيرت جانبي", color: true },
          { name: "Rear Diffuser", nameKu: "دیفیوزەری دواوە", nameAr: "ديفيوزر خلفي", color: true },
          { name: "Spoiler", nameKu: "سپۆیلەر", nameAr: "سبويلر", color: true },
          { name: "Running Boards", nameKu: "پێپلیکانەی تەنیشت", nameAr: "مراقي جانبية" },
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
          { name: "Driver Seat", nameKu: "کورسی سایەق", nameAr: "مقعد السائق" },
          { name: "Passenger Seat", nameKu: "کورسی سەکن", nameAr: "مقعد الراكب" },
          { name: "Rear Seat", nameKu: "کورسی دواوە", nameAr: "المقعد الخلفي" },
        ],
      },
      {
        name: "Dashboard",
        nameKu: "داشبۆرد",
        nameAr: "الطبلون",
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
    nameKu: "ماتۆر",
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
  // Development-only convenience account, created ONLY when the database has
  // no admin at all (i.e. a fresh local setup). Never upsert unconditionally:
  // once a real admin exists with real credentials, re-running the seed must
  // not quietly re-add a second admin whose password is public in this file.
  const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (existingAdmin) {
    console.log("Admin already exists — skipping the development admin account.");
  } else {
    await prisma.user.create({
      data: {
        name: "Admin",
        email: ADMIN_EMAIL,
        passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
        role: "ADMIN",
      },
    });
    console.log(`Development admin created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    console.log("Change these before deploying anywhere reachable.");
  }

  // Payment receiving accounts — the business accounts customers are told to
  // send money to. These are not secrets: every customer is shown them on the
  // payment screen. Cash on delivery has no receiving account (collected in
  // person). Qi Card needs BOTH a card number and the registered phone, so it
  // uses the optional second field.
  const accountHolder = fromEnv("PAYMENT_ACCOUNT_HOLDER");
  const receivingAccounts = [
    {
      method: "FIB" as const,
      accountName: accountHolder,
      accountNumberOrPhone: fromEnv("PAYMENT_FIB_PHONE"),
      accountNumberOrPhone2: null,
    },
    {
      method: "FASTPAY" as const,
      accountName: accountHolder,
      accountNumberOrPhone: fromEnv("PAYMENT_FASTPAY_PHONE"),
      accountNumberOrPhone2: null,
    },
    {
      // Qi Card needs both the card number and the registered phone.
      method: "QICARD" as const,
      accountName: accountHolder,
      accountNumberOrPhone: fromEnv("PAYMENT_QICARD_NUMBER"),
      accountNumberOrPhone2: fromEnv("PAYMENT_QICARD_PHONE"),
    },
  ];
  for (const account of receivingAccounts) {
    await prisma.paymentReceivingAccount.upsert({
      where: { method: account.method },
      update: {}, // never clobber values an admin has edited in the settings UI
      create: account,
    });
  }
  console.log("Payment receiving accounts seeded.");

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
      // The spans above are each model's real production years; they are stored
      // as one row per individual year so customers pick an exact year instead
      // of a generation bracket. A 2019–2025 span becomes 7 rows.
      for (const [from, to] of ranges) {
        for (let year = from; year <= to; year++) {
          await prisma.yearRange.upsert({
            where: {
              carModelId_startYear_endYear: {
                carModelId: model.id,
                startYear: year,
                endYear: year,
              },
            },
            update: {},
            create: { carModelId: model.id, startYear: year, endYear: year },
          });
        }
      }
    }
  }
  console.log("Vehicle taxonomy seeded.");

  let rangesApplied = 0;
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
        const saved = await prisma.part.upsert({
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

        // Fill in the indicative range only when the part doesn't have one, so
        // ranges edited by an admin in the parts screen survive re-seeding.
        const range = PRICE_RANGES[part.name];
        if (range && saved.priceMinUsd === null && saved.priceMaxUsd === null) {
          await prisma.part.update({
            where: { id: saved.id },
            data: {
              priceMinUsd: range[0].toFixed(2),
              priceMaxUsd: range[1].toFixed(2),
            },
          });
          rangesApplied++;
        }
      }
    }
  }
  console.log(`Part taxonomy seeded (${rangesApplied} indicative price ranges applied).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
