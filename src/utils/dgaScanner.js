import { dgaRules } from './dgaRules.js';

/**
 * Scans a document against DGA rules.
 * @param {Document} doc - The DOM document to scan.
 * @param {string} pageUrl - The URL being scanned (optional).
 * @returns {Object} - The scan report.
 */
export const scanDocument = (doc, pageUrl = null) => {
    // Attach the URL to the document for rules that need it (e.g., language switch detection)
    if (pageUrl) {
        doc._url = pageUrl;
    }

    const violations = [];
    const passed = [];

    dgaRules.forEach(rule => {
        if (rule.type === 'manual') {
            // Skip manual rules - we'll handle them separately
            return;
        }

        let result = false;

        if (rule.globalCheck) {
            // Global check (e.g., presence of element)
            try {
                result = rule.globalCheck(doc);
            } catch (e) {
                console.error(`Error in globalCheck for rule ${rule.id}:`, e);
                result = false;
            }

            if (!result) {
                violations.push({
                    id: rule.id,
                    description: rule.description,
                    severity: rule.severity,
                    category: rule.category,
                    type: rule.type,
                    requirements: rule.requirements,
                    pageUrl: pageUrl || (typeof window !== 'undefined' && window.location.href) || '',
                    preview: doc.documentElement ? doc.documentElement.outerHTML.substring(0, 1000) : 'Document Structure Missing'
                });
            } else {
                passed.push({
                    id: rule.id,
                    description: rule.description,
                    severity: rule.severity,
                    category: rule.category,
                    type: rule.type
                });
            }
        } else if (rule.selector && rule.check) {
            // Element-specific check
            const elements = doc.querySelectorAll(rule.selector);
            let allPass = true;
            let preview = null;

            if (elements.length > 0) {
                elements.forEach(element => {
                    try {
                        if (!rule.check(element)) {
                            allPass = false;
                            if (!preview) {
                                preview = element.outerHTML.substring(0, 1000);
                            }
                        }
                    } catch (e) {
                        console.error(`Error in check for rule ${rule.id}:`, e);
                        allPass = false;
                    }
                });
            } else {
                // If selector not found, it might be a failure depending on the rule
                // But usually selector rules imply "if element exists, check it" OR "element must exist"
                // For now, if selector finds nothing, we assume pass unless it's a "must exist" rule handled by globalCheck
                // Actually, many rules are "verify X attribute on Y element". If Y doesn't exist, is it a pass?
                // Let's assume pass for now unless specific logic says otherwise.
                // Wait, previous implementation might have handled this differently.
                // Let's stick to the logic: if elements found, check them. If any fail, rule fails.
                // If no elements found, rule passes (vacuously true).
                allPass = true;
            }

            if (!allPass) {
                violations.push({
                    id: rule.id,
                    description: rule.description,
                    severity: rule.severity,
                    category: rule.category,
                    type: rule.type,
                    requirements: rule.requirements,
                    pageUrl: pageUrl || (typeof window !== 'undefined' && window.location.href) || '',
                    preview: preview
                });
            } else {
                passed.push({
                    id: rule.id,
                    description: rule.description,
                    severity: rule.severity,
                    category: rule.category,
                    type: rule.type
                });
            }
        }
    });

    // Calculate compliance score (automated checks only)
    const totalAutomated = violations.length + passed.length;
    const score = totalAutomated > 0 ? Math.round((passed.length / totalAutomated) * 100) : 100;

    return {
        score,
        violations,
        passed,
        totalChecks: totalAutomated,
        pageUrl: pageUrl || (typeof window !== 'undefined' && window.location.href) || ''
    };
};

/**
 * Fetches and scans a URL.
 */
export const scanUrl = async (url) => {
    try {
        // Check if URL is localhost
        const urlObj = new URL(url);
        const isLocalhost = urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1';

        // Determine fetch URL based on environment
        const isNode = typeof window === 'undefined';
        const fetchUrl = isNode
            ? url // In Node (e.g., CLI tests) fetch directly
            : isLocalhost
                ? url
                : `/api/proxy?url=${encodeURIComponent(url)}`;

        const response = await fetch(fetchUrl);

        if (!response.ok) {
            throw new Error('Failed to fetch the URL');
        }

        const text = await response.text();

        // Parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Scan the document with page URL
        const result = scanDocument(doc, url);
        return result;
    } catch (error) {
        return {
            error: error.message,
            score: 0,
            violations: [],
            passed: [],
            totalChecks: 0,
            pageUrl: url
        };
    }
};

/**
 * Scans multiple URLs and aggregates results
 * @param {Array<string>} urls - Array of URLs to scan
 * @param {Function} onProgress - Callback for progress updates
 * @returns {Promise<Object>} - Aggregated scan results
 */
export const scanMultipleUrls = async (urls, onProgress = () => { }) => {
    const allViolations = [];
    const allPassed = [];
    const pageResults = [];
    let scannedCount = 0;

    for (const url of urls) {
        onProgress({
            scanned: scannedCount,
            total: urls.length,
            currentUrl: url
        });

        try {
            const result = await scanUrl(url);

            pageResults.push({
                url,
                score: result.score,
                violationCount: result.violations.length,
                passedCount: result.passed.length
            });

            // Add violations with page context
            result.violations.forEach(violation => {
                allViolations.push({
                    ...violation,
                    pageUrl: url
                });
            });

            // Add passed checks
            result.passed.forEach(passed => {
                allPassed.push({
                    ...passed,
                    pageUrl: url
                });
            });
        } catch (error) {
            console.error(`Error scanning ${url}:`, error);
            pageResults.push({
                url,
                error: error.message,
                score: 0,
                violationCount: 0,
                passedCount: 0
            });
        }

        scannedCount++;
    }

    // Calculate overall score
    const totalChecks = allViolations.length + allPassed.length;
    const overallScore = totalChecks > 0 ? Math.round((allPassed.length / totalChecks) * 100) : 100;

    // Determine status
    let status = 'Compliant';
    if (allViolations.length > 0) {
        status = allViolations.length > allPassed.length ? 'Non-Compliant' : 'Partially Compliant';
    }

    onProgress({
        scanned: scannedCount,
        total: urls.length,
        completed: true
    });

    // Deduplicate violations (same component used across multiple pages)
    const uniqueViolations = [];
    const violationMap = new Map();

    allViolations.forEach(violation => {
        // Create unique key: rule ID + description (identifies the same component issue)
        const key = `${violation.id}-${violation.description}`;

        if (!violationMap.has(key)) {
            // First occurrence - add with page list
            violationMap.set(key, {
                ...violation,
                affectedPages: [violation.pageUrl],
                occurrences: 1
            });
        } else {
            // Duplicate - just track additional page
            const existing = violationMap.get(key);
            if (!existing.affectedPages.includes(violation.pageUrl)) {
                existing.affectedPages.push(violation.pageUrl);
                existing.occurrences++;
            }
        }
    });

    uniqueViolations.push(...violationMap.values());

    return {
        score: overallScore,
        status,
        violations: uniqueViolations,
        passed: allPassed,
        totalChecks,
        pageResults,
        totalPages: urls.length,
        pagesWithViolations: pageResults.filter(p => p.violationCount > 0).length,
        totalViolationsBeforeDedup: allViolations.length,
        timestamp: new Date().toISOString()
    };
};

