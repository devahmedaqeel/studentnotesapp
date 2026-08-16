import { ResourceType, ResourceTypeConfig } from '../types/savedLink';

export const RESOURCE_TYPE_CONFIGS: Record<ResourceType, ResourceTypeConfig> = {
  article: {
    id: 'article',
    label: 'Article',
    icon: 'newspaper-outline',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.14)',
    description: 'Online article, news, or blog post',
  },
  website: {
    id: 'website',
    label: 'Website',
    icon: 'globe-outline',
    color: '#06B6D4',
    bgColor: 'rgba(6, 182, 212, 0.14)',
    description: 'General website or web page',
  },
  youtube: {
    id: 'youtube',
    label: 'YouTube Video',
    icon: 'logo-youtube',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.14)',
    description: 'Video lecture, tutorial, or educational video',
  },
  course: {
    id: 'course',
    label: 'Online Course',
    icon: 'school-outline',
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.14)',
    description: 'MOOC, online course, or lecture series',
  },
  docs: {
    id: 'docs',
    label: 'Documentation',
    icon: 'book-outline',
    color: '#10B981',
    bgColor: 'rgba(10, 185, 129, 0.14)',
    description: 'Technical API, framework, or language docs',
  },
  paper: {
    id: 'paper',
    label: 'Research Paper',
    icon: 'flask-outline',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.14)',
    description: 'Academic paper, journal, or thesis',
  },
  pdf: {
    id: 'pdf',
    label: 'PDF Document',
    icon: 'document-text-outline',
    color: '#EC4899',
    bgColor: 'rgba(236, 72, 153, 0.14)',
    description: 'Online PDF report, slides, or handout',
  },
  github: {
    id: 'github',
    label: 'GitHub Repo',
    icon: 'logo-github',
    color: '#64748B',
    bgColor: 'rgba(100, 116, 139, 0.16)',
    description: 'Code repository, open source project, or Gist',
  },
  blog: {
    id: 'blog',
    label: 'Blog Post',
    icon: 'create-outline',
    color: '#F97316',
    bgColor: 'rgba(249, 115, 22, 0.14)',
    description: 'Developer or student blog',
  },
  tool: {
    id: 'tool',
    label: 'Web Tool',
    icon: 'construct-outline',
    color: '#14B8A6',
    bgColor: 'rgba(20, 184, 166, 0.14)',
    description: 'Calculator, converter, formatter, or utility',
  },
  ai_tool: {
    id: 'ai_tool',
    label: 'AI Resource',
    icon: 'sparkles-outline',
    color: '#A855F7',
    bgColor: 'rgba(168, 85, 247, 0.14)',
    description: 'AI model, prompt library, or assistant',
  },
  university: {
    id: 'university',
    label: 'University Portal',
    icon: 'business-outline',
    color: '#4F46E5',
    bgColor: 'rgba(79, 70, 229, 0.14)',
    description: 'LMS, portal, past papers, or syllabus',
  },
  study_material: {
    id: 'study_material',
    label: 'Study Material',
    icon: 'library-outline',
    color: '#0EA5E9',
    bgColor: 'rgba(14, 165, 233, 0.14)',
    description: 'Cheat sheet, summary, or exam guide',
  },
  reference: {
    id: 'reference',
    label: 'Reference',
    icon: 'bookmark-outline',
    color: '#EAB308',
    bgColor: 'rgba(234, 179, 8, 0.14)',
    description: 'Glossary, standard, or quick reference',
  },
  other: {
    id: 'other',
    label: 'Other',
    icon: 'link-outline',
    color: '#6B7280',
    bgColor: 'rgba(107, 114, 128, 0.14)',
    description: 'Custom or miscellaneous resource',
  },
};

/**
 * List of known tracking parameter keys that are safe to remove without breaking destination functionality.
 */
export const TRACKING_QUERY_PARAMS = new Set([
  // Google Analytics & UTM
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_reader',
  'utm_place',
  'utm_userid',
  'utm_cid',
  'utm_name',
  'ga_source',
  'ga_medium',
  'ga_term',
  'ga_content',
  'ga_campaign',
  '_ga',
  '_gl',
  '_hsenc',
  '_hsmi',
  '__hssc',
  '__hstc',
  '__hsfp',
  'hsctatracking',

  // Google Ads
  'gclid',
  'gclsrc',
  'dclid',
  'wbraid',
  'gbraid',

  // Meta / Facebook / Instagram
  'fbclid',
  'fbadid',
  'fb_action_ids',
  'fb_action_types',
  'fb_source',
  'igshid',

  // Microsoft Bing Ads
  'msclkid',

  // Twitter / X
  'twclid',

  // TikTok & Pinterest
  'ttclid',
  'pin_unauth',

  // LinkedIn & Yandex
  'li_fat_id',
  'yclid',

  // Mailchimp & HubSpot
  'mc_cid',
  'mc_eid',
  'mkt_tok',

  // Referral / Affiliate Tracking
  'ref_src',
  'ref_url',
  'ref_sub',
  'ref_code',
  'spm',
  'scm',
  'aff_platform',
  'aff_trace_key',
  'cmpid',
  'tracking_code',
  'trk',
  'ndp_tracking_id',
]);

/**
 * Known functional parameter keys that must ALWAYS be preserved.
 */
export const FUNCTIONAL_QUERY_PARAMS = new Set([
  'id',
  'v',
  't',
  'time_continue',
  'list',
  'index',
  'p',
  'page',
  'q',
  'query',
  'search',
  'keyword',
  'doc',
  'docid',
  'file',
  'article',
  'articleid',
  'item',
  'itemid',
  'sku',
  'product_id',
  'post_id',
  'entry_id',
  'auth',
  'token',
  'key',
  'code',
  'state',
  'redirect_uri',
  'lang',
  'hl',
  'locale',
  'country',
  'tab',
  'category',
  'filter',
  'sort',
  'view',
  'format',
  'mode',
  'theme',
  'download',
  'raw',
  'limit',
  'offset',
  'start',
  'size',
]);

/**
 * HTML entities decoder (safe regex replacement).
 */
export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .trim();
}

export interface CleanUrlResult {
  originalUrl: string;
  cleanedUrl: string;
  displayUrl: string;
  domain: string;
  extractedTitle?: string;
  removedParams: string[];
  preservedParams: string[];
  hasTrackingParams: boolean;
  isValid: boolean;
}

export interface LinkMetadataResult {
  title: string;
  description: string;
  domain: string;
  faviconUrl: string;
  previewImageUrl?: string;
  detectedType: ResourceType;
}

export const linkService = {
  /**
   * Extracts clean URL and accompanying title from arbitrary pasted text (e.g. shared from WhatsApp, Browser, Google, YouTube).
   */
  extractUrlAndTitle(rawText: string): { url: string; title: string } {
    if (!rawText) return { url: '', title: '' };

    let text = rawText.trim();
    let foundUrl = '';
    let extractedTitle = '';

    // Check for markdown link [Title](https://...)
    const mdMatch = text.match(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/i);
    if (mdMatch) {
      return {
        url: mdMatch[2].trim(),
        title: mdMatch[1].trim(),
      };
    }

    // Match any http:// or https:// URL in text
    const httpMatch = text.match(/(https?:\/\/[^\s]+)/i);
    if (httpMatch) {
      foundUrl = httpMatch[1];
      // Remaining text before or after URL is candidate title
      const before = text.substring(0, httpMatch.index).trim();
      const after = text.substring((httpMatch.index || 0) + foundUrl.length).trim();
      extractedTitle = [before, after].filter(Boolean).join(' ').trim();
    } else {
      // Check for bare www. or domain.com pattern
      const wwwMatch = text.match(/(www\.[^\s]+)/i);
      if (wwwMatch) {
        foundUrl = `https://${wwwMatch[1]}`;
        const before = text.substring(0, wwwMatch.index).trim();
        const after = text.substring((wwwMatch.index || 0) + wwwMatch[1].length).trim();
        extractedTitle = [before, after].filter(Boolean).join(' ').trim();
      } else {
        // Check if entire text is a bare domain with path e.g. github.com/user/repo
        const domainMatch = text.match(/^([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)$/i);
        if (domainMatch) {
          foundUrl = `https://${domainMatch[1]}`;
          extractedTitle = '';
        } else {
          // Check if text has a domain inside
          const insideDomainMatch = text.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/i);
          if (
            insideDomainMatch &&
            (insideDomainMatch[1].includes('.com') ||
              insideDomainMatch[1].includes('.org') ||
              insideDomainMatch[1].includes('.net') ||
              insideDomainMatch[1].includes('.io') ||
              insideDomainMatch[1].includes('.edu') ||
              insideDomainMatch[1].includes('.gov') ||
              insideDomainMatch[1].includes('.app') ||
              insideDomainMatch[1].includes('.dev'))
          ) {
            foundUrl = `https://${insideDomainMatch[1]}`;
            const before = text.substring(0, insideDomainMatch.index).trim();
            const after = text.substring((insideDomainMatch.index || 0) + insideDomainMatch[1].length).trim();
            extractedTitle = [before, after].filter(Boolean).join(' ').trim();
          } else {
            foundUrl = text;
          }
        }
      }
    }

    // Clean trailing punctuation attached to URL from natural language (e.g. "https://site.com).", "https://site.com,")
    foundUrl = foundUrl.replace(/[.,;:\)\]\>"\']+$/g, '');

    // Clean up title (remove trailing separators like " - ", " : ", " | ")
    extractedTitle = extractedTitle
      .replace(/^[\s\-:|—–]+|[\s\-:|—–]+$/g, '')
      .trim();

    return {
      url: foundUrl,
      title: extractedTitle,
    };
  },

  /**
   * Cleans a URL by safely extracting the URL from mixed text and stripping tracking parameters while strictly preserving functional parameters.
   */
  cleanUrl(rawUrl: string, options: { removeTracking?: boolean } = { removeTracking: true }): CleanUrlResult {
    let input = (rawUrl || '').trim();
    if (!input) {
      return {
        originalUrl: '',
        cleanedUrl: '',
        displayUrl: '',
        domain: '',
        removedParams: [],
        preservedParams: [],
        hasTrackingParams: false,
        isValid: false,
      };
    }

    // Extract actual URL and potential prefilled title if user pasted a share text
    const { url: extractedUrl, title: extractedTitle } = this.extractUrlAndTitle(input);
    let urlToParse = extractedUrl || input;

    // Prepend https:// if protocol is missing
    if (!urlToParse.startsWith('http://') && !urlToParse.startsWith('https://')) {
      urlToParse = `https://${urlToParse}`;
    }

    try {
      const urlObj = new URL(urlToParse);
      const domain = urlObj.hostname.replace(/^www\./i, '').toLowerCase();

      // Validate that hostname has a valid dot domain (e.g. google.com, not just random words)
      if (!domain.includes('.') || domain.length < 3) {
        return {
          originalUrl: input,
          cleanedUrl: '',
          displayUrl: '',
          domain: '',
          extractedTitle,
          removedParams: [],
          preservedParams: [],
          hasTrackingParams: false,
          isValid: false,
        };
      }

      const removedParams: string[] = [];
      const preservedParams: string[] = [];

      // Check each search param
      const searchParams = new URLSearchParams(urlObj.search);
      const keysToDelete: string[] = [];

      searchParams.forEach((val, key) => {
        const lowerKey = key.toLowerCase();

        // If explicitly functional, always preserve
        if (FUNCTIONAL_QUERY_PARAMS.has(lowerKey)) {
          preservedParams.push(`${key}=${val}`);
          return;
        }

        // Check for tracking parameters
        const isKnownTracking = TRACKING_QUERY_PARAMS.has(lowerKey);
        const isUtmOrGa =
          (lowerKey.startsWith('utm_') || lowerKey.startsWith('ga_')) &&
          !lowerKey.includes('id') &&
          !lowerKey.includes('article') &&
          !lowerKey.includes('page');

        if (isKnownTracking || isUtmOrGa) {
          if (options.removeTracking !== false) {
            keysToDelete.push(key);
          }
          removedParams.push(key);
        } else {
          preservedParams.push(`${key}=${val}`);
        }
      });

      // Special handling for YouTube share tracking ('si' param and 'feature=share')
      if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
        if (searchParams.has('si')) {
          if (options.removeTracking !== false && !keysToDelete.includes('si')) {
            keysToDelete.push('si');
          }
          if (!removedParams.includes('si')) removedParams.push('si');
        }
        if (searchParams.has('feature') && searchParams.get('feature') === 'share') {
          if (options.removeTracking !== false && !keysToDelete.includes('feature')) {
            keysToDelete.push('feature');
          }
          if (!removedParams.includes('feature')) removedParams.push('feature');
        }
      }

      if (options.removeTracking !== false) {
        keysToDelete.forEach((k) => searchParams.delete(k));
      }

      // Reconstruct cleaned URL
      urlObj.search = searchParams.toString();

      // Clean empty fragments (e.g. trailing '#' with no identifier)
      if (urlObj.hash === '#' || urlObj.hash === '') {
        urlObj.hash = '';
      }

      // Clean trailing slash if path is only '/' and there is no search or hash
      let cleaned = urlObj.toString();
      if (urlObj.pathname === '/' && !urlObj.search && !urlObj.hash) {
        cleaned = `${urlObj.protocol}//${urlObj.host}`;
      }

      // Clean display URL (e.g. domain.com/path)
      let displayUrl = cleaned
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '');

      return {
        originalUrl: input,
        cleanedUrl: cleaned,
        displayUrl,
        domain,
        extractedTitle: extractedTitle || undefined,
        removedParams,
        preservedParams,
        hasTrackingParams: removedParams.length > 0,
        isValid: true,
      };
    } catch {
      return {
        originalUrl: input,
        cleanedUrl: '',
        displayUrl: '',
        domain: '',
        extractedTitle,
        removedParams: [],
        preservedParams: [],
        hasTrackingParams: false,
        isValid: false,
      };
    }
  },

  /**
   * Automatically detects the resource type based on domain, path, and file extension.
   */
  detectResourceType(cleanedUrl: string, title?: string): ResourceType {
    try {
      const urlObj = new URL(cleanedUrl);
      const domain = urlObj.hostname.replace(/^www\./i, '').toLowerCase();
      const path = urlObj.pathname.toLowerCase();

      // 1. YouTube
      if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
        return 'youtube';
      }

      // 2. GitHub / GitLab
      if (domain.includes('github.com') || domain.includes('gitlab.com') || domain.includes('gist.github.com')) {
        return 'github';
      }

      // 3. PDF Document
      if (path.endsWith('.pdf') || path.includes('/pdf/')) {
        return 'pdf';
      }

      // 4. Research Papers
      if (
        domain.includes('arxiv.org') ||
        domain.includes('researchgate.net') ||
        domain.includes('ieeexplore.ieee.org') ||
        domain.includes('sciencedirect.com') ||
        domain.includes('nature.com') ||
        domain.includes('springer.com') ||
        domain.includes('acm.org') ||
        domain.includes('scholar.google.com') ||
        domain.includes('semanticscholar.org') ||
        domain.includes('jstor.org') ||
        domain.includes('nih.gov') ||
        domain.includes('biorxiv.org')
      ) {
        return 'paper';
      }

      // 5. Documentation
      if (
        domain.startsWith('docs.') ||
        path.includes('/docs') ||
        path.includes('/documentation') ||
        path.includes('/api-reference') ||
        domain.includes('developer.mozilla.org') ||
        domain.includes('devdocs.io') ||
        domain.includes('react.dev') ||
        domain.includes('nextjs.org') ||
        domain.includes('expo.dev') ||
        domain.includes('typescriptlang.org') ||
        domain.includes('tailwindcss.com') ||
        domain.includes('python.org') ||
        domain.includes('rust-lang.org') ||
        domain.includes('golang.org') ||
        domain.includes('kubernetes.io') ||
        domain.includes('docker.com')
      ) {
        return 'docs';
      }

      // 6. Online Courses
      if (
        domain.includes('coursera.org') ||
        domain.includes('edx.org') ||
        domain.includes('udemy.com') ||
        domain.includes('khanacademy.org') ||
        domain.includes('mitocw.mit.edu') ||
        domain.includes('ocw.mit.edu') ||
        domain.includes('datacamp.com') ||
        domain.includes('codecademy.com') ||
        domain.includes('freecodecamp.org') ||
        domain.includes('scrimba.com') ||
        domain.includes('frontendmasters.com') ||
        domain.includes('pluralsight.com')
      ) {
        return 'course';
      }

      // 7. AI Resources
      if (
        domain.includes('openai.com') ||
        domain.includes('chatgpt.com') ||
        domain.includes('claude.ai') ||
        domain.includes('anthropic.com') ||
        domain.includes('huggingface.co') ||
        domain.includes('deepmind.google') ||
        domain.includes('midjourney.com') ||
        domain.includes('perplexity.ai') ||
        domain.includes('v0.dev') ||
        domain.includes('poe.com') ||
        domain.includes('civitai.com')
      ) {
        return 'ai_tool';
      }

      // 8. University LMS / Portals
      if (
        domain.endsWith('.edu') ||
        domain.includes('canvas.') ||
        domain.includes('blackboard.') ||
        domain.includes('moodle.') ||
        domain.includes('brightspace.') ||
        domain.includes('portal.') ||
        domain.includes('lms.') ||
        domain.includes('.edu.pk') ||
        domain.includes('.ac.uk') ||
        domain.includes('.edu.au')
      ) {
        return 'university';
      }

      // 9. Blogs / Developer articles
      if (
        domain.includes('medium.com') ||
        domain.includes('dev.to') ||
        domain.includes('hashnode.dev') ||
        domain.includes('substack.com') ||
        domain.includes('hackernoon.com') ||
        domain.includes('css-tricks.com') ||
        domain.includes('smashingmagazine.com') ||
        path.includes('/blog/') ||
        path.includes('/post/') ||
        path.includes('/article/')
      ) {
        return 'blog';
      }

      // 10. Web Tools
      if (
        domain.includes('codepen.io') ||
        domain.includes('jsfiddle.net') ||
        domain.includes('stackblitz.com') ||
        domain.includes('replit.com') ||
        domain.includes('regex101.com') ||
        domain.includes('transform.tools') ||
        domain.includes('jsonformatter.org') ||
        domain.includes('figma.com') ||
        domain.includes('canva.com') ||
        domain.includes('notion.so')
      ) {
        return 'tool';
      }

      // 11. Study Material
      if (
        domain.includes('quizlet.com') ||
        domain.includes('chegg.com') ||
        domain.includes('studocu.com') ||
        domain.includes('coursehero.com') ||
        domain.includes('brainly.com') ||
        domain.includes('geeksforgeeks.org') ||
        domain.includes('w3schools.com') ||
        domain.includes('tutorialspoint.com') ||
        domain.includes('javatpoint.com')
      ) {
        return 'study_material';
      }

      // 12. Generic Article check by title or path
      if (
        (title && title.length > 30) ||
        path.includes('/news/') ||
        path.includes('/stories/') ||
        path.includes('/p/')
      ) {
        return 'article';
      }

      return 'website';
    } catch {
      return 'website';
    }
  },

  /**
   * Generates favicon URL using Google's public favicon service.
   */
  getFaviconUrl(domain: string, size: number = 64): string {
    if (!domain) return '';
    const cleanDomain = domain.replace(/^www\./i, '').toLowerCase();
    return `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=${size}`;
  },

  /**
   * Fetches rich metadata (title, description, image, favicon) from the target URL via HTTP request.
   */
  async fetchMetadata(url: string): Promise<Partial<LinkMetadataResult>> {
    try {
      const cleanRes = this.cleanUrl(url);
      if (!cleanRes.isValid) return {};

      // Controller with 4.5 second timeout to keep UI snappy
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const response = await fetch(cleanRes.cleanedUrl, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (StudentNotes App; Academic Resource Manager)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          domain: cleanRes.domain,
          faviconUrl: this.getFaviconUrl(cleanRes.domain),
          detectedType: this.detectResourceType(cleanRes.cleanedUrl),
        };
      }

      // Read initial 30KB of HTML stream for meta tags
      const htmlText = await response.text();
      const htmlSlice = htmlText.substring(0, 35000);

      // 1. Extract <title>
      let title = '';
      const ogTitleMatch = htmlSlice.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
      const twitterTitleMatch = htmlSlice.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i);
      const standardTitleMatch = htmlSlice.match(/<title[^>]*>([^<]+)<\/title>/i);

      if (ogTitleMatch && ogTitleMatch[1]) {
        title = ogTitleMatch[1];
      } else if (twitterTitleMatch && twitterTitleMatch[1]) {
        title = twitterTitleMatch[1];
      } else if (standardTitleMatch && standardTitleMatch[1]) {
        title = standardTitleMatch[1];
      }

      title = decodeHtmlEntities(title);

      // Clean common domain suffixes from title e.g. "Article Title - Medium" -> "Article Title"
      title = title
        .replace(/\s*[-–|•:]\s*(YouTube|Medium|GitHub|Wikipedia|Dev\.to|Coursera|Khan Academy|Reddit|Stack Overflow|LinkedIn|Twitter|X|Docs|Documentation)$/i, '')
        .trim();

      // 2. Extract Description
      let description = '';
      const ogDescMatch = htmlSlice.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
      const metaDescMatch = htmlSlice.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);

      if (ogDescMatch && ogDescMatch[1]) {
        description = ogDescMatch[1];
      } else if (metaDescMatch && metaDescMatch[1]) {
        description = metaDescMatch[1];
      }
      description = decodeHtmlEntities(description).substring(0, 200);

      // 3. Extract Preview Image
      let previewImageUrl: string | undefined;
      const ogImageMatch = htmlSlice.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      const twitterImageMatch = htmlSlice.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

      if (ogImageMatch && ogImageMatch[1]) {
        previewImageUrl = ogImageMatch[1];
      } else if (twitterImageMatch && twitterImageMatch[1]) {
        previewImageUrl = twitterImageMatch[1];
      }

      // Ensure preview image URL is absolute
      if (previewImageUrl && previewImageUrl.startsWith('/')) {
        try {
          const base = new URL(cleanRes.cleanedUrl);
          previewImageUrl = `${base.protocol}//${base.host}${previewImageUrl}`;
        } catch {}
      }

      const detectedType = this.detectResourceType(cleanRes.cleanedUrl, title);

      return {
        title: title || undefined,
        description: description || undefined,
        domain: cleanRes.domain,
        faviconUrl: this.getFaviconUrl(cleanRes.domain),
        previewImageUrl: previewImageUrl || undefined,
        detectedType,
      };
    } catch {
      return {};
    }
  },
};
