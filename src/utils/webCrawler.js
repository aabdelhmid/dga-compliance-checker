/**
 * Web Crawler for discovering all pages on a website
 */

/**
 * Crawls a website starting from a base URL to discover all internal pages
 * @param {string} baseUrl - The starting URL to crawl
 * @param {Object} options - Configuration options
 * @param {number} options.maxPages - Maximum number of pages to crawl (default: 50)
 * @param {number} options.maxDepth - Maximum crawl depth (default: 3)
 * @param {Function} options.onProgress - Callback for progress updates
 * @returns {Promise<Array<string>>} - Array of discovered URLs
 */
export const crawlWebsite = async (baseUrl, options = {}) => {
    const {
        maxPages = 50,
        maxDepth = 3,
        onProgress = () => { }
    } = options;

    // Normalize base URL
    const urlObj = new URL(baseUrl);
    const baseOrigin = urlObj.origin;
    const basePath = urlObj.pathname.endsWith('/') ? urlObj.pathname : urlObj.pathname + '/';

    const discoveredUrls = new Set();
    const visitedUrls = new Set();
    const queue = [{ url: baseUrl, depth: 0 }];

    discoveredUrls.add(baseUrl);

    while (queue.length > 0 && discoveredUrls.size < maxPages) {
        const { url, depth } = queue.shift();

        // Skip if already visited or max depth reached
        if (visitedUrls.has(url) || depth > maxDepth) {
            continue;
        }

        visitedUrls.add(url);
        onProgress({
            discovered: discoveredUrls.size,
            visited: visitedUrls.size,
            currentUrl: url
        });

        try {
            // Fetch the page
            // Check if URL is localhost
            const urlObj = new URL(url);
            const isLocalhost = urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1';

            // Use proxy only for external URLs to avoid CORS issues
            const fetchUrl = isLocalhost ? url : `/api/proxy?url=${encodeURIComponent(url)}`;

            const response = await fetch(fetchUrl);

            if (!response.ok) {
                console.warn(`Failed to fetch ${url}: ${response.status}`);
                continue;
            }

            const html = await response.text();

            // Parse HTML to extract links
            const links = extractLinks(html, url, baseOrigin);

            // Add new links to queue
            for (const link of links) {
                if (!discoveredUrls.has(link) && discoveredUrls.size < maxPages) {
                    discoveredUrls.add(link);
                    queue.push({ url: link, depth: depth + 1 });
                }
            }
        } catch (error) {
            console.error(`Error crawling ${url}:`, error);
        }
    }

    onProgress({
        discovered: discoveredUrls.size,
        visited: visitedUrls.size,
        completed: true
    });

    return Array.from(discoveredUrls);
};

/**
 * Extracts internal links from HTML content
 * @param {string} html - HTML content
 * @param {string} currentUrl - Current page URL
 * @param {string} baseOrigin - Base origin to filter internal links
 * @returns {Array<string>} - Array of internal links
 */
const extractLinks = (html, currentUrl, baseOrigin) => {
    const links = new Set();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Find all anchor tags
    const anchors = doc.querySelectorAll('a[href]');

    anchors.forEach(anchor => {
        try {
            let href = anchor.getAttribute('href');

            if (!href) return;

            // Clean href (remove quotes if present)
            href = href.replace(/['"]/g, '').trim();

            // Skip empty, mailto, tel, javascript, and hash-only links
            if (!href || href.startsWith('mailto:') || href.startsWith('tel:') ||
                href.startsWith('javascript:') || href === '#') {
                return;
            }

            // Resolve relative URLs
            const absoluteUrl = new URL(href, currentUrl);

            // Only include internal links (same origin)
            if (absoluteUrl.origin !== baseOrigin) {
                return;
            }

            // Remove fragment and normalize
            absoluteUrl.hash = '';
            const normalizedUrl = absoluteUrl.toString();

            // Skip common non-page resources
            if (isNonPageResource(normalizedUrl)) {
                return;
            }

            links.add(normalizedUrl);
        } catch (error) {
            // Invalid URL, skip
        }
    });

    return Array.from(links);
};

/**
 * Check if URL points to a non-page resource
 * @param {string} url - URL to check
 * @returns {boolean} - True if non-page resource
 */
const isNonPageResource = (url) => {
    const nonPageExtensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', // Images
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', // Documents
        '.zip', '.tar', '.gz', // Archives
        '.mp3', '.mp4', '.avi', '.mov', // Media
        '.css', '.js', '.json', '.xml' // Assets
    ];

    const urlLower = url.toLowerCase();
    return nonPageExtensions.some(ext => urlLower.endsWith(ext));
};
