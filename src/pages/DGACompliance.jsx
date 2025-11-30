import React, { useState } from 'react';
import { scanUrl, scanDocument, scanMultipleUrls } from '../utils/dgaScanner';
import { dgaRules } from '../utils/dgaRules';
import { crawlWebsite } from '../utils/webCrawler';

const DGACompliance = () => {
    const [url, setUrl] = useState(window.location.origin);
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);
    const [error, setError] = useState('');
    const [scanMode, setScanMode] = useState('single'); // 'single' or 'full'
    const [comparisonMode, setComparisonMode] = useState(false);
    const [progress, setProgress] = useState({ phase: '', message: '' });

    const handleScan = async (e) => {
        e.preventDefault();
        console.log('handleScan called, scanMode:', scanMode, 'comparisonMode:', comparisonMode);
        setLoading(true);
        setError('');
        setReport(null);
        setProgress({ phase: '', message: '' });

        try {
            let result;

            // If comparison mode is enabled, scan dga.gov.sa first
            let baselineViolationIds = new Set();
            if (comparisonMode) {
                setProgress({ phase: 'baseline', message: 'Scanning dga.gov.sa for baseline...' });
                const baselineResult = await scanUrl('https://dga.gov.sa/ar');
                baselineViolationIds = new Set(baselineResult.violations.map(v => v.id));
                console.log('Baseline violations:', baselineViolationIds);
            }

            if (scanMode === 'single') {
                // Single page scan
                console.log('Running single page scan');
                setProgress({ phase: 'scanning', message: 'Scanning page...' });

                if (url === window.location.href) {
                    result = scanDocument(document);
                } else {
                    result = await scanUrl(url);
                }
            } else {
                // Full website scan
                console.log('Running full website scan');
                setProgress({ phase: 'crawling', message: 'Discovering pages...' });

                const urls = await crawlWebsite(url, {
                    maxPages: 50,
                    maxDepth: 3,
                    onProgress: (progress) => {
                        setProgress({
                            phase: 'crawling',
                            message: `Discovered ${progress.discovered} pages...`
                        });
                    }
                });

                console.log('Discovered URLs:', urls);
                setProgress({ phase: 'scanning', message: `Scanning ${urls.length} pages...` });

                result = await scanMultipleUrls(urls, (progress) => {
                    setProgress({
                        phase: 'scanning',
                        message: `Scanned ${progress.scanned}/${progress.total} pages...`
                    });
                });

                console.log('Multi-page scan result:', result);
            }

            // Filter violations if comparison mode is enabled
            if (comparisonMode && baselineViolationIds.size > 0) {
                const filteredViolations = result.violations.filter(v => !baselineViolationIds.has(v.id));
                const removedCount = result.violations.length - filteredViolations.length;

                result = {
                    ...result,
                    violations: filteredViolations,
                    comparisonMode: true,
                    baselineFiltered: removedCount
                };

                console.log(`Filtered ${removedCount} violations found in baseline`);
            }

            setReport(result);
        } catch (err) {
            console.error('Scan error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            setProgress({ phase: '', message: '' });
        }
    };

    const downloadJson = () => {
        if (!report) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "dga_compliance_report.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const downloadHtml = () => {
        if (!report) return;
        // Simple HTML report generation
        const htmlContent = `
            <html>
            <head><title>DGA Compliance Report</title></head>
            <body style="font-family: sans-serif; padding: 2rem;">
                <h1>DGA Compliance Report</h1>
                <p>Date: ${report.timestamp}</p>
                <p>Status: <strong>${report.status}</strong></p>
                <p>Score: <strong>${report.score}/100</strong></p>
                <hr/>
                <h2>Violations</h2>
                ${report.violations.map(v => `
                    <div style="margin-bottom: 1rem; border: 1px solid #ccc; padding: 1rem;">
                        <h3>${v.rule.category}: ${v.rule.id}</h3>
                        <p>${v.rule.description}</p>
                        <ul>
                            ${v.instances.map(i => `<li>${i.message} (Selector: ${i.selector})</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            </body>
            </html>
        `;
        const dataStr = "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "dga_compliance_report.html");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="container" style={{ marginTop: '4rem', marginBottom: '4rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>DGA Compliance Checker</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                Scan your website against the Saudi Digital Government Authority (DGA) Design System guidelines.
                <br />
                <a
                    href="https://www.figma.com/deck/AVjzP0DwaGn8r1R9qnukrG/ملف-توضيحي-للمعايير-الاساسية?node-id=1-84038&viewport=-1502%2C-63%2C0.63&t=CfzDOQBo82cGGHpd-1&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--primary)', textDecoration: 'underline', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
                >
                    View Official DGA Design System (Figma) ↗
                </a>
            </p>

            {/* Input Section */}
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', marginBottom: '2rem' }}>
                {/* Scan Mode Toggle */}
                <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--text-main)' }}>
                        Scan Mode:
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--gray-100)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
                        <button
                            type="button"
                            onClick={() => setScanMode('single')}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                backgroundColor: scanMode === 'single' ? 'var(--primary)' : 'transparent',
                                color: scanMode === 'single' ? 'white' : 'var(--text-main)',
                                fontWeight: scanMode === 'single' ? 'bold' : 'normal',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Single Page
                        </button>
                        <button
                            type="button"
                            onClick={() => setScanMode('full')}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                backgroundColor: scanMode === 'full' ? 'var(--primary)' : 'transparent',
                                color: scanMode === 'full' ? 'white' : 'var(--text-main)',
                                fontWeight: scanMode === 'full' ? 'bold' : 'normal',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Full Website (up to 50 pages)
                        </button>
                    </div>
                </div>

                {/* Comparison Mode Toggle */}
                <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                        type="checkbox"
                        id="comparisonMode"
                        checked={comparisonMode}
                        onChange={(e) => setComparisonMode(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor="comparisonMode" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                        🔍 Comparison Mode (Filter out violations also found on dga.gov.sa)
                    </label>
                </div>

                <form onSubmit={handleScan} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder={scanMode === 'single' ? "Enter page URL" : "Enter website base URL (e.g., https://example.com)"}
                        required
                        className="input"
                        style={{ flex: 1, minWidth: '300px' }}
                    />
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? (progress.message || 'Scanning...') : `Scan ${scanMode === 'single' ? 'Page' : 'Website'}`}
                    </button>
                </form>

                {/* Progress Indicator */}
                {loading && progress.message && (
                    <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        backgroundColor: 'var(--info-50)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--info-500)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                    }}>
                        <div style={{
                            width: '20px',
                            height: '20px',
                            border: '3px solid var(--info-500)',
                            borderTopColor: 'transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }}></div>
                        <span style={{ color: 'var(--info-800)', fontWeight: '500' }}>{progress.message}</span>
                    </div>
                )}
                {error && (
                    <div style={{ marginTop: '1rem', color: 'var(--error-600)', backgroundColor: 'var(--error-50)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                        {error}
                    </div>
                )}
            </div>

            {/* Results Section */}
            {report && (
                <div style={{ animation: 'fadeIn 0.5s ease' }}>
                    {/* Header Card */}
                    <div style={{
                        backgroundColor: 'white',
                        padding: '2rem',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-sm)',
                        marginBottom: '2rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem'
                    }}>
                        <div>
                            <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>Automated Scan Results</h2>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <span style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 'bold',
                                    color: report.status === 'Compliant' ? 'var(--success-600)' : report.status === 'Partially Compliant' ? 'var(--warning-600)' : 'var(--error-600)'
                                }}>
                                    {report.status}
                                </span>
                                <span style={{ color: 'var(--text-muted)' }}>|</span>
                                <span>{report.passed.filter(r => r.type === 'automated').length} Passed</span>
                                <span style={{ color: 'var(--text-muted)' }}>|</span>
                                <span style={{ color: 'var(--error-600)' }}>{report.violations.filter(v => v.type === 'automated').length} Violations</span>
                            </div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                * Score based on automated checks only. Please complete the manual checklist below.
                            </p>
                        </div>
                        <div style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            border: `8px solid ${report.score >= 70 ? (report.score === 100 ? 'var(--success-600)' : 'var(--warning-600)') : 'var(--error-600)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2rem',
                            fontWeight: 'bold'
                        }}>
                            {report.score}
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                        <button onClick={downloadJson} className="btn btn-outline">Download JSON</button>
                        <button onClick={downloadHtml} className="btn btn-outline">Download HTML</button>
                    </div>

                    {/* Multi-Page Statistics */}
                    {report.totalPages && report.totalPages > 1 && (
                        <div style={{
                            backgroundColor: 'var(--info-50)',
                            padding: '1.5rem',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '2rem',
                            border: '1px solid var(--info-500)'
                        }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--info-700)' }}>
                                📊 Multi-Page Scan Summary
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Total Pages</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--info-700)' }}>{report.totalPages}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Pages with Violations</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--error-600)' }}>{report.pagesWithViolations || 0}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Total Violations</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--error-600)' }}>{report.violations.length}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Comparison Mode Indicator */}
                    {report.comparisonMode && (
                        <div style={{
                            backgroundColor: 'var(--warning-100)',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '2rem',
                            border: '1px solid var(--warning-500)'
                        }}>
                            <strong style={{ color: 'var(--warning-800)' }}>🔍 Comparison Mode Active:</strong>
                            <span style={{ color: 'var(--warning-900)', marginLeft: '0.5rem' }}>
                                Filtered out {report.baselineFiltered} violation(s) also found on dga.gov.sa
                            </span>
                        </div>
                    )}

                    {/* Automated Scan Results */}
                    {report && report.violations && (
                        <div style={{ marginBottom: '3rem' }}>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem' }}>
                                📊 Automated Scan Results
                            </h2>

                            {/* Automated Violations */}
                            {
                                report.violations.length > 0 ? (
                                    <div>
                                        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--error-600)' }}>
                                            ❌ Violations Found ({report.violations.length} unique issues)
                                        </h3>
                                        {report.totalViolationsBeforeDedup && report.totalViolationsBeforeDedup > report.violations.length && (
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                                ℹ️ Deduplicated from {report.totalViolationsBeforeDedup} total occurrences (same components across pages)
                                            </p>
                                        )}
                                        <div style={{ display: 'grid', gap: '1rem' }}>
                                            {report.violations.map((violation, index) => (
                                                <details key={index} style={{
                                                    backgroundColor: 'var(--error-50)',
                                                    border: '1px solid var(--error-500)',
                                                    borderRadius: 'var(--radius-md)',
                                                    padding: '1.5rem',
                                                    cursor: 'pointer'
                                                }}>
                                                    <summary style={{ fontWeight: 'bold', color: 'var(--error-800)', marginBottom: '0.5rem', cursor: 'pointer' }}>
                                                        Rule #{violation.id}: {violation.description}
                                                    </summary>
                                                    <div style={{ marginTop: '1rem', paddingLeft: '1rem', borderLeft: '3px solid var(--error-500)' }}>
                                                        <p style={{ marginBottom: '0.75rem' }}>
                                                            <strong>Category:</strong> {violation.category} | <strong>Severity:</strong> {violation.severity}
                                                        </p>

                                                        {/* Violation Reason */}
                                                        {violation.violationReason && (
                                                            <div style={{
                                                                marginBottom: '1rem',
                                                                padding: '1rem',
                                                                backgroundColor: 'var(--error-100)',
                                                                borderRadius: 'var(--radius-sm)',
                                                                border: '1px solid var(--error-300)'
                                                            }}>
                                                                <p style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--error-800)' }}>
                                                                    ❌ What's Wrong:
                                                                </p>
                                                                <p style={{ color: 'var(--error-700)', fontSize: '0.95rem' }}>
                                                                    {violation.violationReason}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* How to Fix */}
                                                        {violation.howToFix && (
                                                            <div style={{
                                                                marginBottom: '1rem',
                                                                padding: '1rem',
                                                                backgroundColor: 'var(--info-50)',
                                                                borderRadius: 'var(--radius-sm)',
                                                                border: '1px solid var(--info-300)'
                                                            }}>
                                                                <p style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--info-800)' }}>
                                                                    💡 How to Fix:
                                                                </p>
                                                                <p style={{ color: 'var(--info-700)', fontSize: '0.95rem' }}>
                                                                    {violation.howToFix}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {violation.affectedPages && violation.affectedPages.length > 0 && (
                                                            <div style={{ marginBottom: '0.75rem' }}>
                                                                <strong>Affected Pages ({violation.affectedPages.length}):</strong>
                                                                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                                                                    {violation.affectedPages.map((pageUrl, idx) => (
                                                                        <li key={idx} style={{ marginBottom: '0.25rem' }}>
                                                                            <a
                                                                                href={pageUrl}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                style={{ color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.85rem' }}
                                                                            >
                                                                                {pageUrl}
                                                                            </a>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        <div style={{ marginBottom: '0.75rem' }}>
                                                            <strong>Requirements:</strong>
                                                            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                                                                {violation.requirements?.map((req, idx) => (
                                                                    <li key={idx} style={{ marginBottom: '0.25rem' }}>{req}</li>
                                                                ))}
                                                            </ul>
                                                        </div>

                                                        {/* Visual Context */}
                                                        {/* Issue in Scanned Website */}
                                                        <div style={{ marginTop: '1rem' }}>
                                                            <p style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                                                                ISSUE IN SCANNED WEBSITE
                                                            </p>
                                                            {violation.preview ? (
                                                                <div style={{
                                                                    backgroundColor: 'var(--gray-100)',
                                                                    padding: '1rem',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid var(--gray-300)',
                                                                    fontFamily: 'monospace',
                                                                    fontSize: '0.8rem',
                                                                    overflowX: 'auto',
                                                                    maxHeight: '150px',
                                                                    overflowY: 'auto',
                                                                    whiteSpace: 'pre-wrap',
                                                                    color: 'var(--gray-700)'
                                                                }}>
                                                                    {violation.preview}
                                                                </div>
                                                            ) : (
                                                                <div style={{
                                                                    width: '100%',
                                                                    height: '150px',
                                                                    border: '1px dashed #D1D5DB',
                                                                    borderRadius: '6px',
                                                                    backgroundColor: '#FFF',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: 'var(--text-muted)'
                                                                }}>
                                                                    <div style={{ textAlign: 'center' }}>
                                                                        <div style={{ fontSize: '2rem' }}>🚫</div>
                                                                        <div style={{ fontSize: '0.85rem' }}>Element Not Found</div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </details>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ backgroundColor: 'var(--success-100)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--success-500)' }}>
                                        <h3 style={{ color: 'var(--success-800)', fontWeight: 'bold', marginBottom: '0.5rem' }}>✅ All Automated Checks Passed!</h3>
                                        <p style={{ color: 'var(--success-700)' }}>No violations detected in automated compliance checks.</p>
                                    </div>
                                )
                            }
                        </div>


                    )}


                    {/* Manual Verification Checklist */}
                    <div style={{ marginTop: '3rem' }}>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '2px solid var(--warning-500)', paddingBottom: '0.5rem' }}>
                            ✋ Remaining Manual Verification Items
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            The following {dgaRules.filter(r => r.type === 'manual').length} items require human judgment and cannot be fully automated.
                        </p>

                        <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--gray-50)', borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ padding: '1rem', textAlign: 'left', width: '60px' }}>ID</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', width: '120px' }}>Category</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', width: '200px' }}>Requirement</th>
                                        <th style={{ padding: '1rem', textAlign: 'left' }}>Technical Details</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', width: '100px' }}>Reference</th>
                                        <th style={{ padding: '1rem', textAlign: 'center', width: '80px' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dgaRules.filter(r => r.type === 'manual')
                                        .sort((a, b) => parseInt(a.id) - parseInt(b.id))
                                        .map((rule) => (
                                            <tr key={rule.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '1rem', color: 'var(--text-muted)', verticalAlign: 'top' }}>{rule.id}</td>
                                                <td style={{ padding: '1rem', fontWeight: '500', verticalAlign: 'top' }}>{rule.category}</td>
                                                <td style={{ padding: '1rem', verticalAlign: 'top' }}>{rule.description}</td>
                                                <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)', verticalAlign: 'top' }}>
                                                    <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                                                        {rule.requirements.map((req, idx) => (
                                                            <li key={idx} style={{ marginBottom: '0.25rem' }}>{req}</li>
                                                        ))}
                                                    </ul>
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center', verticalAlign: 'top' }}>
                                                    <a
                                                        href="https://www.figma.com/deck/AVjzP0DwaGn8r1R9qnukrG"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ color: 'var(--primary)', fontSize: '0.875rem', textDecoration: 'none' }}
                                                    >
                                                        Figma ↗
                                                    </a>
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center', verticalAlign: 'top' }}>
                                                    <input type="checkbox" style={{ cursor: 'pointer' }} />
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DGACompliance;

