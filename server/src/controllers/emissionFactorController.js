import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { EmissionFactor } from '../models/EmissionFactor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_DATA_PATH = path.resolve(__dirname, '../data/emissionFactors.seed.json');

let cachedSeedFactors = null;
function getSeedFactors() {
  if (!cachedSeedFactors) {
    try {
      if (fs.existsSync(SEED_DATA_PATH)) {
        cachedSeedFactors = JSON.parse(fs.readFileSync(SEED_DATA_PATH, 'utf-8'));
      } else {
        cachedSeedFactors = [];
      }
    } catch {
      cachedSeedFactors = [];
    }
  }
  return cachedSeedFactors;
}

/**
 * Escapes special characters for safe regular expression matching
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Valid activity categories according to the schema
 */
const VALID_CATEGORIES = ['ELECTRICITY', 'FUEL', 'TRANSPORTATION', 'WASTE', 'PURCHASED_GOODS', 'OTHER'];
const VALID_SCOPES = ['SCOPE_1', 'SCOPE_2', 'SCOPE_3'];

/**
 * Controller to fetch emission factors with server-side pagination, multi-field filtering, and sorting
 */
export async function getEmissionFactors(req, res) {
  try {
    const {
      page,
      limit,
      category,
      scope,
      countryCode,
      reportingYear,
      sourceOrganization,
      status,
      isActive,
      search,
      sortBy,
      sortOrder,
    } = req.query;

    // 1. Pagination Parameters Validation
    const rawPage = parseInt(page, 10);
    const currentPage = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

    const rawLimit = parseInt(limit, 10);
    const defaultPageSize = 12;
    const maxPageSize = 100;
    const pageSize = isNaN(rawLimit) || rawLimit < 1 ? defaultPageSize : Math.min(maxPageSize, rawLimit);

    // If MongoDB is not connected (e.g. serverless fallback without remote MONGODB_URI)
    if (mongoose.connection.readyState !== 1) {
      let list = getSeedFactors().slice();
      if (category && category.toUpperCase() !== 'ALL') {
        list = list.filter((f) => f.category === category.toUpperCase());
      }
      if (scope && scope.toUpperCase() !== 'ALL') {
        list = list.filter((f) => f.scope === scope.toUpperCase());
      }
      if (countryCode && countryCode.toUpperCase() !== 'ALL') {
        list = list.filter((f) => f.countryCode === countryCode.toUpperCase());
      }
      if (reportingYear) {
        const y = parseInt(reportingYear, 10);
        if (!isNaN(y)) list = list.filter((f) => f.reportingYear === y);
      }
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        list = list.filter((f) =>
          (f.activityName && f.activityName.toLowerCase().includes(q)) ||
          (f.activityKey && f.activityKey.toLowerCase().includes(q)) ||
          (f.sourceOrganization && f.sourceOrganization.toLowerCase().includes(q))
        );
      }
      const totalRecords = list.length;
      const totalPages = Math.ceil(totalRecords / pageSize) || 1;
      const skip = (currentPage - 1) * pageSize;
      const factors = list.slice(skip, skip + pageSize);
      return res.json({
        success: true,
        count: factors.length,
        pagination: {
          totalRecords,
          currentPage,
          pageSize,
          totalPages,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1,
        },
        factors,
      });
    }

    // 2. Build Query Filter Safely
    const filter = {};

    // Active / Historical Status
    const statusParam = (status || isActive || '').toString().toLowerCase().trim();
    if (statusParam === 'false' || statusParam === 'inactive') {
      filter.isActive = false;
    } else if (statusParam === 'all') {
      // Do not filter by isActive (shows both active and archived/inactive)
    } else {
      filter.isActive = true;
    }

    // Category Filter
    if (category && typeof category === 'string' && category.trim().toUpperCase() !== 'ALL') {
      const cleanCat = category.trim().toUpperCase();
      if (VALID_CATEGORIES.includes(cleanCat)) {
        filter.category = cleanCat;
      }
    }

    // Scope Filter
    if (scope && typeof scope === 'string' && scope.trim().toUpperCase() !== 'ALL') {
      const cleanScope = scope.trim().toUpperCase();
      if (VALID_SCOPES.includes(cleanScope)) {
        filter.scope = cleanScope;
      }
    }

    // Country Code Filter
    if (countryCode && typeof countryCode === 'string' && countryCode.trim().toUpperCase() !== 'ALL') {
      filter.countryCode = countryCode.trim().toUpperCase();
    }

    // Reporting Year Filter
    if (reportingYear) {
      const yearInt = parseInt(reportingYear, 10);
      if (!isNaN(yearInt)) {
        filter.reportingYear = yearInt;
      }
    }

    // Source Organization Filter
    if (sourceOrganization && typeof sourceOrganization === 'string' && sourceOrganization.trim().toUpperCase() !== 'ALL') {
      filter.sourceOrganization = sourceOrganization.trim();
    }

    // Multi-field Search Query
    if (search && typeof search === 'string' && search.trim()) {
      const safeQuery = escapeRegex(search.trim());
      const searchRegex = new RegExp(safeQuery, 'i');
      filter.$or = [
        { activityName: searchRegex },
        { activityKey: searchRegex },
        { aliases: searchRegex },
        { description: searchRegex },
        { sourceOrganization: searchRegex },
      ];
    }

    // 3. Sorting Specification
    const sortFieldMap = {
      name: 'activityName',
      activityName: 'activityName',
      year: 'reportingYear',
      reportingYear: 'reportingYear',
      factor: 'factorValue',
      factorValue: 'factorValue',
      category: 'category',
      scope: 'scope',
      organization: 'sourceOrganization',
      country: 'countryCode',
      createdAt: 'createdAt',
    };

    const requestedSort = (sortBy || 'category').toString().toLowerCase().trim();
    const primarySortField = sortFieldMap[requestedSort] || 'category';

    const isDesc = (sortOrder || '').toString().toLowerCase().trim() === 'desc';
    const primaryDirection = isDesc ? -1 : requestedSort === 'year' && !sortOrder ? -1 : 1;

    // Compound Sort Spec with stable tie-breakers
    const sortSpec = {
      [primarySortField]: primaryDirection,
      countryCode: 1,
      reportingYear: -1,
      activityName: 1,
    };

    // 4. Execute Count and Paginated Query
    const totalRecords = await EmissionFactor.countDocuments(filter);
    const totalPages = Math.ceil(totalRecords / pageSize) || 1;
    const skip = (currentPage - 1) * pageSize;

    const factors =
      currentPage > totalPages && totalRecords > 0
        ? []
        : await EmissionFactor.find(filter)
            .sort(sortSpec)
            .skip(skip)
            .limit(pageSize)
            .lean();

    res.json({
      success: true,
      count: factors.length,
      pagination: {
        totalRecords,
        currentPage,
        pageSize,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
      factors,
    });
  } catch (error) {
    console.error('Error fetching paginated emission factors:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Controller to fetch dynamic aggregate summary statistics and distinct filter options across the entire collection
 */
export async function getEmissionFactorSummary(req, res) {
  try {
    if (mongoose.connection.readyState !== 1) {
      const list = getSeedFactors();
      const categories = [...new Set(list.map((f) => f.category))].sort();
      const countries = [...new Set(list.map((f) => f.countryCode))].sort();
      const organizations = [...new Set(list.map((f) => f.sourceOrganization))].sort();
      const years = [...new Set(list.map((f) => f.reportingYear))].sort((a, b) => b - a);

      return res.json({
        success: true,
        summary: {
          totalCount: list.length,
          activeCount: list.length,
          indiaCount: list.filter((f) => f.countryCode === 'IN').length,
          scope1Count: list.filter((f) => f.scope === 'SCOPE_1').length,
          scope2Count: list.filter((f) => f.scope === 'SCOPE_2').length,
          scope3Count: list.filter((f) => f.scope === 'SCOPE_3').length,
          minYear: years[years.length - 1] || 2022,
          maxYear: years[0] || 2024,
          categories,
          countries,
          organizations,
          years,
        },
      });
    }

    const stats = await EmissionFactor.aggregate([
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          activeCount: { $sum: { $cond: ['$isActive', 1, 0] } },
          indiaCount: { $sum: { $cond: [{ $eq: ['$countryCode', 'IN'] }, 1, 0] } },
          scope1Count: { $sum: { $cond: [{ $eq: ['$scope', 'SCOPE_1'] }, 1, 0] } },
          scope2Count: { $sum: { $cond: [{ $eq: ['$scope', 'SCOPE_2'] }, 1, 0] } },
          scope3Count: { $sum: { $cond: [{ $eq: ['$scope', 'SCOPE_3'] }, 1, 0] } },
          minYear: { $min: '$reportingYear' },
          maxYear: { $max: '$reportingYear' },
          categories: { $addToSet: '$category' },
          countries: { $addToSet: '$countryCode' },
          organizations: { $addToSet: '$sourceOrganization' },
          years: { $addToSet: '$reportingYear' },
        },
      },
    ]);

    const result = stats[0] || {
      totalCount: 0,
      activeCount: 0,
      indiaCount: 0,
      scope1Count: 0,
      scope2Count: 0,
      scope3Count: 0,
      minYear: null,
      maxYear: null,
      categories: [],
      countries: [],
      organizations: [],
      years: [],
    };

    result.categories.sort();
    result.countries.sort();
    result.organizations.sort();
    result.years.sort((a, b) => b - a);

    res.json({
      success: true,
      summary: result,
    });
  } catch (error) {
    console.error('Error fetching emission factor summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
