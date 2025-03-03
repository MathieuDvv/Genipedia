import { setupLoadingIndicator, showError, showToast } from './dom.js';
import { getLanguageName, copyToClipboard, preloadImage, fetchImageFromUnsplash, downloadHTML, generatePDF } from './utils.js';
import { setupAudioPlayer } from './audio.js';
import { APP_SETTINGS, API_KEY } from './proxy-config.js';

// Track token counts and cost for transparency
export let startTime;
export let endTime;
export let tokenCount = 0;
export let estimatedCost = 0;

/**
 * Strips markdown formatting from text.
 */
function stripMarkdown(text) {
    if (!text) return '';
    
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
        .replace(/\*(.*?)\*/g, '$1')     // Italic
        .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // Links
        .replace(/#{1,6}\s?(.*?)$/gm, '$1') // Headers
        .replace(/`{3}([\s\S]*?)`{3}/g, '$1') // Code blocks
        .replace(/`([^`]+)`/g, '$1')     // Inline code
        .replace(/>\s?(.*?)$/gm, '$1')   // Blockquotes
        .replace(/\n{2,}/g, '\n\n')      // Multiple newlines
        .trim();
}

/**
 * Show donation banner periodically.
 */
function maybeShowDonationBanner(container) {
    const lastShown = localStorage.getItem('donation_banner_last_shown');
    const now = Date.now();
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
    
    // If never shown or shown more than 3 days ago
    if (!lastShown || (now - parseInt(lastShown, 10)) > threeDaysInMs) {
        const banner = document.createElement('div');
        banner.className = 'donation-banner';
        banner.innerHTML = `
            <div class="donation-content">
                <p>🌟 Enjoying AIPedia? Consider <a href="https://github.com/sponsors/yourusername" target="_blank" rel="noopener">supporting its development</a>. Your contribution helps keep this project ad-free and continuously improving.</p>
                <button class="close-banner">×</button>
            </div>
        `;
        
        // Insert at the top of the article
        if (container.firstChild) {
            container.insertBefore(banner, container.firstChild);
        } else {
            container.appendChild(banner);
        }
        
        // Add close button functionality
        const closeButton = banner.querySelector('.close-banner');
        closeButton.addEventListener('click', () => {
            banner.remove();
            localStorage.setItem('donation_banner_last_shown', Date.now().toString());
        });
        
        // Record that we showed the banner
        localStorage.setItem('donation_banner_last_shown', now.toString());
    }
}

/**
 * Generates a complete article based on a query.
 */
export async function generateArticle(query, language, writingStyle) {
    window.startTime = performance.now();
    
    const loadingIndicator = setupLoadingIndicator();
    loadingIndicator.show();
    
    try {
        const prompt = generatePrompt(query, language, writingStyle);
        console.log('Prompt generated');
        
        // Estimate token count (rough estimate)
        window.tokenCount = Math.ceil(prompt.length / 4) + Math.ceil((query.length * 100) / 4);
        window.estimatedCost = estimateTokenCost(window.tokenCount);
        console.log(`Estimated tokens: ${window.tokenCount}, Estimated cost: ${window.estimatedCost}`);
        
        // Make API request to our proxy server
        console.log('Making API request to proxy server...');
        const response = await fetch('/api/deepseek', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // No Authorization header needed - it's handled by the proxy
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: window.CONFIG.SYSTEM_PROMPT
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 4000
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API request failed: ${errorData.error || response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Response received:', data);
        
        if (!data.choices || data.choices.length === 0) {
            throw new Error('No completion choices returned from the API.');
        }
        
        const completionText = data.choices[0].message.content;
        const parsedArticle = parseArticleResponse(completionText);
        
        window.endTime = performance.now();
        const totalTime = ((window.endTime - window.startTime) / 1000).toFixed(2);
        console.log(`Article generated in ${totalTime} seconds`);
        
        return parsedArticle;
    } catch (error) {
        console.error('Error generating article:', error);
        showError(`Failed to generate article: ${error.message}`);
        throw error;
    } finally {
        loadingIndicator.hide();
    }
}

/**
 * Generates a prompt for the article based on query and parameters.
 */
export function generatePrompt(query, language, style) {
    let prompt = `Generate a comprehensive, Wikipedia-style article about "${query}" in ${getLanguageName(language)}.`;
    
    // Add writing style instructions
    switch (style) {
        case 'academic':
            prompt += ` Use an academic tone with formal language, citing relevant research and theoretical frameworks. Include detailed analysis and proper terminology.`;
            break;
        case 'simple':
            prompt += ` Use simple, easy-to-understand language. Avoid jargon and complex sentences. Explain concepts clearly as if for a general audience or beginners.`;
            break;
        case 'creative':
            prompt += ` Use a creative, engaging tone with descriptive language and interesting narratives while maintaining factual accuracy.`;
            break;
        case 'professional':
            prompt += ` Use a professional, business-appropriate tone with clear, concise language. Focus on practical information and industry relevance.`;
            break;
        case 'conversational':
            prompt += ` Use a conversational, friendly tone as if explaining to a friend. Include relatable examples while maintaining informative content.`;
            break;
        default: // balanced
            prompt += ` Balance factual information with engaging content. Use a neutral, informative tone appropriate for an encyclopedia.`;
            break;
    }
    
    // Add structural requirements
    prompt += `
    
Your response must be a valid JSON object with the following structure:
{
    "title": "A descriptive and engaging title for the article",
    "summary": "A concise summary of the topic without any hyperlinks or HTML formatting",
    "sections": [
        {
            "id": "section-id",
            "title": "Section Title",
            "content": "Section content with <a class='wiki-link' href='?q=LinkedTerm'>linked terms</a> to other potential articles"
        }
    ],
    "references": [
        "Reference 1",
        "Reference 2"
    ]
}

Guidelines:
1. Create at least 4-6 meaningful sections with substantial content
2. Use HTML links with class="wiki-link" and href="?q=Term" ONLY for important related concepts
3. Create engaging section titles that cover different aspects of the topic
4. Start with general information and move to more specific details
5. Include historical context, key developments, significance, examples, and current status when relevant
6. Format the content with proper paragraphs and HTML where appropriate
7. Include 5-10 references to reliable sources
8. Ensure all information is factually correct and up-to-date
9. Do not include any explanations or text outside the JSON structure

The response must be a valid JSON object, nothing more.`;

    return prompt;
}

/**
 * Parses the API response and extracts the article data.
 */
export function parseArticleResponse(responseText) {
    try {
        // Handle both stringified JSON and direct JSON response
        let articleData;
        
        // First, try to find JSON within Markdown code blocks if present
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            try {
                articleData = JSON.parse(jsonMatch[1].trim());
            } catch (e) {
                console.warn('Found code block but failed to parse JSON from it:', e);
            }
        }
        
        // If no valid JSON found in code blocks, try parsing the whole response
        if (!articleData) {
            try {
                articleData = JSON.parse(responseText.trim());
            } catch (e) {
                console.error('Failed to parse complete response as JSON:', e);
                throw new Error('Invalid article format received from API.');
            }
        }
        
        // Validate required fields
        if (!articleData.title || !articleData.summary || !articleData.sections) {
            throw new Error('Missing required fields in article data.');
        }
        
        // Sanitize and validate sections
        articleData.sections = articleData.sections.map(section => {
            if (!section.id) section.id = 'section-' + Math.random().toString(36).substring(2, 10);
            if (!section.title) section.title = 'Untitled Section';
            if (!section.content) section.content = 'No content provided for this section.';
            return section;
        });
        
        // Ensure references array exists
        if (!articleData.references || !Array.isArray(articleData.references)) {
            articleData.references = [];
        }
        
        // Generate a unique ID for the article
        articleData.id = `article-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        
        // Add timestamp
        articleData.timestamp = new Date().toISOString();
        
        return articleData;
    } catch (error) {
        console.error('Error parsing article response:', error);
        throw new Error(`Failed to parse article: ${error.message}`);
    }
}

/**
 * Renders the article data to the DOM.
 */
export function renderArticle(articleData) {
    if (!articleData) {
        throw new Error('No article data provided to render.');
    }
    
    // Get the container element
    const container = document.getElementById('article-container');
    if (!container) {
        throw new Error('Article container not found in DOM.');
    }
    
    // Clear previous content
    container.innerHTML = '';
    
    // Create header section
    const header = document.createElement('header');
    header.className = 'article-header';
    
    const title = document.createElement('h1');
    title.className = 'article-title';
    title.textContent = articleData.title;
    
    const summary = document.createElement('div');
    summary.className = 'article-summary';
    summary.textContent = articleData.summary;
    
    header.appendChild(title);
    header.appendChild(summary);
    container.appendChild(header);
    
    // Create toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'article-toolbar';
    
    // Share button with dropdown
    const shareDropdown = document.createElement('div');
    shareDropdown.className = 'toolbar-dropdown';
    
    const shareButton = document.createElement('button');
    shareButton.className = 'toolbar-button share-button';
    shareButton.innerHTML = '<i class="fas fa-share-alt"></i> Share';
    
    const shareMenu = document.createElement('div');
    shareMenu.className = 'dropdown-menu';
    
    // Share as URL
    const shareUrlOption = document.createElement('a');
    shareUrlOption.className = 'dropdown-item';
    shareUrlOption.innerHTML = '<i class="fas fa-link"></i> Copy Link';
    shareUrlOption.href = '#';
    shareUrlOption.addEventListener('click', (e) => {
        e.preventDefault();
        const url = new URL(window.location.href);
        url.searchParams.set('q', articleData.title);
        copyToClipboard(url.href);
        showToast('Link copied to clipboard');
    });
    
    // Copy to clipboard
    const copyOption = document.createElement('a');
    copyOption.className = 'dropdown-item';
    copyOption.innerHTML = '<i class="fas fa-copy"></i> Copy Text';
    copyOption.href = '#';
    copyOption.addEventListener('click', (e) => {
        e.preventDefault();
        let text = `# ${articleData.title}\n\n${articleData.summary}\n\n`;
        articleData.sections.forEach(section => {
            // Strip HTML from section content
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = section.content;
            text += `## ${section.title}\n\n${tempDiv.textContent}\n\n`;
        });
        if (articleData.references && articleData.references.length > 0) {
            text += '## References\n\n';
            articleData.references.forEach((ref, i) => {
                text += `${i+1}. ${ref}\n`;
            });
        }
        copyToClipboard(text);
        showToast('Article copied to clipboard');
    });
    
    // Download as PDF
    const pdfOption = document.createElement('a');
    pdfOption.className = 'dropdown-item';
    pdfOption.innerHTML = '<i class="fas fa-file-pdf"></i> Download PDF';
    pdfOption.href = '#';
    pdfOption.addEventListener('click', (e) => {
        e.preventDefault();
        generatePDF(articleData);
    });
    
    // Download as HTML
    const htmlOption = document.createElement('a');
    htmlOption.className = 'dropdown-item';
    htmlOption.innerHTML = '<i class="fas fa-file-code"></i> Download HTML';
    htmlOption.href = '#';
    htmlOption.addEventListener('click', (e) => {
        e.preventDefault();
        downloadHTML(articleData);
    });
    
    shareMenu.appendChild(shareUrlOption);
    shareMenu.appendChild(copyOption);
    shareMenu.appendChild(pdfOption);
    shareMenu.appendChild(htmlOption);
    
    shareDropdown.appendChild(shareButton);
    shareDropdown.appendChild(shareMenu);
    
    // Toggle dropdown on click
    shareButton.addEventListener('click', () => {
        shareMenu.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!shareDropdown.contains(e.target)) {
            shareMenu.classList.remove('show');
        }
    });
    
    // Listen for Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            shareMenu.classList.remove('show');
        }
    });
    
    toolbar.appendChild(shareDropdown);
    
    // Print button
    const printButton = document.createElement('button');
    printButton.className = 'toolbar-button';
    printButton.innerHTML = '<i class="fas fa-print"></i> Print';
    printButton.addEventListener('click', () => {
        window.print();
    });
    toolbar.appendChild(printButton);
    
    container.appendChild(toolbar);
    
    // Maybe show donation banner
    maybeShowDonationBanner(container);
    
    // Create table of contents
    const toc = document.createElement('nav');
    toc.className = 'article-toc';
    toc.innerHTML = '<h3>Contents</h3>';
    
    const tocList = document.createElement('ol');
    tocList.className = 'toc-list';
    
    articleData.sections.forEach((section, index) => {
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        link.href = `#${section.id}`;
        link.textContent = `${index + 1}. ${section.title}`;
        listItem.appendChild(link);
        tocList.appendChild(listItem);
    });
    
    toc.appendChild(tocList);
    container.appendChild(toc);
    
    // Create main content
    const mainContent = document.createElement('main');
    mainContent.className = 'article-content';
    
    // Render each section
    articleData.sections.forEach(section => {
        const sectionElement = document.createElement('section');
        sectionElement.id = section.id;
        sectionElement.className = 'article-section';
        
        const sectionTitle = document.createElement('h2');
        sectionTitle.className = 'section-title';
        sectionTitle.textContent = section.title;
        
        const sectionContent = document.createElement('div');
        sectionContent.className = 'section-content';
        sectionContent.innerHTML = section.content;
        
        sectionElement.appendChild(sectionTitle);
        sectionElement.appendChild(sectionContent);
        mainContent.appendChild(sectionElement);
    });
    
    container.appendChild(mainContent);
    
    // Create references section if there are any references
    if (articleData.references && articleData.references.length > 0) {
        const referencesSection = document.createElement('section');
        referencesSection.id = 'references';
        referencesSection.className = 'article-references';
        
        const referencesTitle = document.createElement('h2');
        referencesTitle.className = 'section-title';
        referencesTitle.textContent = 'References';
        
        const referencesList = document.createElement('ol');
        referencesList.className = 'references-list';
        
        articleData.references.forEach(reference => {
            const referenceItem = document.createElement('li');
            referenceItem.textContent = reference;
            referencesList.appendChild(referenceItem);
        });
        
        referencesSection.appendChild(referencesTitle);
        referencesSection.appendChild(referencesList);
        container.appendChild(referencesSection);
    }
    
    // Setup audio player
    setupAudioPlayer(articleData);
    
    // Setup wiki link handlers
    setupWikiLinkHandlers();
    
    // Preload images to prevent layout shifts
    Array.from(container.querySelectorAll('img')).forEach(img => {
        preloadImage(img.src);
    });
    
    // Save to history
    saveToHistory(articleData);
    
    return container;
}

/**
 * Sets up handlers for wiki links within the article.
 */
function setupWikiLinkHandlers() {
    document.querySelectorAll('.wiki-link').forEach(link => {
        link.addEventListener('click', wikiLinkClickHandler);
    });
}

/**
 * Handles clicks on wiki links within articles.
 */
function wikiLinkClickHandler(event) {
    event.preventDefault();
    
    const url = new URL(event.currentTarget.href);
    const query = url.searchParams.get('q');
    
    if (query) {
        // Update search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = query;
        }
        
        // Trigger search
        const searchEvent = new CustomEvent('aipedia:search', {
            detail: { query: query }
        });
        document.dispatchEvent(searchEvent);
        
        // Update URL without reloading the page
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('q', query);
        window.history.pushState({ query }, '', newUrl);
    }
}

/**
 * Saves an article to search history.
 */
function saveToHistory(articleData) {
    try {
        // Get existing history
        let history = JSON.parse(localStorage.getItem('search_history') || '[]');
        
        // Create history item with minimal data
        const historyItem = {
            id: articleData.id,
            title: articleData.title,
            summary: articleData.summary,
            timestamp: articleData.timestamp || new Date().toISOString()
        };
        
        // Remove any existing entries for the same article title
        history = history.filter(item => item.title !== historyItem.title);
        
        // Add new item at the beginning
        history.unshift(historyItem);
        
        // Limit history length
        history = history.slice(0, APP_SETTINGS.maxSearchHistory);
        
        // Save back to localStorage
        localStorage.setItem('search_history', JSON.stringify(history));
    } catch (error) {
        console.error('Error saving to history:', error);
    }
}

/**
 * Estimates the cost of token usage.
 */
export function estimateTokenCost(tokens) {
    // Approximate cost per 1000 tokens (adjust based on your model's pricing)
    const costPer1000Tokens = 0.002;
    return (tokens / 1000) * costPer1000Tokens;
}

/**
 * Gets the full language name from a language code.
 */
export function getLanguageName(code) {
    const languages = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'zh': 'Chinese',
        'ja': 'Japanese',
        'ko': 'Korean'
    };
    
    return languages[code] || 'English';
} 