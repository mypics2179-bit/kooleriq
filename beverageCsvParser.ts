import { BrandId, ContainerType, SkuItem } from '../types/kooleriq';

export const BEVERAGE_CSV_URL = '/assets/aistudio/Beverage_UPC_and_Wholesale_Costs_c60d447a.csv';

interface BrandVisualMeta {
  brand: BrandId;
  brandLabel: string;
  brandColor: string;
  primaryColor: string;
  secondaryColor: string;
  capColor: string;
  prefix: string;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundUnitCost(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function inferBrandVisuals(name: string): BrandVisualMeta {
  const lower = name.toLowerCase();

  if (lower.includes('java monster')) {
    return {
      brand: 'monster',
      brandLabel: 'Java Monster',
      brandColor: '#D97706',
      primaryColor: '#451A03',
      secondaryColor: '#D97706',
      capColor: '#78350F',
      prefix: 'JVM',
    };
  }
  if (lower.includes('monster')) {
    if (lower.includes('zero ultra') || lower.includes('white')) {
      return {
        brand: 'monster',
        brandLabel: 'Monster',
        brandColor: '#5AC500',
        primaryColor: '#E2E8F0',
        secondaryColor: '#5AC500',
        capColor: '#94A3B8',
        prefix: 'MNS',
      };
    }
    if (lower.includes('mango')) {
      return {
        brand: 'monster',
        brandLabel: 'Monster',
        brandColor: '#0284C7',
        primaryColor: '#0284C7',
        secondaryColor: '#F59E0B',
        capColor: '#0369A1',
        prefix: 'MNS',
      };
    }
    if (lower.includes('peachy') || lower.includes('orange') || lower.includes('sunrise')) {
      return {
        brand: 'monster',
        brandLabel: 'Monster',
        brandColor: '#F97316',
        primaryColor: '#1E293B',
        secondaryColor: '#F97316',
        capColor: '#FB923C',
        prefix: 'MNS',
      };
    }
    if (lower.includes('pacific') || lower.includes('rio') || lower.includes('berry')) {
      return {
        brand: 'monster',
        brandLabel: 'Monster',
        brandColor: '#E11D48',
        primaryColor: '#1E293B',
        secondaryColor: '#E11D48',
        capColor: '#FB7185',
        prefix: 'MNS',
      };
    }
    return {
      brand: 'monster',
      brandLabel: 'Monster',
      brandColor: '#5AC500',
      primaryColor: '#111827',
      secondaryColor: '#5AC500',
      capColor: '#1F2937',
      prefix: 'MNS',
    };
  }
  if (lower.includes('diet coke')) {
    return {
      brand: 'coca-cola',
      brandLabel: 'Coca-Cola',
      brandColor: '#E41E2B',
      primaryColor: '#CBD5E1',
      secondaryColor: '#E41E2B',
      capColor: '#94A3B8',
      prefix: 'COK',
    };
  }
  if (lower.includes('zero sugar') && lower.includes('coca-cola')) {
    return {
      brand: 'coca-cola',
      brandLabel: 'Coca-Cola',
      brandColor: '#E41E2B',
      primaryColor: '#18181B',
      secondaryColor: '#E41E2B',
      capColor: '#18181B',
      prefix: 'COK',
    };
  }
  if (lower.includes('coca-cola') || lower.includes('cherry coke') || lower.includes('coke fountain')) {
    return {
      brand: 'coca-cola',
      brandLabel: 'Coca-Cola',
      brandColor: '#E41E2B',
      primaryColor: '#DC2626',
      secondaryColor: '#FFFFFF',
      capColor: '#EF4444',
      prefix: 'COK',
    };
  }
  if (lower.includes('sprite')) {
    return {
      brand: 'sprite',
      brandLabel: 'Sprite',
      brandColor: '#16A34A',
      primaryColor: '#16A34A',
      secondaryColor: '#FDE047',
      capColor: '#22C55E',
      prefix: 'SPR',
    };
  }
  if (lower.includes('fanta')) {
    const isStrawberry = lower.includes('strawberry');
    return {
      brand: 'fanta',
      brandLabel: 'Fanta',
      brandColor: isStrawberry ? '#E11D48' : '#F97316',
      primaryColor: isStrawberry ? '#E11D48' : '#F97316',
      secondaryColor: '#FFFFFF',
      capColor: isStrawberry ? '#BE123C' : '#EA580C',
      prefix: 'FNT',
    };
  }
  if (lower.includes('squirt')) {
    return {
      brand: 'squirt',
      brandLabel: 'Squirt',
      brandColor: '#84CC16',
      primaryColor: '#BEF264',
      secondaryColor: '#15803D',
      capColor: '#65A30D',
      prefix: 'SQR',
    };
  }
  if (lower.includes('pepsi')) {
    const isCherry = lower.includes('cherry');
    return {
      brand: 'pepsi',
      brandLabel: 'Pepsi',
      brandColor: '#004B93',
      primaryColor: isCherry ? '#7F1D1D' : '#004B93',
      secondaryColor: '#E11D48',
      capColor: '#004B93',
      prefix: 'PEP',
    };
  }
  if (lower.includes('mountain dew') || lower.includes('mtn dew')) {
    const isBaja = lower.includes('baja');
    const isCodeRed = lower.includes('code red');
    const isVoltage = lower.includes('voltage');
    return {
      brand: 'mtn-dew',
      brandLabel: 'Mtn Dew',
      brandColor: '#65A30D',
      primaryColor: isBaja
        ? '#0D9488'
        : isCodeRed
          ? '#B91C1C'
          : isVoltage
            ? '#1D4ED8'
            : '#65A30D',
      secondaryColor: '#BEF264',
      capColor: '#4D7C0F',
      prefix: 'DEW',
    };
  }
  if (lower.includes('dr pepper')) {
    return {
      brand: 'dr-pepper',
      brandLabel: 'Dr Pepper',
      brandColor: '#7F1D1D',
      primaryColor: '#7F1D1D',
      secondaryColor: '#FDE68A',
      capColor: '#991B1B',
      prefix: 'DRP',
    };
  }
  if (lower.includes('schweppes')) {
    return {
      brand: 'schweppes',
      brandLabel: 'Schweppes',
      brandColor: '#CA8A04',
      primaryColor: '#EAB308',
      secondaryColor: '#1E293B',
      capColor: '#CA8A04',
      prefix: 'SCH',
    };
  }
  if (lower.includes('nos energy')) {
    return {
      brand: 'nos',
      brandLabel: 'NOS',
      brandColor: '#0284C7',
      primaryColor: '#0369A1',
      secondaryColor: '#F97316',
      capColor: '#0284C7',
      prefix: 'NOS',
    };
  }
  if (lower.includes('reign')) {
    return {
      brand: 'reign',
      brandLabel: 'Reign',
      brandColor: '#F59E0B',
      primaryColor: '#0F172A',
      secondaryColor: lower.includes('storm') ? '#10B981' : '#F59E0B',
      capColor: '#334155',
      prefix: 'RGN',
    };
  }
  if (lower.includes('bang')) {
    return {
      brand: 'bang',
      brandLabel: 'Bang',
      brandColor: '#EC4899',
      primaryColor: '#1E1B4B',
      secondaryColor: lower.includes('blue') ? '#0EA5E9' : '#EC4899',
      capColor: '#312E81',
      prefix: 'BNG',
    };
  }
  if (lower.includes('rockstar')) {
    return {
      brand: 'rockstar',
      brandLabel: 'Rockstar',
      brandColor: '#EAB308',
      primaryColor: '#18181B',
      secondaryColor: lower.includes('punched')
        ? '#DC2626'
        : lower.includes('sugar free')
          ? '#CBD5E1'
          : '#EAB308',
      capColor: '#27272A',
      prefix: 'RCK',
    };
  }
  if (lower.includes('celsius')) {
    return {
      brand: 'celsius',
      brandLabel: 'Celsius',
      brandColor: '#FF6A39',
      primaryColor: '#F8FAFC',
      secondaryColor: lower.includes('kiwi')
        ? '#84CC16'
        : lower.includes('berry') || lower.includes('astro')
          ? '#6366F1'
          : '#FF6A39',
      capColor: '#FDBA74',
      prefix: 'CEL',
    };
  }
  if (lower.includes('starbucks')) {
    return {
      brand: 'starbucks',
      brandLabel: 'Starbucks',
      brandColor: '#10B981',
      primaryColor: lower.includes('doubleshot') ? '#27272A' : '#5C3A21',
      secondaryColor: lower.includes('doubleshot') ? '#D97706' : '#10B981',
      capColor: '#1E293B',
      prefix: 'SBX',
    };
  }
  if (lower.includes('core power')) {
    return {
      brand: 'core-power',
      brandLabel: 'Core Power',
      brandColor: '#0EA5E9',
      primaryColor: lower.includes('vanilla') ? '#E2E8F0' : '#1E293B',
      secondaryColor: lower.includes('strawberry') ? '#EC4899' : '#0284C7',
      capColor: '#0369A1',
      prefix: 'CPR',
    };
  }
  if (lower.includes('fairlife')) {
    return {
      brand: 'fairlife',
      brandLabel: 'Fairlife',
      brandColor: '#0284C7',
      primaryColor: lower.includes('chocolate')
        ? '#5C3A21'
        : lower.includes('strawberry')
          ? '#F43F5E'
          : '#F8FAFC',
      secondaryColor: '#0284C7',
      capColor: '#0284C7',
      prefix: 'FRL',
    };
  }
  if (lower.includes('muscle milk')) {
    return {
      brand: 'muscle-milk',
      brandLabel: 'Muscle Milk',
      brandColor: '#64748B',
      primaryColor: '#1E293B',
      secondaryColor: '#94A3B8',
      capColor: '#0F172A',
      prefix: 'MMK',
    };
  }
  if (lower.includes('powerade')) {
    return {
      brand: 'powerade',
      brandLabel: 'Powerade',
      brandColor: '#0284C7',
      primaryColor: lower.includes('fruit punch') || lower.includes('cherry')
        ? '#DC2626'
        : lower.includes('lemon') || lower.includes('green')
          ? '#65A30D'
          : lower.includes('grape')
            ? '#7C3AED'
            : '#0284C7',
      secondaryColor: '#0F172A',
      capColor: '#1E293B',
      prefix: 'PWR',
    };
  }
  if (lower.includes('bodyarmor')) {
    return {
      brand: 'bodyarmor',
      brandLabel: 'BodyArmor',
      brandColor: '#E11D48',
      primaryColor: lower.includes('blue')
        ? '#0284C7'
        : lower.includes('orange') || lower.includes('tropical')
          ? '#F97316'
          : lower.includes('pineapple')
            ? '#EAB308'
            : '#E11D48',
      secondaryColor: '#FFFFFF',
      capColor: '#1E293B',
      prefix: 'BDA',
    };
  }
  if (lower.includes('gatorade') || lower.includes('gatorlyte')) {
    return {
      brand: 'gatorade',
      brandLabel: 'Gatorade',
      brandColor: '#F97316',
      primaryColor: lower.includes('glacier')
        ? '#7DD3FC'
        : lower.includes('fruit') || lower.includes('strawberry')
          ? '#DC2626'
          : lower.includes('lemon') || lower.includes('cucumber')
            ? '#65A30D'
            : lower.includes('grape')
              ? '#7C3AED'
              : '#0EA5E9',
      secondaryColor: '#F97316',
      capColor: '#F97316',
      prefix: 'GAT',
    };
  }
  if (lower.includes('dasani')) {
    return {
      brand: 'dasani',
      brandLabel: 'Dasani',
      brandColor: '#0EA5E9',
      primaryColor: '#BAE6FD',
      secondaryColor: '#0284C7',
      capColor: '#0284C7',
      prefix: 'DSN',
    };
  }
  if (lower.includes('smartwater')) {
    return {
      brand: 'smartwater',
      brandLabel: 'Smartwater',
      brandColor: '#38BDF8',
      primaryColor: '#E0F2FE',
      secondaryColor: '#0369A1',
      capColor: '#0284C7',
      prefix: 'SMW',
    };
  }
  if (lower.includes('aquafina')) {
    return {
      brand: 'aquafina',
      brandLabel: 'Aquafina',
      brandColor: '#0284C7',
      primaryColor: '#DBEAFE',
      secondaryColor: '#1D4ED8',
      capColor: '#1D4ED8',
      prefix: 'AQF',
    };
  }
  if (lower.includes('vitaminwater')) {
    return {
      brand: 'vitaminwater',
      brandLabel: 'Vitaminwater',
      brandColor: '#EC4899',
      primaryColor: lower.includes('energy')
        ? '#FACC15'
        : lower.includes('power-c')
          ? '#F97316'
          : lower.includes('refresh')
            ? '#FB7185'
            : '#BE185D',
      secondaryColor: '#FFFFFF',
      capColor: '#F8FAFC',
      prefix: 'VTW',
    };
  }
  if (lower.includes('propel')) {
    return {
      brand: 'propel',
      brandLabel: 'Propel',
      brandColor: '#8B5CF6',
      primaryColor: '#EDE9FE',
      secondaryColor: '#7C3AED',
      capColor: '#7C3AED',
      prefix: 'PRL',
    };
  }
  if (lower.includes('peace tea')) {
    return {
      brand: 'peace-tea',
      brandLabel: 'Peace Tea',
      brandColor: '#FB923C',
      primaryColor: lower.includes('peachy') ? '#FDBA74' : '#FDE047',
      secondaryColor: '#0F172A',
      capColor: '#EA580C',
      prefix: 'PCT',
    };
  }
  if (lower.includes('lipton')) {
    return {
      brand: 'lipton',
      brandLabel: 'Lipton',
      brandColor: '#CA8A04',
      primaryColor: '#B45309',
      secondaryColor: '#FACC15',
      capColor: '#78350F',
      prefix: 'LPT',
    };
  }
  if (lower.includes('naked')) {
    return {
      brand: 'naked',
      brandLabel: 'Naked Juice',
      brandColor: '#16A34A',
      primaryColor: '#15803D',
      secondaryColor: '#BEF264',
      capColor: '#14532D',
      prefix: 'NKD',
    };
  }

  return {
    brand: 'custom',
    brandLabel: name.split(' ')[0] || 'Beverage',
    brandColor: '#0284C7',
    primaryColor: '#1E293B',
    secondaryColor: '#0284C7',
    capColor: '#0284C7',
    prefix: 'BEV',
  };
}

function inferContainerType(sizePack: string, category: string): ContainerType {
  const lower = sizePack.toLowerCase();
  if (lower.includes('glass')) return 'glass-bottle';
  if (lower.includes('bottle') || lower.includes('liter')) return 'bottle';
  if (category.toLowerCase().includes('fountain')) return 'can';
  if (
    lower.includes('16 oz') ||
    lower.includes('19.2 oz') ||
    lower.includes('18.6 oz') ||
    lower.includes('23 oz') ||
    lower.includes('15.5 oz') ||
    lower.includes('15 oz') ||
    lower.includes('12 oz')
  ) {
    return 'tall-can';
  }
  return 'can';
}

function makeShortName(name: string, sizePack: string): string {
  const cleaned = name
    .replace(/Monster Energy /i, 'Mns ')
    .replace(/Monster Juice /i, 'Mns ')
    .replace(/Monster Reserve /i, 'Mns ')
    .replace(/Monster Ultra /i, 'Mns Ultra ')
    .replace(/Monster Rehab /i, 'Mns Rehab ')
    .replace(/Java Monster /i, 'Java ')
    .replace(/Reign Total Body Fuel /i, 'Reign ')
    .replace(/Reign Storm /i, 'Storm ')
    .replace(/Bang Energy /i, 'Bang ')
    .replace(/Starbucks Frappuccino Lite /i, 'SBX Lite ')
    .replace(/Starbucks Frappuccino /i, 'SBX Frap ')
    .replace(/Starbucks Doubleshot Energy /i, 'SBX DS ')
    .replace(/Starbucks Doubleshot /i, 'SBX ')
    .replace(/Mountain Dew /i, 'Dew ')
    .replace(/Mtn Dew /i, 'Dew ')
    .replace(/BodyArmor /i, 'BA ')
    .replace(/Gatorade /i, 'Gat ')
    .replace(/Powerade /i, 'Pwr ')
    .replace(/Vitaminwater /i, 'VW ')
    .replace(/Smartwater /i, 'Smart ')
    .replace(/Lipton Pure Leaf /i, 'PureLeaf ')
    .replace(/Core Power Elite /i, 'CPE ')
    .replace(/Core Power /i, 'CP ')
    .replace(/Coca-Cola /i, 'Coke ')
    .trim();

  if (sizePack.includes('12-Pack') || name.includes('12-Pack')) {
    return `${cleaned.slice(0, 12)} 12pk`.trim();
  }
  return cleaned.slice(0, 15);
}

// Match core initial SKUs that already exist in mockStoreData.ts so active planogram doors gain real UPCs & wholesale costs
function findExistingMatchKey(
  name: string,
  sizePack: string,
  existingCatalog: Record<string, SkuItem>
): string | null {
  const n = name.toLowerCase();
  const s = sizePack.toLowerCase();

  const candidatePairs: Array<[string, boolean]> = [
    ['sku-coke-orig', n === 'coca-cola classic' && s === '20 oz bottle'],
    ['sku-diet-coke', n === 'diet coke' && s === '20 oz bottle'],
    ['sku-coke-zero', n === 'coca-cola zero sugar' && s === '20 oz bottle'],
    ['sku-monster-zero', n === 'monster energy zero ultra' && s === '16 oz can'],
    ['sku-monster-mango', n === 'monster juice mango loco' && s === '16 oz can'],
    ['sku-celsius-kiwi', n === 'celsius sparkling kiwi guava' && s === '12 oz can'],
    ['sku-gatorade-cool', n === 'gatorade cool blue' && s === '28 oz bottle'],
    ['sku-gatorade-glacier', n === 'gatorade glacier freeze' && s === '28 oz bottle'],
    ['sku-corepower-choc', n === 'core power chocolate (26g)' && s === '14 oz bottle'],
  ];

  for (const [key, matched] of candidatePairs) {
    if (matched && existingCatalog[key]) {
      return key;
    }
  }
  return null;
}

export function parseBeverageCsv(
  csvText: string,
  existingCatalog: Record<string, SkuItem>
): Record<string, SkuItem> {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= 1) return existingCatalog;

  const nextCatalog: Record<string, SkuItem> = {};
  for (const k of Object.keys(existingCatalog)) {
    nextCatalog[k] = { ...existingCatalog[k] };
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 11) continue;

    const [
      productDesc,
      distributor,
      category,
      sizePack,
      unitsPerCaseRaw,
      upcRaw,
      materialSkuRaw,
      grossCasePriceRaw,
      caseDiscountRaw,
      netCaseCostRaw,
      netUnitCostRaw,
      suggestedRetailRaw,
      estMarginRaw,
      invoiceSourceRaw,
    ] = cols;

    if (!productDesc) continue;

    const unitsPerCase = Math.max(1, parseInt(unitsPerCaseRaw, 10) || 12);
    const grossCasePrice = roundMoney(parseFloat(grossCasePriceRaw) || 0);
    const caseDiscount = roundMoney(parseFloat(caseDiscountRaw) || 0);
    const netCaseCost = roundMoney(parseFloat(netCaseCostRaw) || 0);
    const netUnitCost = roundUnitCost(parseFloat(netUnitCostRaw) || netCaseCost / unitsPerCase);

    const parsedRetail = parseFloat(suggestedRetailRaw);
    const isBib = category.toLowerCase().includes('fountain') || sizePack.toLowerCase().includes('bib');

    let price: number;
    if (!Number.isNaN(parsedRetail) && parsedRetail > 0) {
      price = roundMoney(parsedRetail);
    } else if (isBib) {
      price = roundMoney(netUnitCost);
    } else {
      // Realistic c-store single-serve target (~39% gross margin, ending in .x9)
      const target = Math.max(1.49, netUnitCost / 0.61);
      price = roundMoney(Math.floor(target * 10) / 10 + 0.09);
    }

    const parsedMargin = parseFloat(estMarginRaw);
    let marginPct: number;
    if (!Number.isNaN(parsedMargin) && parsedMargin > 0) {
      marginPct = Math.round(parsedMargin * 1000) / 10;
    } else if (price > 0 && !isBib && price > netUnitCost) {
      marginPct = Math.round(((price - netUnitCost) / price) * 1000) / 10;
    } else {
      marginPct = 0;
    }

    const upcClean = upcRaw || `ROW-${i}`;
    const materialSku = materialSkuRaw || undefined;
    const invoiceSource = invoiceSourceRaw || undefined;
    const visual = inferBrandVisuals(productDesc);
    const containerType = inferContainerType(sizePack, category);

    const matchKey = findExistingMatchKey(productDesc, sizePack, nextCatalog);
    if (matchKey) {
      const existing = nextCatalog[matchKey];
      nextCatalog[matchKey] = {
        ...existing,
        upc: upcClean,
        distributor,
        category,
        materialSku,
        unitsPerCase,
        grossCasePrice,
        caseDiscount,
        netCaseCost,
        netUnitCost,
        invoiceSource,
        price: !Number.isNaN(parsedRetail) && parsedRetail > 0 ? price : existing.price,
        marginPct: marginPct > 0 ? marginPct : existing.marginPct,
      };
      continue;
    }

    const sanitizedUpc = upcClean.replace(/[^a-zA-Z0-9]/g, 'X');
    const id = `csv-${sanitizedUpc}-${unitsPerCase}-${i}`;
    const existingItem = nextCatalog[id];

    const upcTail = sanitizedUpc.slice(-4).padStart(4, '0');
    const skuCode = materialSku ? `SW-${materialSku}` : `${visual.prefix}-${upcTail}`;

    nextCatalog[id] = {
      id,
      skuCode,
      name: `${productDesc} (${sizePack})`.replace(/\s+\(12-Pack\)\s+\(12 oz/i, ' (12 oz'),
      shortName: makeShortName(productDesc, sizePack),
      brand: visual.brand,
      brandLabel: visual.brandLabel,
      brandColor: visual.brandColor,
      size: sizePack,
      containerType,
      price,
      weeklyVelocity: existingItem?.weeklyVelocity ?? (category.includes('Energy') ? 38 : category.includes('Core Sparkling') ? 44 : 30),
      marginPct,
      backroomQty: existingItem?.backroomQty ?? unitsPerCase,
      parLevel: existingItem?.parLevel ?? unitsPerCase * 2,
      primaryColor: visual.primaryColor,
      secondaryColor: visual.secondaryColor,
      capColor: visual.capColor,
      upc: upcClean,
      distributor,
      category,
      materialSku,
      unitsPerCase,
      grossCasePrice,
      caseDiscount,
      netCaseCost,
      netUnitCost,
      invoiceSource,
    };
  }

  return nextCatalog;
}

export interface CsvImportPreviewRow {
  rowNumber: number;
  name: string;
  distributor: string;
  category: string;
  size: string;
  upc: string;
  netCaseCost: number | null;
  netUnitCost: number | null;
  retailPrice: number;
  status: 'update' | 'new';
}

export interface CsvImportPreviewResult {
  detectedFormat: 'distributor-14col' | 'flexible-headers' | 'empty';
  totalRows: number;
  matchedExistingCount: number;
  newSkuCount: number;
  warnings: string[];
  previewRows: CsvImportPreviewRow[];
  parsedCatalog: Record<string, SkuItem>;
  newSkuIds: string[];
}

export function previewCsvImport(
  csvText: string,
  existingCatalog: Record<string, SkuItem>
): CsvImportPreviewResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length <= 1) {
    return {
      detectedFormat: 'empty',
      totalRows: 0,
      matchedExistingCount: 0,
      newSkuCount: 0,
      warnings: ['CSV file appears empty or missing data rows below the header.'],
      previewRows: [],
      parsedCatalog: existingCatalog,
      newSkuIds: [],
    };
  }

  const headerCols = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const isDistributor14Col =
    headerCols.length >= 11 &&
    (headerCols[0].includes('product') || headerCols[0].includes('description')) &&
    (headerCols.some((h) => h.includes('upc')) || headerCols.some((h) => h.includes('net case')));

  if (isDistributor14Col) {
    const parsedCatalog = parseBeverageCsv(csvText, existingCatalog);
    const existingKeys = new Set(Object.keys(existingCatalog));
    const newSkuIds = Object.keys(parsedCatalog).filter((k) => !existingKeys.has(k));
    const previewRows: CsvImportPreviewRow[] = [];
    let matchedExistingCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length < 11 || !cols[0]) continue;
      const [
        productDesc,
        distributor,
        category,
        sizePack,
        unitsPerCaseRaw,
        upcRaw,
        ,
        ,
        ,
        netCaseCostRaw,
        netUnitCostRaw,
        suggestedRetailRaw,
      ] = cols;
      const unitsPerCase = Math.max(1, parseInt(unitsPerCaseRaw, 10) || 12);
      const upcClean = upcRaw || `ROW-${i}`;
      const matchKey = findExistingMatchKey(productDesc, sizePack, existingCatalog);
      const sanitizedUpc = upcClean.replace(/[^a-zA-Z0-9]/g, 'X');
      const genId = `csv-${sanitizedUpc}-${unitsPerCase}-${i}`;
      const isUpdate = Boolean(matchKey) || existingKeys.has(genId);
      if (isUpdate) matchedExistingCount++;
      const matchedItem = parsedCatalog[matchKey || genId];

      previewRows.push({
        rowNumber: i,
        name: productDesc,
        distributor: distributor || 'Direct',
        category: category || 'Beverage',
        size: sizePack || 'Single',
        upc: upcClean,
        netCaseCost: parseFloat(netCaseCostRaw) || null,
        netUnitCost: parseFloat(netUnitCostRaw) || null,
        retailPrice: matchedItem?.price ?? (parseFloat(suggestedRetailRaw) || 2.99),
        status: isUpdate ? 'update' : 'new',
      });
    }

    return {
      detectedFormat: 'distributor-14col',
      totalRows: previewRows.length,
      matchedExistingCount,
      newSkuCount: newSkuIds.length,
      warnings: [],
      previewRows: previewRows.slice(0, 60),
      parsedCatalog,
      newSkuIds,
    };
  }

  // Flexible header-mapped CSV importer (supports custom product/UPC/retail exports or store sheets)
  const findCol = (patterns: string[]) =>
    headerCols.findIndex((h) => patterns.some((p) => h.includes(p)));

  const nameIdx = findCol(['sku name', 'product', 'name', 'beverage', 'description', 'item']);
  const upcIdx = findCol(['upc', 'barcode', 'gtin', 'ean']);
  const distIdx = findCol(['distributor', 'supplier', 'vendor']);
  const catIdx = findCol(['category', 'type', 'group']);
  const sizeIdx = findCol(['size', 'pack', 'oz']);
  const priceIdx = findCol(['retail', 'price', 'msrp']);
  const costIdx = findCol(['unit cost', 'net unit', 'cost']);
  const caseCostIdx = findCol(['case cost', 'net case']);
  const unitsIdx = findCol(['units/case', 'case pack', 'units per case', 'pack qty']);
  const backroomIdx = findCol(['backroom', 'stock', 'qty', 'inventory']);
  const skuCodeIdx = findCol(['sku code', 'material', 'sku #', 'sku']);

  const warnings: string[] = [];
  if (nameIdx === -1) {
    warnings.push('Could not find a Product / SKU Name column — using Column 1 as product name.');
  }

  const nextCatalog: Record<string, SkuItem> = {};
  for (const k of Object.keys(existingCatalog)) {
    nextCatalog[k] = { ...existingCatalog[k] };
  }

  const upcToKey = new Map<string, string>();
  Object.values(nextCatalog).forEach((s) => {
    if (s.upc) upcToKey.set(s.upc.trim(), s.id);
    upcToKey.set(s.skuCode.trim().toLowerCase(), s.id);
  });

  const previewRows: CsvImportPreviewRow[] = [];
  const newSkuIds: string[] = [];
  let matchedExistingCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const rawName = (nameIdx >= 0 ? cols[nameIdx] : cols[0])?.trim();
    if (!rawName) continue;

    const upc = upcIdx >= 0 ? (cols[upcIdx] || '').trim() : '';
    const skuCodeRaw = skuCodeIdx >= 0 ? (cols[skuCodeIdx] || '').trim() : '';
    const distributor = distIdx >= 0 ? (cols[distIdx] || 'Direct').trim() : 'Direct';
    const category = catIdx >= 0 ? (cols[catIdx] || 'Beverage').trim() : 'Beverage';
    const size = sizeIdx >= 0 ? (cols[sizeIdx] || '16 oz').trim() : '16 oz';
    const unitsPerCase =
      unitsIdx >= 0 ? Math.max(1, parseInt(cols[unitsIdx], 10) || 12) : 12;
    const netUnitCostRaw = costIdx >= 0 ? parseFloat(cols[costIdx]) : NaN;
    const netCaseCostRaw = caseCostIdx >= 0 ? parseFloat(cols[caseCostIdx]) : NaN;
    const retailRaw = priceIdx >= 0 ? parseFloat(cols[priceIdx]) : NaN;
    const backroomRaw = backroomIdx >= 0 ? parseInt(cols[backroomIdx], 10) : NaN;

    const unitCost = !Number.isNaN(netUnitCostRaw)
      ? roundUnitCost(netUnitCostRaw)
      : !Number.isNaN(netCaseCostRaw)
        ? roundUnitCost(netCaseCostRaw / unitsPerCase)
        : undefined;
    const caseCost = !Number.isNaN(netCaseCostRaw)
      ? roundMoney(netCaseCostRaw)
      : typeof unitCost === 'number'
        ? roundMoney(unitCost * unitsPerCase)
        : undefined;
    const price =
      !Number.isNaN(retailRaw) && retailRaw > 0
        ? roundMoney(retailRaw)
        : typeof unitCost === 'number' && unitCost > 0
          ? roundMoney(Math.max(1.49, unitCost / 0.61))
          : 2.99;
    const marginPct =
      typeof unitCost === 'number' && price > unitCost
        ? Math.round(((price - unitCost) / price) * 1000) / 10
        : 40;

    const existingId =
      (upc && upcToKey.get(upc)) ||
      (skuCodeRaw && upcToKey.get(skuCodeRaw.toLowerCase())) ||
      findExistingMatchKey(rawName, size, nextCatalog);

    if (existingId && nextCatalog[existingId]) {
      const prev = nextCatalog[existingId];
      nextCatalog[existingId] = {
        ...prev,
        upc: upc || prev.upc,
        distributor: distributor || prev.distributor,
        category: category || prev.category,
        price,
        marginPct,
        unitsPerCase,
        netUnitCost: unitCost ?? prev.netUnitCost,
        netCaseCost: caseCost ?? prev.netCaseCost,
        backroomQty: !Number.isNaN(backroomRaw) ? Math.max(0, backroomRaw) : prev.backroomQty,
      };
      matchedExistingCount++;
      previewRows.push({
        rowNumber: i,
        name: rawName,
        distributor,
        category,
        size,
        upc: upc || prev.upc || prev.skuCode,
        netCaseCost: caseCost ?? null,
        netUnitCost: unitCost ?? null,
        retailPrice: price,
        status: 'update',
      });
    } else {
      const visual = inferBrandVisuals(rawName);
      const containerType = inferContainerType(size, category);
      const safeUpc = (upc || skuCodeRaw || `IMP-${i}`).replace(/[^a-zA-Z0-9]/g, 'X');
      const id = `csv-imp-${safeUpc}-${i}-${Date.now().toString().slice(-4)}`;
      const skuCode =
        skuCodeRaw || `${visual.prefix}-${safeUpc.slice(-4).padStart(4, '0')}`;

      nextCatalog[id] = {
        id,
        skuCode,
        name: rawName.includes('(') ? rawName : `${rawName} (${size})`,
        shortName: makeShortName(rawName, size),
        brand: visual.brand,
        brandLabel: visual.brandLabel,
        brandColor: visual.brandColor,
        size,
        containerType,
        price,
        weeklyVelocity: 32,
        marginPct,
        backroomQty: !Number.isNaN(backroomRaw) ? Math.max(0, backroomRaw) : unitsPerCase,
        parLevel: unitsPerCase * 2,
        primaryColor: visual.primaryColor,
        secondaryColor: visual.secondaryColor,
        capColor: visual.capColor,
        upc: upc || undefined,
        distributor,
        category,
        unitsPerCase,
        netCaseCost: caseCost,
        netUnitCost: unitCost,
      };
      newSkuIds.push(id);
      if (upc) upcToKey.set(upc, id);
      previewRows.push({
        rowNumber: i,
        name: rawName,
        distributor,
        category,
        size,
        upc: upc || skuCode,
        netCaseCost: caseCost ?? null,
        netUnitCost: unitCost ?? null,
        retailPrice: price,
        status: 'new',
      });
    }
  }

  return {
    detectedFormat: 'flexible-headers',
    totalRows: previewRows.length,
    matchedExistingCount,
    newSkuCount: newSkuIds.length,
    warnings,
    previewRows: previewRows.slice(0, 60),
    parsedCatalog: nextCatalog,
    newSkuIds,
  };
}

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateImportTemplateCsv(): string {
  const headers = [
    'Product Description',
    'Distributor',
    'Category',
    'Size / Pack',
    'Units/Case',
    'UPC Barcode',
    'Material / SKU #',
    'Net Case Cost ($)',
    'Net Unit Cost ($)',
    'Suggested Retail ($)',
    'Backroom Qty',
  ];
  const sampleRows = [
    [
      'Coca-Cola Classic',
      'Swire Coca-Cola',
      'Core Sparkling',
      '20 oz Bottle',
      24,
      '049000000443',
      '102488',
      '29.76',
      '1.24',
      '2.49',
      48,
    ],
    [
      'Celsius Sparkling Peach Vibe',
      'PepsiCo',
      'Energy & Performance',
      '12 oz Can',
      12,
      '889392014075',
      'CEL-PV12',
      '18.96',
      '1.58',
      '2.99',
      24,
    ],
  ];
  return [
    headers.map(escapeCsvCell).join(','),
    ...sampleRows.map((row) => row.map(escapeCsvCell).join(',')),
  ].join('\n');
}

export function generatePlanogramCsv(
  doors: import('../types/kooleriq').CoolerDoor[],
  skuCatalog: Record<string, SkuItem>,
  settings: import('../types/kooleriq').StoreSettings
): string {
  const header = [
    'Store',
    'Store Code',
    'Door',
    'Slot',
    'SKU Code',
    'UPC Barcode',
    'Distributor',
    'Category',
    'SKU Name',
    'Current Depth',
    'Max Depth',
    'Status',
    'Units/Case',
    'Net Unit Cost ($)',
    'Net Case Cost ($)',
    'Retail Price ($)',
    'Est Margin %',
  ]
    .map(escapeCsvCell)
    .join(',');

  const fallback = Object.values(skuCatalog)[0];
  const rows = doors.flatMap((door) =>
    door.shelves.flat().map((s) => {
      const sku = skuCatalog[s.skuId] ?? fallback;
      return [
        settings.storeName,
        settings.storeCode,
        `Door ${door.number}`,
        s.coord,
        sku?.skuCode ?? '',
        sku?.upc ?? '',
        sku?.distributor ?? 'Direct',
        sku?.category ?? sku?.brandLabel ?? '',
        sku?.name ?? s.skuId,
        s.currentDepth,
        s.maxDepth,
        s.status,
        sku?.unitsPerCase ?? 12,
        typeof sku?.netUnitCost === 'number' ? sku.netUnitCost.toFixed(2) : '',
        typeof sku?.netCaseCost === 'number' ? sku.netCaseCost.toFixed(2) : '',
        sku ? sku.price.toFixed(2) : '',
        sku ? sku.marginPct.toFixed(1) : '',
      ]
        .map(escapeCsvCell)
        .join(',');
    })
  );

  return [header, ...rows].join('\n');
}

export function generateInventoryCsv(
  doors: import('../types/kooleriq').CoolerDoor[],
  skuCatalog: Record<string, SkuItem>,
  carriedSkuIds: string[],
  settings: import('../types/kooleriq').StoreSettings,
  onlyCarried: boolean
): string {
  const header = [
    'Store',
    'Carried Here',
    'SKU Code',
    'UPC Barcode',
    'SKU Name',
    'Brand',
    'Distributor',
    'Category',
    'Size',
    'Floor Qty',
    'Floor Capacity',
    'Backroom Qty',
    'Units/Case',
    'Net Unit Cost ($)',
    'Net Case Cost ($)',
    'Retail Price ($)',
    'Margin %',
  ]
    .map(escapeCsvCell)
    .join(',');

  const carriedSet = new Set(carriedSkuIds);
  const floorMap = new Map<string, { qty: number; cap: number }>();
  doors.forEach((d) =>
    d.shelves.flat().forEach((slot) => {
      const cur = floorMap.get(slot.skuId) ?? { qty: 0, cap: 0 };
      cur.qty += slot.currentDepth;
      cur.cap += slot.maxDepth;
      floorMap.set(slot.skuId, cur);
    })
  );

  const items = Object.values(skuCatalog).filter(
    (s) => !onlyCarried || carriedSet.has(s.id) || floorMap.has(s.id)
  );

  const rows = items.map((sku) => {
    const fl = floorMap.get(sku.id) ?? { qty: 0, cap: 0 };
    const isCarried = carriedSet.has(sku.id) || fl.cap > 0;
    return [
      settings.storeName,
      isCarried ? 'Yes' : 'No',
      sku.skuCode,
      sku.upc ?? '',
      sku.name,
      sku.brandLabel,
      sku.distributor ?? 'Direct',
      sku.category ?? sku.brandLabel,
      sku.size,
      fl.qty,
      fl.cap,
      sku.backroomQty,
      sku.unitsPerCase ?? 12,
      typeof sku.netUnitCost === 'number' ? sku.netUnitCost.toFixed(2) : '',
      typeof sku.netCaseCost === 'number' ? sku.netCaseCost.toFixed(2) : '',
      sku.price.toFixed(2),
      sku.marginPct.toFixed(1),
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  return [header, ...rows].join('\n');
}

export function generateAuditsCsv(
  audits: import('../types/kooleriq').AuditRecord[],
  settings: import('../types/kooleriq').StoreSettings
): string {
  const header = [
    'Store',
    'Audit ID',
    'Door',
    'Timestamp',
    'Compliance %',
    'Facings Detected',
    'Total Facings',
    'OOS Count',
    'AI Confidence %',
    'Status',
    'Summary',
  ]
    .map(escapeCsvCell)
    .join(',');

  const rows = audits.map((a) =>
    [
      settings.storeName,
      a.id,
      a.doorLabel,
      a.timestamp,
      a.compliancePct.toFixed(1),
      a.facingsDetected,
      a.totalFacings,
      a.oosCount,
      a.aiConfidence.toFixed(1),
      a.status,
      a.summary,
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  return [header, ...rows].join('\n');
}

export function generateAuditLogCsv(
  entries: import('../types/kooleriq').AuditLogEntry[]
): string {
  const header = [
    'Timestamp (ISO)',
    'Category',
    'Severity',
    'Actor',
    'Store',
    'Door',
    'Action',
    'Details',
  ]
    .map(escapeCsvCell)
    .join(',');

  const rows = entries.map((e) =>
    [
      e.timestampIso,
      e.category,
      e.severity,
      e.actor,
      e.storeName,
      e.doorLabel ?? '',
      e.action,
      e.details,
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  return [header, ...rows].join('\n');
}

