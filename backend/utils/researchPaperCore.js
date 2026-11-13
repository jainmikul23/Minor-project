// Core Algorithms from Research Paper:
// "A Community-Validated, Priority-Driven and Equity-Aware Web Platform for Crowdsourced Civic Issue Reporting and Resolution"
// Authors: Mikul Jain, Namrata Tiwari, Mann Jain, Nikhil Koushal, Manoj Mali, Pratik Shah (AITR Indore) - SIH25031

const db = require('../database/dbConnect');

// 1. Haversine Distance (meters)
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371e3; // Earth radius in meters
    const phi1 = (parseFloat(lat1) * Math.PI) / 180;
    const phi2 = (parseFloat(lat2) * Math.PI) / 180;
    const deltaPhi = ((parseFloat(lat2) - parseFloat(lat1)) * Math.PI) / 180;
    const deltaLambda = ((parseFloat(lon2) - parseFloat(lon1)) * Math.PI) / 180;

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
}

// 2. Category SLA Configuration T(c) in hours (Section V-E)
const CATEGORY_SLA_HOURS = {
    1: 24, // Water Leakage
    2: 24, // Low Water Pressure
    3: 12, // Contaminated Water (Urgent Health)
    4: 12, // Pipeline Broken
    5: 24, // Water Supply General
    6: 12, // Street Light Not Working
    7: 6,  // Power Outage
    8: 8,  // Transformer Issue
    9: 4,  // Fallen Wire (Extreme Hazard)
    10: 12, // Electricity General
    11: 48, // Potholes
    12: 72, // Damaged Road
    13: 12, // Open Manhole (Safety Hazard)
    14: 24, // Footpath Blocked
    15: 48, // Road Maintenance
    16: 8,  // Garbage Overflow
    17: 12, // Sewage Blockage
    18: 6,  // Dead Animal Removal (Sanitation urgency)
    19: 12, // Public Toilet Cleaning
    20: 8,  // Sanitation General
    21: 24, // Mosquito Breeding
    22: 24, // Stagnant Water
    23: 12, // Food Safety
    24: 24, // Public Health
    25: 48, // Broken Equipment
    26: 72, // Grass Trimming
    27: 72, // Park Bench Damaged
    28: 12, // Stray Animals
    29: 24, // Illegal Parking
    30: 12, // Safety Hazard
    31: 24  // Public Safety
};

// Category radius threshold rho_c in meters (Section V-B)
const CATEGORY_DUP_RADIUS_METERS = {
    11: 35, // Potholes
    12: 50, // Damaged Road
    13: 25, // Open Manhole
    16: 45, // Garbage Overflow
    17: 40, // Sewage Blockage
    1: 40,  // Water Leakage
    6: 30,  // Street Light
    default: 40
};

// 3. User Trust Score tau_u (Section V-C Equation 2):
// tau_u = (g_u + 1) / (g_u + b_u + 2)
function calculateUserTrustScore(goodReports = 0, badReports = 0) {
    const gu = parseInt(goodReports) || 0;
    const bu = parseInt(badReports) || 0;
    return parseFloat(((gu + 1) / (gu + bu + 2)).toFixed(3));
}

// 4. Multi-Factor Priority Score P(i) (Section V-D Equations 3, 4, 5):
// P(i) = 100 * [w1 * S + w2 * F + w3 * A + w4 * C], sum(w) = 1
// w1 = 0.35, w2 = 0.25, w3 = 0.25, w4 = 0.15
function calculatePriorityScore({
    category_id,
    severity = 'Medium',
    confirmations_count = 0,
    duplicates_count = 0,
    created_at = new Date(),
    is_sensitive_zone = 0
}) {
    const w1 = 0.35;
    const w2 = 0.25;
    const w3 = 0.25;
    const w4 = 0.15;

    // S (Severity): Category base weight + reporter Low/Med/High
    const categoryBaseWeights = {
        1: 0.85, 2: 0.70, 3: 0.95, 4: 0.90, 5: 0.80, // Water
        6: 0.75, 7: 0.90, 8: 0.90, 9: 1.00, 10: 0.80, // Electricity
        11: 0.75, 12: 0.70, 13: 0.95, 14: 0.60, 15: 0.70, // Road
        16: 0.80, 17: 0.85, 18: 0.90, 19: 0.70, 20: 0.80, // Sanitation
        21: 0.80, 22: 0.75, 23: 0.85, 24: 0.80, // Health
        25: 0.50, 26: 0.40, 27: 0.40, // Parks
        28: 0.75, 29: 0.60, 30: 0.90, 31: 0.80 // Safety
    };

    const userSeverityFactor = {
        'Low': 0.33,
        'Medium': 0.66,
        'High': 1.0
    }[severity] || 0.66;

    const baseWeight = categoryBaseWeights[category_id] || 0.70;
    const S = Math.min(1.0, 0.5 * baseWeight + 0.5 * userSeverityFactor);

    // F (Frequency): F = ln(1 + nc + nd) / ln(1 + nmax), nmax = 20
    const nc = parseInt(confirmations_count) || 0;
    const nd = parseInt(duplicates_count) || 0;
    const nmax = 20;
    const F = Math.min(1.0, Math.log(1 + nc + nd) / Math.log(1 + nmax));

    // A (Ageing): A = min(1, topen / T(c))
    const slaHours = CATEGORY_SLA_HOURS[category_id] || 24;
    const createdTime = new Date(created_at).getTime();
    const now = Date.now();
    const openHours = Math.max(0, (now - createdTime) / (1000 * 60 * 60));
    const A = Math.min(1.0, openHours / slaHours);

    // C (Criticality): 1 if near sensitive zone (school, hospital, arterial road), else 0
    const C = (is_sensitive_zone ? 1.0 : 0.0);

    const P = Math.round(100 * (w1 * S + w2 * F + w3 * A + w4 * C) * 10) / 10;

    return {
        score: Math.min(100.0, Math.max(0.0, P)),
        breakdown: {
            S: parseFloat(S.toFixed(2)),
            F: parseFloat(F.toFixed(2)),
            A: parseFloat(A.toFixed(2)),
            C: parseFloat(C.toFixed(2)),
            slaHours,
            openHours: parseFloat(openHours.toFixed(1))
        }
    };
}

// 5. Check Geo-Spatial Duplicates at Submission (Section V-B Equation 1)
async function findGeospatialDuplicates(category_id, lat, lng, maxAgeDays = 7) {
    if (!lat || !lng) return [];

    const radius = CATEGORY_DUP_RADIUS_METERS[category_id] || CATEGORY_DUP_RADIUS_METERS.default;

    // Query active complaints in same category within recent days
    const query = `
        SELECT 
            c.complaint_id,
            c.description,
            c.latitude,
            c.longitude,
            c.imageUrl,
            c.created_at,
            c.status,
            c.confirmations_count,
            c.duplicates_count,
            c.priority_score,
            c.Address_Line,
            c.City,
            cat.Name AS category_name
        FROM Complaint c
        LEFT JOIN category cat ON c.category_id = cat.category_id
        WHERE c.category_id = ?
          AND c.status IN ('reported', 'in-progress')
          AND c.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
          AND c.latitude IS NOT NULL
          AND c.longitude IS NOT NULL
    `;

    return new Promise((resolve) => {
        db.query(query, [category_id, maxAgeDays], (err, rows) => {
            if (err || !rows) {
                console.warn('Warning checking duplicates:', err?.message);
                return resolve([]);
            }

            const candidates = [];
            for (const row of rows) {
                const distance = calculateHaversineDistance(lat, lng, row.latitude, row.longitude);
                if (distance !== null && distance <= (radius + 25)) { // 25m GPS accuracy buffer
                    candidates.push({
                        ...row,
                        distance_meters: Math.round(distance)
                    });
                }
            }

            // Sort by nearest
            candidates.sort((a, b) => a.distance_meters - b.distance_meters);
            resolve(candidates);
        });
    });
}

// 6. Equity-Aware Ward Analytics (Section V-F Equations 6, 7, 8)
async function computeEquityWardAnalytics() {
    // Model ward populations for Indore Municipal Wards 1 to 20
    const WARD_POPULATIONS = {
        1: 32000, 2: 28500, 3: 35000, 4: 29000, 5: 38000,
        6: 31000, 7: 27000, 8: 34000, 9: 39000, 10: 26000,
        11: 30000, 12: 36000, 13: 33000, 14: 35500, 15: 41000,
        16: 28000, 17: 32500, 18: 37000, 19: 29500, 20: 34500
    };

    const query = `
        SELECT 
            COALESCE(ward_no, 14) AS ward_no,
            COUNT(complaint_id) AS total_reports,
            SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved_reports,
            SUM(CASE WHEN status = 'reported' THEN 1 ELSE 0 END) AS pending_reports,
            AVG(CASE WHEN status = 'resolved' AND resolved_at IS NOT NULL 
                THEN TIMESTAMPDIFF(HOUR, created_at, resolved_at) 
                ELSE NULL END) AS avg_resolution_hours
        FROM Complaint
        GROUP BY COALESCE(ward_no, 14)
    `;

    return new Promise((resolve) => {
        db.query(query, (err, rows) => {
            if (err || !rows) return resolve({ wards: [], summary: {} });

            const wardData = [];
            const intensityList = [];

            for (let w = 1; w <= 20; w++) {
                const found = rows.find(r => parseInt(r.ward_no) === w) || {
                    ward_no: w,
                    total_reports: 0,
                    resolved_reports: 0,
                    pending_reports: 0,
                    avg_resolution_hours: null
                };

                const pop = WARD_POPULATIONS[w] || 32000;
                // Reporting Intensity: RI_w = 1000 * reports_w / population_w
                const ri = (1000 * found.total_reports) / pop;
                intensityList.push(ri);

                wardData.push({
                    ward_no: w,
                    population: pop,
                    reports: found.total_reports,
                    resolved: found.resolved_reports,
                    pending: found.pending_reports,
                    avg_hours: found.avg_resolution_hours ? parseFloat(Number(found.avg_resolution_hours).toFixed(1)) : null,
                    reporting_intensity: parseFloat(ri.toFixed(3))
                });
            }

            // Compute Median RI and MAD (Median Absolute Deviation)
            const sortedRI = [...intensityList].sort((a, b) => a - b);
            const medianRI = sortedRI[Math.floor(sortedRI.length / 2)] || 0.1;
            const absoluteDeviations = sortedRI.map(x => Math.abs(x - medianRI)).sort((a, b) => a - b);
            const MAD = absoluteDeviations[Math.floor(absoluteDeviations.length / 2)] || 0.05;

            // Compute z-scores and flag silent wards (zw < -1.0)
            let silentWardsCount = 0;
            wardData.forEach(item => {
                const zw = (0.6745 * (item.reporting_intensity - medianRI)) / (MAD || 0.01);
                item.z_score = parseFloat(zw.toFixed(2));
                item.is_silent_ward = (zw < -1.0 && item.reports <= 1);
                if (item.is_silent_ward) silentWardsCount++;
            });

            resolve({
                wards: wardData,
                summary: {
                    medianRI: parseFloat(medianRI.toFixed(3)),
                    MAD: parseFloat(MAD.toFixed(3)),
                    silentWardsCount
                }
            });
        });
    });
}

module.exports = {
    calculateHaversineDistance,
    CATEGORY_SLA_HOURS,
    CATEGORY_DUP_RADIUS_METERS,
    calculateUserTrustScore,
    calculatePriorityScore,
    findGeospatialDuplicates,
    computeEquityWardAnalytics
};

