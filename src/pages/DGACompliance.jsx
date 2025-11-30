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
    const [progress, setProgress] = useState({ phase: '', message: '' });

    const handleScan = async (e) => {
        e.preventDefault();
        console.log('handleScan called, scanMode:', scanMode);
        setLoading(true);
        setError('');
        setReport(null);
        setProgress({ phase: '', message: '' });

        try {
            if (scanMode === 'single') {
                // Single page scan
                console.log('Running single page scan');
                setProgress({ phase: 'scanning', message: 'Scanning page...' });

                if (url === window.location.href) {
                    const result = scanDocument(document);
                    setReport(result);
                } else {
                    const result = await scanUrl(url);
                    setReport(result);
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

                const result = await scanMultipleUrls(urls, (progress) => {
                    setProgress({
                        phase: 'scanning',
                        message: `Scanned ${progress.scanned}/${progress.total} pages...`
                    });
                });

                console.log('Multi-page scan result:', result);
                setReport(result);
            }
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
                    <label style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--text)' }}>
                        Scan Mode:
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#F3F4F6', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
                        <button
                            type="button"
                            onClick={() => setScanMode('single')}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                backgroundColor: scanMode === 'single' ? 'var(--primary)' : 'transparent',
                                color: scanMode === 'single' ? 'white' : 'var(--text)',
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
                                color: scanMode === 'full' ? 'white' : 'var(--text)',
                                fontWeight: scanMode === 'full' ? 'bold' : 'normal',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Full Website (up to 50 pages)
                        </button>
                    </div>
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
                        backgroundColor: '#EFF6FF',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid #3B82F6',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                    }}>
                        <div style={{
                            width: '20px',
                            height: '20px',
                            border: '3px solid #3B82F6',
                            borderTopColor: 'transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }}></div>
                        <span style={{ color: '#1E40AF', fontWeight: '500' }}>{progress.message}</span>
                    </div>
                )}
                {error && (
                    <div style={{ marginTop: '1rem', color: '#EF4444', backgroundColor: '#FEF2F2', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
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
                                    color: report.status === 'Compliant' ? '#059669' : report.status === 'Partially Compliant' ? '#D97706' : '#DC2626'
                                }}>
                                    {report.status}
                                </span>
                                <span style={{ color: 'var(--text-muted)' }}>|</span>
                                <span>{report.passed.filter(r => r.type === 'automated').length} Passed</span>
                                <span style={{ color: 'var(--text-muted)' }}>|</span>
                                <span style={{ color: '#DC2626' }}>{report.violations.filter(v => v.type === 'automated').length} Violations</span>
                            </div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                * Score based on automated checks only. Please complete the manual checklist below.
                            </p>
                        </div>
                        <div style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            border: `8px solid ${report.score >= 70 ? (report.score === 100 ? '#059669' : '#D97706') : '#DC2626'}`,
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
                            backgroundColor: '#F0F9FF',
                            padding: '1.5rem',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '2rem',
                            border: '1px solid #0EA5E9'
                        }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', color: '#0369A1' }}>
                                📊 Multi-Page Scan Summary
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Total Pages</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0369A1' }}>{report.totalPages}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Pages with Violations</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#DC2626' }}>{report.pagesWithViolations || 0}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Total Violations</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#DC2626' }}>{report.violations.length}</div>
                                </div>
                            </div>
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
                                        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--danger)' }}>
                                            ❌ Violations Found ({report.violations.length})
                                        </h3>
                                        <div style={{ display: 'grid', gap: '1rem' }}>
                                            {report.violations.map((violation, index) => (
                                                <details key={index} style={{
                                                    backgroundColor: '#FEE2E2',
                                                    border: '1px solid #EF4444',
                                                    borderRadius: 'var(--radius-md)',
                                                    padding: '1.5rem',
                                                    cursor: 'pointer'
                                                }}>
                                                    <summary style={{ fontWeight: 'bold', color: '#991B1B', marginBottom: '0.5rem', cursor: 'pointer' }}>
                                                        Rule #{violation.id}: {violation.description}
                                                    </summary>
                                                    <div style={{ marginTop: '1rem', paddingLeft: '1rem', borderLeft: '3px solid #EF4444' }}>
                                                        <p style={{ marginBottom: '0.75rem' }}>
                                                            <strong>Category:</strong> {violation.category} | <strong>Severity:</strong> {violation.severity}
                                                        </p>
                                                        {violation.pageUrl && (
                                                            <p style={{ marginBottom: '0.75rem' }}>
                                                                <strong>Violated Page:</strong>{' '}
                                                                <a
                                                                    href={violation.pageUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{ color: 'var(--primary)', textDecoration: 'underline' }}
                                                                >
                                                                    {violation.pageUrl}
                                                                </a>
                                                            </p>
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
                                                                    backgroundColor: '#F3F4F6',
                                                                    padding: '1rem',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #D1D5DB',
                                                                    fontFamily: 'monospace',
                                                                    fontSize: '0.8rem',
                                                                    overflowX: 'auto',
                                                                    maxHeight: '150px',
                                                                    overflowY: 'auto',
                                                                    whiteSpace: 'pre-wrap',
                                                                    color: '#374151'
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
                                    <div style={{ backgroundColor: '#D1FAE5', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #10B981' }}>
                                        <h3 style={{ color: '#065F46', fontWeight: 'bold', marginBottom: '0.5rem' }}>✅ All Automated Checks Passed!</h3>
                                        <p style={{ color: '#047857' }}>No violations detected in automated compliance checks.</p>
                                    </div>
                                )
                            }
                        </div>


                    )}


                    {/* Manual Verification Checklist */}
                    <div style={{ marginTop: '3rem' }}>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '2px solid var(--warning)', paddingBottom: '0.5rem' }}>
                            ✋ Remaining Manual Verification Items
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            The following {dgaRules.filter(r => r.type === 'manual').length} items require human judgment and cannot be fully automated.
                        </p>

                        <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--border)' }}>
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

