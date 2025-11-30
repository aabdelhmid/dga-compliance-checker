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
                const checkResult = rule.globalCheck(doc);

                // Support both boolean and object return values
                result = typeof checkResult === 'boolean' ? checkResult : checkResult?.passed;

                if (!result) {
                    const violationReason = typeof checkResult === 'object' ? checkResult.reason : null;
                    const howToFix = typeof checkResult === 'object' ? checkResult.howToFix : null;

                    violations.push({
                        id: rule.id,
                        description: rule.description,
                        severity: rule.severity,
                        category: rule.category,
                        type: rule.type,
                        requirements: rule.requirements,
                        pageUrl: pageUrl || (typeof window !== 'undefined' && window.location.href) || '',
                        preview: doc.documentElement ? doc.documentElement.outerHTML.substring(0, 1000) : 'Document Structure Missing',
                        violationReason: violationReason || `Rule #${rule.id} global check failed`,
                        howToFix: howToFix || 'Review requirements and update implementation to match DGA standards'
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
            } catch (e) {
                console.error(`Error in globalCheck for rule ${rule.id}:`, e);
                violations.push({
                    id: rule.id,
                    description: rule.description,
                    severity: rule.severity,
                    category: rule.category,
                    type: rule.type,
                    requirements: rule.requirements,
                    pageUrl: pageUrl || (typeof window !== 'undefined' && window.location.href) || '',
                    preview: `Error during check: ${e.message}`,
                    violationReason: `Check failed with error: ${e.message}`,
                    howToFix: 'Review rule implementation and ensure proper DOM structure'
                });
            }
        } else if (rule.selector && rule.check) {
            // Element-specific check
            const elements = doc.querySelectorAll(rule.selector);
            let allPass = true;
            let preview = null;
            let violationReason = null;
            let howToFix = null;

            if (elements.length > 0) {
                elements.forEach(element => {
                    try {
                        const checkResult = rule.check(element);

                        // Support both boolean and object return values
                        const passed = typeof checkResult === 'boolean' ? checkResult : checkResult?.passed;

                        if (!passed) {
                            allPass = false;
                            if (!preview) {
                                preview = element.outerHTML.substring(0, 1000);
                            }

                            // Capture violation reason and how-to-fix if provided
                            if (typeof checkResult === 'object') {
                                violationReason = violationReason || checkResult.reason;
                                howToFix = howToFix || checkResult.howToFix;
                            }
                        }
                    } catch (e) {
                        console.error(`Error in check for rule ${rule.id}:`, e);
                        allPass = false;
                    }
                });
            } else {
                // If selector not found, assume pass (component doesn't exist)
                // This prevents false positives for optional components
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
                    preview: preview,
                    violationReason: violationReason || `Rule #${rule.id} check failed`,
                    howToFix: howToFix || 'Review requirements and update implementation to match DGA standards'
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
        let doc;
        if (typeof DOMParser !== 'undefined') {
            const parser = new DOMParser();
            doc = parser.parseFromString(text, 'text/html');
        } else {
            // Node environment fallback using jsdom
            try {
                const { JSDOM } = await import('jsdom');
                const dom = new JSDOM(text, { url });
                doc = dom.window.document;
            } catch (e) {
                console.error('JSDOM not available, falling back to basic mock', e);
                // Basic mock for environment without JSDOM (though we should install it)
                // This is risky but better than crashing. 
                // However, for the user's issue (0 passed/0 violations), it's likely failing silently in browser too?
                // No, the user sees "Compliant | 0 Passed | 0 Violations".
                // If it was an error, they'd see the error message.
                // If they see 0/0, it means scanDocument ran but found nothing.
                // This implies dgaRules might be empty or doc is empty.
                throw new Error('DOMParser not available and JSDOM failed');
            }
        };

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

