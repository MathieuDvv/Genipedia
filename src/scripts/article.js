/**
 * Article generation and rendering functionality
 */

import {
    articleContainer,
    tocContainer,
    geekMetricsContainer
} from './dom.js';
import { setupAudioPlayer } from './audio.js';
import { getLocaleString } from './locales-module.js';

// Get escapeHTML from the global AIPediaUtils object
const { escapeHTML } = window.AIPediaUtils || {};

// Track if this is the first article generated in this session
let isFirstArticle = true;

// Track if we've shown the donation banner recently
let donationBannerShown = false;

// Track if an article has been displayed in this session
let hasDisplayedArticle = false;

/**
 * Strips markdown formatting from text
 * @param {string} text - The text to strip markdown from
 * @returns {string} - The cleaned text
 */
function stripMarkdown(text) {
    if (!text) return '';
    
    return text
        // Remove headings (#, ##, ###)
        .replace(/^#+\s+/gm, '')
        // Remove bold (**text**)
        .replace(/\*\*(.*?)\*\*/g, '$1')
        // Remove italic (*text*)
        .replace(/\*(.*?)\*/g, '$1')
        // Remove code blocks (```text```)
        .replace(/```([\s\S]*?)```/g, '$1')
        // Remove inline code (`text`)
        .replace(/`(.*?)`/g, '$1')
        // Remove links ([text](url))
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        // Remove images (![alt](url))
        .replace(/!\[(.*?)\]\(.*?\)/g, '$1')
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // Trim whitespace
        .trim();
}

/**
 * Shows a donation banner with a random chance
 * @param {HTMLElement} container - The container to add the banner to
 */
function maybeShowDonationBanner(container) {
    // Check if we've shown the banner recently
    if (donationBannerShown) {
        return;
    }
    
    // 20% chance to show the banner
    if (Math.random() < 0.2) {
        const donationBanner = document.createElement('div');
        donationBanner.className = 'donation-banner';
        
        const bannerContent = document.createElement('div');
        bannerContent.className = 'banner-content';
        bannerContent.innerHTML = `
            <i data-lucide="coffee"></i>
            <div style="margin-left: 10px;">
                <strong>${getLocaleString('support_title')}</strong>: 
                ${getLocaleString('support_message')}
            </div>
        `;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        
        const donateButton = document.createElement('button');
        donateButton.className = 'primary-button';
        donateButton.textContent = getLocaleString('support_button');
        
        donateButton.addEventListener('click', () => {
            window.open('https://ko-fi.com/mathieudvv', '_blank');
            donationBanner.style.display = 'none';
            donationBannerShown = true;
        });
        
        const remindLaterButton = document.createElement('button');
        remindLaterButton.className = 'secondary-button';
        remindLaterButton.textContent = getLocaleString('remind_me_later');
        
        remindLaterButton.addEventListener('click', () => {
            donationBanner.style.display = 'none';
            donationBannerShown = true;
        });
        
        const noThanksButton = document.createElement('button');
        noThanksButton.className = 'tertiary-button';
        noThanksButton.textContent = getLocaleString('maybe_later');
        
        noThanksButton.addEventListener('click', () => {
            donationBanner.style.display = 'none';
            // Set a flag to not show the banner again for this session
            donationBannerShown = true;
        });
        
        buttonContainer.appendChild(noThanksButton);
        buttonContainer.appendChild(remindLaterButton);
        buttonContainer.appendChild(donateButton);
        
        donationBanner.appendChild(bannerContent);
        donationBanner.appendChild(buttonContainer);
        container.appendChild(donationBanner);
        
        // Mark that we've shown the banner
        donationBannerShown = true;
    }
}

/**
 * Generates an article based on a query
 * @param {string} query - The search query
 * @param {string} language - The language code
 * @param {string} writingStyle - The writing style
 * @returns {Promise<Object>} - The article data
 */
export async function generateArticle(query, language, writingStyle) {
    console.log('generateArticle called with:', { query, language, writingStyle });
    
    try {
        const prompt = generatePrompt(query, language, writingStyle);
        console.log('Prompt generated');
        
        // Estimate token count (rough estimate)
        window.tokenCount = Math.ceil(prompt.length / 4) + Math.ceil((query.length * 100) / 4);
        window.estimatedCost = estimateTokenCost(window.tokenCount);
        console.log(`Estimated tokens: ${window.tokenCount}, Estimated cost: ${window.estimatedCost}`);
        
        // Use AbortController for timeout - reduced from 120 to 60 seconds
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        
        try {
            // Make API request to DeepSeek API
            console.log('Making API request to DeepSeek...');
            const response = await fetch('https://genipedia.vercel.app/api/deepseek', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant that generates concise, informative articles. Always output in JSON format only.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.5, // Lowered from 0.7 for more consistent, faster responses
                    max_tokens: 2000  // Reduced from 4000 for faster generation
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log('API response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('API error response:', errorData);
                throw new Error(errorData.error?.message || 'Failed to generate article');
            }
            
            const data = await response.json();
            console.log('API response received');
            
            const articleText = data.choices[0].message.content;
            console.log('Article text received, length:', articleText.length);
            
            // Parse the article response
            const parsedArticle = parseArticleResponse(articleText);
            console.log('Article parsed successfully');
            
            return parsedArticle;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. The server is taking too long to respond. Please try again later or try a simpler query.');
            }
            throw error;
        }
    } catch (error) {
        console.error('Error in generateArticle:', error);
        throw error;
    }
}

/**
 * Generates a prompt for the article
 * @param {string} query - The search query
 * @param {string} language - The language code
 * @param {string} style - The writing style
 * @returns {string} - The prompt
 */
export function generatePrompt(query, language, style) {
    console.log('Generating prompt for:', { query, language, style });
    let languageName = getLanguageName(language);
    let styleDescription = '';
    let lengthGuideline = 'Aim for approximately 500-800 words total.';
    let sectionCount = '3-4';
    
    // Get context from previous article if available
    const previousContext = window.currentArticleData ? 
        `This search was initiated from the article about "${window.currentArticleData.title}". IMPORTANT: Your article must focus specifically on "${query}" as it relates to "${window.currentArticleData.title}" - do not create a general article about "${query}" but instead focus exclusively on how "${query}" relates to or exists within the context of "${window.currentArticleData.title}".` : 
        '';
    
    // More differentiated style descriptions with length adjustments
    switch (style) {
        case 'formal':
            styleDescription = 'Write in a formal academic style with proper terminology and structured arguments. Use a professional tone throughout.';
            lengthGuideline = 'Aim for approximately 600-900 words total.';
            break;
        case 'accessible':
            styleDescription = 'Write in a highly accessible style with simple vocabulary and short sentences. Avoid jargon completely and explain all concepts in a way that anyone can understand.';
            lengthGuideline = 'Aim for approximately 400-700 words total.';
            break;
        case 'explanatory':
            styleDescription = 'Write in a comprehensive explanatory style with detailed information, examples, and thorough exploration of the topic. Include more nuanced aspects of the subject and additional context where helpful.';
            lengthGuideline = 'Aim for approximately 900-1200 words total.';
            sectionCount = '4-6';
            break;
        case 'concise':
            styleDescription = 'Write in a very concise style focusing only on essential information. Be direct and brief without unnecessary elaboration.';
            lengthGuideline = 'Aim for approximately 300-500 words total.';
            sectionCount = '2-3';
            break;
        case 'age-0-10':
            styleDescription = 'Write for young children (ages 0-10) using very simple language, short sentences, and basic concepts. Explain everything as if to a child with no prior knowledge of the subject.';
            lengthGuideline = 'Aim for approximately 300-500 words total.';
            sectionCount = '2-3';
            break;
        case 'age-11-16':
            styleDescription = 'Write for teenagers (ages 11-16) with clear explanations that bridge basic and more advanced concepts. Use age-appropriate vocabulary and relatable examples.';
            lengthGuideline = 'Aim for approximately 500-700 words total.';
            break;
        case 'age-17-25':
            styleDescription = 'Write for young adults (ages 17-25) with balanced depth and accessibility. Include some technical terms but explain them clearly.';
            lengthGuideline = 'Aim for approximately 600-900 words total.';
            break;
        case 'age-25-plus':
            styleDescription = 'Write for adults (ages 25+) with proper terminology, context, and nuanced discussion. Assume the reader has general knowledge but not necessarily expertise in this subject.';
            lengthGuideline = 'Aim for approximately 700-1000 words total.';
            break;
        default:
            styleDescription = 'Write in a balanced, informative style for a general audience.';
    }
    
    return `Create a Wikipedia-style article about "${query}" in ${languageName}. ${styleDescription} ${previousContext}
    
    Format the article with the following structure:
    1. Title
    2. A brief summary (1-2 sentences)
    3. ${sectionCount} sections with headings
    4. A brief references section
    
    Use markdown: # for title, ## for headings, **bold** for key terms, and [text](link) for wiki links.
    
    Make sure the article is factual, informative, and well-organized. ${lengthGuideline}
    
    Format your response as JSON:
    {
      "title": "Main title (plain text)",
      "summary": "Brief summary (plain text)",
      "sections": [
        {
          "heading": "Section heading (plain text)",
          "content": "Section content with **formatting** and [links](concepts)"
        }
      ],
      "references": ["Reference 1", "Reference 2"]
    }`;
}

/**
 * Parses the article response
 * @param {string} responseText - The response text
 * @returns {Object} - The parsed article data
 */
export function parseArticleResponse(responseText) {
    console.log('Parsing article response, text length:', responseText.length);
    try {
        // Extract JSON from the response - optimize with a more efficient regex
        let jsonText = responseText;
        
        // First try to extract JSON from code blocks
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            jsonText = jsonMatch[1];
            console.log('JSON text extracted from code block, length:', jsonText.length);
        }
        
        // Clean up the JSON text
        jsonText = jsonText.trim();
        
        // Try to find the start and end of the JSON object if not in a code block
        if (!jsonMatch) {
            const startBrace = jsonText.indexOf('{');
            const endBrace = jsonText.lastIndexOf('}');
            
            if (startBrace !== -1 && endBrace !== -1 && endBrace > startBrace) {
                jsonText = jsonText.substring(startBrace, endBrace + 1);
                console.log('JSON text extracted by finding braces, length:', jsonText.length);
            }
        }
        
        // Parse the JSON
        console.log('Attempting to parse JSON...');
        const articleData = JSON.parse(jsonText);
        console.log('JSON parsed successfully');
        
        // Ensure the article data has the expected structure
        if (!articleData.title || !articleData.summary || !Array.isArray(articleData.sections)) {
            console.error('Invalid article data structure:', articleData);
            throw new Error('Invalid article data structure');
        }
        
        // Clean markdown formatting from title, summary, and section headings
        articleData.title = stripMarkdown(articleData.title);
        articleData.summary = stripMarkdown(articleData.summary);
        
        // Clean section headings in a single pass
        articleData.sections.forEach(section => {
            section.heading = stripMarkdown(section.heading);
        });
        
        return articleData;
    } catch (error) {
        console.error('Error parsing article response:', error);
        
        // Attempt to create a basic structure from the text
        console.log('Creating fallback article structure');
        
        // Try to extract title and content more intelligently
        let title = 'Generated Article';
        let content = responseText;
        
        // Look for a title pattern (# Title or Title\n===)
        const titleMatch = responseText.match(/^#\s+(.+)$/m) || 
                          responseText.match(/^(.+)\n={3,}$/m);
        
        if (titleMatch) {
            title = stripMarkdown(titleMatch[1]);
            // Remove the title from the content
            content = responseText.replace(titleMatch[0], '').trim();
        }
        
        return {
            title: title,
            summary: 'An article was generated but could not be properly formatted.',
            sections: [
                {
                    heading: 'Content',
                    content: content
                }
            ],
            references: []
        };
    }
}

/**
 * Renders an article
 * @param {Object} articleData - The article data
 */
export function renderArticle(articleData) {
    console.log('Rendering article:', articleData.title);
    
    // Store article data globally for context in related searches
    window.currentArticleData = {
        title: articleData.title,
        summary: articleData.summary
    };
    
    // Clear the article container
    articleContainer.innerHTML = '';
    console.log('Article container cleared');
    
    // Create article wrapper with fade-in animation
    const articleWrapper = document.createElement('div');
    articleWrapper.className = 'article-fade-in';
    
    // Add AI warning banner for the first article only
    if (!hasDisplayedArticle) {
        const aiWarningBanner = document.createElement('div');
        aiWarningBanner.className = 'ai-warning-banner';
        
        const warningContent = document.createElement('div');
        warningContent.className = 'banner-content';
        warningContent.innerHTML = `
            <i data-lucide="alert-triangle"></i>
            <div style="margin-left: 20px;">
                <strong>${getLocaleString('ai_warning_title')}</strong>: 
                ${getLocaleString('ai_warning_message')}
            </div>
        `;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        
        const understandButton = document.createElement('button');
        understandButton.className = 'primary-button';
        understandButton.textContent = getLocaleString('i_understand');
        
        understandButton.addEventListener('click', () => {
            aiWarningBanner.style.display = 'none';
            // Mark that we've displayed an article
            hasDisplayedArticle = true;
        });
        
        const remindLaterButton = document.createElement('button');
        remindLaterButton.className = 'secondary-button';
        remindLaterButton.textContent = getLocaleString('remind_me_later');
        
        remindLaterButton.addEventListener('click', () => {
            aiWarningBanner.style.display = 'none';
        });
        
        buttonContainer.appendChild(remindLaterButton);
        buttonContainer.appendChild(understandButton);
        
        aiWarningBanner.appendChild(warningContent);
        aiWarningBanner.appendChild(buttonContainer);
        articleWrapper.appendChild(aiWarningBanner);
    }
    
    // Mark that we've displayed an article
    hasDisplayedArticle = true;
    
    // Maybe show donation banner
    maybeShowDonationBanner(articleWrapper);
    
    // Create article header
    const articleHeader = document.createElement('div');
    articleHeader.className = 'article-header';
    
    // Add article title
    const articleTitle = document.createElement('h1');
    articleTitle.className = 'article-title';
    articleTitle.textContent = stripMarkdown(articleData.title);
    articleHeader.appendChild(articleTitle);
    
    // Add print and download buttons
    const articleButtons = document.createElement('div');
    articleButtons.className = 'article-buttons';
    
    // Print to PDF button
    const printButton = document.createElement('button');
    printButton.className = 'article-action-button print-button';
    printButton.title = getLocaleString('print_to_pdf') || 'Print to PDF';
    printButton.innerHTML = '<i data-lucide="printer"></i>';
    printButton.addEventListener('click', () => {
        if (window.AIPediaUtils && typeof window.AIPediaUtils.generatePDF === 'function') {
            window.AIPediaUtils.generatePDF(articleData);
        } else {
            console.error('generatePDF function not available');
            alert('PDF generation is not available at the moment.');
        }
    });
    
    // Download as HTML button
    const downloadButton = document.createElement('button');
    downloadButton.className = 'article-action-button download-button';
    downloadButton.title = getLocaleString('download_as_html') || 'Download as HTML';
    downloadButton.innerHTML = '<i data-lucide="download"></i>';
    downloadButton.addEventListener('click', () => {
        if (window.AIPediaUtils && typeof window.AIPediaUtils.downloadHTML === 'function') {
            window.AIPediaUtils.downloadHTML(articleData);
        } else {
            console.error('downloadHTML function not available');
            alert('HTML download is not available at the moment.');
        }
    });
    
    articleButtons.appendChild(printButton);
    articleButtons.appendChild(downloadButton);
    articleHeader.appendChild(articleButtons);
    
    // Initialize Lucide icons for the buttons
    if (window.lucide) {
        setTimeout(() => {
            window.lucide.createIcons({
                attrs: {
                    class: ['lucide'],
                    strokeWidth: '2',
                    stroke: 'currentColor',
                    fill: 'none',
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round'
                }
            }, document.querySelectorAll('.article-action-button i'));
        }, 0);
    }
    
    // Add article summary
    const articleSummaryContainer = document.createElement('div');
    articleSummaryContainer.className = 'article-summary-container';
    
    const articleSummary = document.createElement('p');
    articleSummary.className = 'article-summary';
    articleSummary.textContent = stripMarkdown(articleData.summary);
    articleSummaryContainer.appendChild(articleSummary);
    articleHeader.appendChild(articleSummaryContainer);
    
    // Add article image if available
    if (articleData.imageUrl) {
        console.log('Adding image to article:', articleData.imageUrl);
        const articleImageContainer = document.createElement('div');
        articleImageContainer.className = 'article-image-container';
        
        const articleImage = document.createElement('img');
        articleImage.className = 'article-image';
        articleImage.src = articleData.imageUrl;
        articleImage.alt = stripMarkdown(articleData.title);
        
        // Add click event to trigger download event for Unsplash
        if (articleData.imageSource && articleData.imageSource.includes('unsplash.com')) {
            // Trigger the Unsplash download event when the image is loaded
            articleImage.addEventListener('load', () => {
                // Use the utility function to trigger the download event
                if (window.AIPediaUtils && window.AIPediaUtils.triggerUnsplashDownload) {
                    window.AIPediaUtils.triggerUnsplashDownload(articleData.imageSource);
                }
            });
            
            // Add click handler for manual download
            articleImage.addEventListener('click', () => {
                // Create a hidden anchor to trigger the download event
                const downloadLink = document.createElement('a');
                downloadLink.href = `${articleData.imageSource}/download`;
                downloadLink.target = '_blank';
                downloadLink.style.display = 'none';
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            });
            articleImage.style.cursor = 'pointer';
            articleImage.title = 'Click to download original image from Unsplash';
        }
        
        articleImageContainer.appendChild(articleImage);
        
        const imageCaption = document.createElement('div');
        imageCaption.className = 'image-caption';
        
        // Properly attribute Unsplash photos according to guidelines
        if (articleData.imageSource && articleData.imageSource.includes('unsplash.com')) {
            // Extract photographer name from the title if available
            let photographerName = 'Photographer';
            
            // The image title is stored in articleData.imageTitle from the fetchImageForTopic function
            if (articleData.imageTitle && articleData.imageTitle.includes('Image by ')) {
                photographerName = articleData.imageTitle.replace('Image by ', '').replace(' on Unsplash', '');
            }
            
            imageCaption.innerHTML = `Photo by <a href="${articleData.imageSource}" target="_blank" rel="noopener">${photographerName}</a> on <a href="https://unsplash.com/?utm_source=genipedia&utm_medium=referral" target="_blank" rel="noopener">Unsplash</a>`;
        } else {
            imageCaption.textContent = stripMarkdown(articleData.title);
        }
        
        articleImageContainer.appendChild(imageCaption);
        articleHeader.appendChild(articleImageContainer);
    }
    
    // Add article actions (but not the audio player, which is added separately)
    const articleActions = document.createElement('div');
    articleActions.className = 'article-actions';
    
    articleHeader.appendChild(articleActions);
    articleWrapper.appendChild(articleHeader);
    
    // Setup audio player after the article header is created
    setupAudioPlayer(articleData);
    
    // Create article content wrapper
    const articleContentWrapper = document.createElement('div');
    articleContentWrapper.className = 'article-content-wrapper';
    
    // Create article content
    const articleContent = document.createElement('div');
    articleContent.className = 'article-content';
    
    // Add sections
    console.log(`Adding ${articleData.sections.length} sections to article`);
    articleData.sections.forEach((section, index) => {
        const sectionElement = document.createElement('div');
        sectionElement.className = 'section';
        sectionElement.dataset.index = index;
        
        const sectionHeading = document.createElement('h2');
        sectionHeading.textContent = stripMarkdown(section.heading);
        sectionElement.appendChild(sectionHeading);
        
        const sectionContent = document.createElement('div');
        sectionContent.className = 'section-content';
        
        // Process content for wiki links and formatting
        let processedContent = section.content
            // Replace markdown headings with HTML headings
            .replace(/^### (.*?)$/gm, '<h4>$1</h4>')
            .replace(/^## (.*?)$/gm, '<h3>$1</h3>')
            .replace(/^# (.*?)$/gm, '<h2>$1</h2>')
            // Replace markdown formatting
            .replace(/\*\*(.*?)\*\*/g, '<strong class="wiki-link" data-term="$1">$1</strong>') // Bold as wiki links
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
            .replace(/`(.*?)`/g, '<code>$1</code>') // Code
            // Replace markdown links - use the text as the query
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="#" class="wiki-link" data-term="$1">$1</a>') // Wiki links
            // Replace markdown lists
            .replace(/^\s*[\-\*]\s+(.*?)$/gm, '<li>$1</li>') // Unordered list items
            .replace(/^\s*\d+\.\s+(.*?)$/gm, '<li>$1</li>'); // Ordered list items
        
        // Wrap list items in appropriate list containers
        processedContent = processedContent
            .replace(/<li>.*?<\/li>(\s*<li>.*?<\/li>)*/g, match => {
                if (match.includes('1.')) {
                    return `<ol>${match}</ol>`;
                } else {
                    return `<ul>${match}</ul>`;
                }
            });
        
        sectionContent.innerHTML = processedContent;
        sectionElement.appendChild(sectionContent);
        
        articleContent.appendChild(sectionElement);
    });
    
    // Add references
    if (articleData.references && articleData.references.length > 0) {
        console.log(`Adding ${articleData.references.length} references to article`);
        const referencesSection = document.createElement('div');
        referencesSection.className = 'section references';
        
        const referencesHeading = document.createElement('h2');
        referencesHeading.textContent = 'References';
        referencesSection.appendChild(referencesHeading);
        
        const referencesContent = document.createElement('div');
        referencesContent.className = 'section-content';
        
        const referencesList = document.createElement('ol');
        articleData.references.forEach(reference => {
            const referenceItem = document.createElement('li');
            referenceItem.textContent = stripMarkdown(reference);
            referencesList.appendChild(referenceItem);
        });
        
        referencesContent.appendChild(referencesList);
        referencesSection.appendChild(referencesContent);
        
        articleContent.appendChild(referencesSection);
    }
    
    articleContentWrapper.appendChild(articleContent);
    
    // Create sidebar content
    const sidebarContent = document.createElement('div');
    sidebarContent.className = 'sidebar-content';
    
    // Create table of contents
    const tableOfContents = document.createElement('div');
    tableOfContents.className = 'table-of-contents';
    
    const tocTitle = document.createElement('h3');
    tocTitle.className = 'toc-title';
    tocTitle.textContent = 'Contents';
    tableOfContents.appendChild(tocTitle);
    
    const tocList = document.createElement('ul');
    tocList.className = 'toc-list';
    
    articleData.sections.forEach((section, index) => {
        const tocItem = document.createElement('li');
        const tocLink = document.createElement('a');
        tocLink.href = '#';
        tocLink.textContent = stripMarkdown(section.heading);
        tocLink.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionElement = document.querySelector(`.section[data-index="${index}"]`);
            if (sectionElement) {
                // Get the element's position
                const rect = sectionElement.getBoundingClientRect();
                // Calculate offset to account for fixed header (120px height instead of 80px)
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const targetPosition = rect.top + scrollTop - 120; // Increased from 80px to 120px offset for header
                
                // Scroll to the element with smooth behavior
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
        tocItem.appendChild(tocLink);
        tocList.appendChild(tocItem);
    });
    
    tableOfContents.appendChild(tocList);
    tocContainer.innerHTML = '';
    tocContainer.appendChild(tableOfContents);
    console.log('Table of contents created');
    
    // Create geek metrics
    const geekMetrics = document.createElement('div');
    geekMetrics.className = 'geek-metrics';
    
    const metricsTitle = document.createElement('h3');
    metricsTitle.textContent = 'Geek Metrics';
    geekMetrics.appendChild(metricsTitle);
    
    const metricsList = document.createElement('ul');
    
    // Add cache status if available
    if (articleData.metrics.fromCache) {
        const cacheMetric = document.createElement('li');
        cacheMetric.textContent = `Source: Loaded from cache`;
        cacheMetric.style.color = '#4CAF50'; // Green color to highlight cache hit
        metricsList.appendChild(cacheMetric);
    }
    
    const timeMetric = document.createElement('li');
    timeMetric.textContent = `Generation time: ${articleData.metrics.timeElapsed}s`;
    metricsList.appendChild(timeMetric);
    
    // Add total loading time if available
    if (articleData.metrics.totalLoadingTime) {
        const totalLoadingMetric = document.createElement('li');
        totalLoadingMetric.textContent = `Total loading time: ${articleData.metrics.totalLoadingTime}s`;
        metricsList.appendChild(totalLoadingMetric);
    }
    
    const tokenMetric = document.createElement('li');
    tokenMetric.textContent = `Tokens used: ~${articleData.metrics.tokenCount}`;
    metricsList.appendChild(tokenMetric);
    
    const costMetric = document.createElement('li');
    costMetric.textContent = `Estimated cost: $${articleData.metrics.estimatedCost}`;
    metricsList.appendChild(costMetric);
    
    geekMetrics.appendChild(metricsList);
    geekMetricsContainer.innerHTML = '';
    geekMetricsContainer.appendChild(geekMetrics);
    console.log('Geek metrics created');
    
    // Append everything to the article container
    articleWrapper.appendChild(articleContentWrapper);
    articleContainer.appendChild(articleWrapper);
    console.log('Article appended to container');
    
    // Add animation classes to sections after a delay
    setTimeout(() => {
        document.querySelectorAll('.section').forEach(section => {
            section.classList.add('animated');
        });
        console.log('Section animations added');
        
        // Reinitialize all Lucide icons to ensure they're properly rendered
        if (window.lucide) {
            window.lucide.createIcons();
            console.log('Lucide icons reinitialized');
        }
    }, 100);
    
    // Add event listener for wiki links
    setupWikiLinkHandlers();
}

/**
 * Sets up event handlers for wiki links
 */
function setupWikiLinkHandlers() {
    // Remove any existing event listeners to prevent duplicates
    document.removeEventListener('click', wikiLinkClickHandler);
    
    // Add the event listener
    document.addEventListener('click', wikiLinkClickHandler);
}

/**
 * Handles clicks on wiki links
 * @param {Event} event - The click event
 */
function wikiLinkClickHandler(event) {
    // Check if the clicked element is a wiki link
    if (event.target.classList.contains('wiki-link') || 
        event.target.closest('.wiki-link')) {
        
        event.preventDefault();
        
        // Get the link element (could be the target or a parent)
        const linkElement = event.target.classList.contains('wiki-link') ? 
            event.target : event.target.closest('.wiki-link');
        
        // Get the term to search for
        const term = linkElement.getAttribute('data-term');
        
        if (term) {
            console.log('Wiki link clicked:', term);
            
            // Get the current language and writing style
            const languageSelect = document.getElementById('language-select');
            const writingStyleSelect = document.getElementById('writing-style-select');
            
            const language = languageSelect ? languageSelect.value : 'en';
            const writingStyle = writingStyleSelect ? writingStyleSelect.value : 'normal';
            
            // Store the current article data as context for the new search
            // This is important to maintain context for related searches
            if (!window.currentArticleData) {
                console.log('Setting currentArticleData for context in related search');
                // Look for article data in the DOM if not already set
                const articleTitle = document.querySelector('.article-title');
                if (articleTitle) {
                    window.currentArticleData = {
                        title: articleTitle.textContent
                    };
                }
            }
            
            // Show loading state
            document.body.classList.add('search-state');
            const loadingElement = document.querySelector('.loading');
            if (loadingElement) {
                loadingElement.style.display = 'flex';
            }
            
            // Clear TOC and Geek metrics containers
            if (tocContainer) tocContainer.innerHTML = '';
            if (geekMetricsContainer) geekMetricsContainer.innerHTML = '';
            
            // Generate a new article for the term
            import('./search.js').then(searchModule => {
                // Update the search bar with the term
                const searchBar = document.getElementById('search-bar');
                if (searchBar) {
                    searchBar.value = term;
                }
                
                // Call the search function with the term
                searchModule.performSearch(term, language, writingStyle);
            });
        }
    }
}

/**
 * Estimates the token cost
 * @param {number} tokens - The number of tokens
 * @returns {string} - The estimated cost
 */
export function estimateTokenCost(tokens) {
    // Assuming $0.002 per 1000 tokens
    return ((tokens / 1000) * 0.002).toFixed(4);
}

/**
 * Gets the language name from a language code
 * @param {string} code - The language code
 * @returns {string} - The language name
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