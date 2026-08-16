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
    bgColor: 'rgba(16, 185, 129, 0.14)',
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
const TRACKING_QUERY_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_reader',
  'utm_place',
  'utm_userid',
  'gclid',
  'gclsrc',
  'dclid',
  'fbclid',
  'msclkid',
  'twclid',
  'igshid',
  'ttclid',
  'yclid',
  'mc_cid',
  'mc_eid',
  'mkt_tok',
  '_ga',
  '_gl',
  '_hsenc',
  '_hsmi',
  '__hssc',
  '__hstc',
  '__hsfp',
  'ref_src',
  'ref_url',
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
  domain: string;
  removedParams: string[];
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
   * Cleans a URL by safely stripping tracking parameters while strictly preserving functional parameters.
   */
  cleanUrl(rawUrl: string): CleanUrlResult {
    let input = (rawUrl || '').trim();
    if (!input) {
      return {
        originalUrl: '',
        cleanedUrl: '',
        domain: '',
        removedParams: [],
        isValid: false,
      };
    }

    // Prepend https:// if protocol is missing
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
      input = `https://${input}`;
    }

    try {
      const urlObj = new URL(input);
      const domain = urlObj.hostname.replace(/^www\./i, '').toLowerCase();
      const removedParams: string[] = [];

      // Check each search param
      const searchParams = new URLSearchParams(urlObj.search);
      const keysToDelete: string[] = [];

      searchParams.forEach((_val, key) => {
        const lowerKey = key.toLowerCase();
        // Remove tracking params
        if (TRACKING_QUERY_PARAMS.has(lowerKey)) {
          keysToDelete.push(key);
          removedParams.push(key);
        } else if (
          (lowerKey.startsWith('utm_') || lowerKey.startsWith('ga_')) &&
          !lowerKey.includes('id') &&
          !lowerKey.includes('article')
        ) {
          keysToDelete.push(key);
          removedParams.push(key);
        }
      });

      // Special handling for YouTube share tracking ('si' param)
      if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
        if (searchParams.has('si')) {
          keysToDelete.push('si');
          removedParams.push('si');
        }
        if (searchParams.has('feature') && searchParams.get('feature') === 'share') {
          keysToDelete.push('feature');
          removedParams.push('feature');
        }
      }

      keysToDelete.forEach((k) => searchParams.delete(k));

      // Reconstruct cleaned URL
      urlObj.search = searchParams.toString();

      // Clean trailing slash if path is only '/'
      let cleaned = urlObj.toString();
      if (urlObj.pathname === '/' && !urlObj.search && !urlObj.hash) {
        cleaned = `${urlObj.protocol}//${urlObj.host}`;
      }

      return {
        originalUrl: input,
        cleanedUrl: cleaned,
        domain,
        removedParams,
        isValid: true,
      };
    } catch {
      return {
        originalUrl: input,
        cleanedUrl: input,
        domain: '',
        removedParams: [],
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
        domain.includes('springer.com') ||
        domain.includes('semanticscholar.org') ||
        domain.includes('jstor.org') ||
        domain.includes('biorxiv.org') ||
        domain.includes('medrxiv.org') ||
        domain.includes('acm.org')
      ) {
        return 'paper';
      }

      // 5. Online Courses
      if (
        domain.includes('coursera.org') ||
        domain.includes('udemy.com') ||
        domain.includes('edx.org') ||
        domain.includes('khanacademy.org') ||
        domain.includes('codecademy.com') ||
        domain.includes('pluralsight.com') ||
        domain.includes('datacamp.com') ||
        domain.includes('freecodecamp.org')
      ) {
        return 'course';
      }

      // 6. Documentation
      if (
        domain.startsWith('docs.') ||
        domain.includes('documentation') ||
        domain.includes('devdocs.io') ||
        domain.includes('gitbook.io') ||
        domain.includes('readthedocs.io') ||
        domain.includes('readme.io') ||
        domain.includes('developer.mozilla.org') ||
        domain.includes('react.dev') ||
        domain.includes('nextjs.org') ||
        domain.includes('vuejs.org') ||
        domain.includes('angular.io') ||
        domain.includes('tailwindcss.com') ||
        domain.includes('supabase.com/docs') ||
        path.startsWith('/docs') ||
        path.startsWith('/documentation')
      ) {
        return 'docs';
      }

      // 7. AI Tools & Resources
      if (
        domain.includes('chatgpt.com') ||
        domain.includes('openai.com') ||
        domain.includes('claude.ai') ||
        domain.includes('anthropic.com') ||
        domain.includes('huggingface.co') ||
        domain.includes('v0.dev') ||
        domain.includes('replicate.com') ||
        domain.includes('perplexity.ai') ||
        domain.includes('gemini.google.com') ||
        domain.includes('midjourney.com')
      ) {
        return 'ai_tool';
      }

      // 8. University Resources
      if (
        domain.endsWith('.edu') ||
        domain.includes('.edu.') ||
        domain.includes('.ac.') ||
        domain.endsWith('.ac.uk') ||
        domain.includes('canvas') ||
        domain.includes('blackboard') ||
        domain.includes('moodle')
      ) {
        return 'university';
      }

      // 9. Blogs
      if (
        domain.includes('medium.com') ||
        domain.includes('dev.to') ||
        domain.includes('hashnode.dev') ||
        domain.includes('substack.com') ||
        domain.includes('blogger.com') ||
        domain.includes('wordpress.com')
      ) {
        return 'blog';
      }

      // 10. Web Tools
      if (
        domain.includes('codepen.io') ||
        domain.includes('codesandbox.io') ||
        domain.includes('replit.com') ||
        domain.includes('stackblitz.com') ||
        domain.includes('regex101.com') ||
        domain.includes('jsonlint.com') ||
        domain.includes('figma.com') ||
        domain.includes('canva.com') ||
        domain.includes('notion.so') ||
        domain.includes('trello.com')
      ) {
        return 'tool';
      }

      // Check title keywords if available
      if (title) {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('tutorial') || lowerTitle.includes('guide')) return 'article';
        if (lowerTitle.includes('paper') || lowerTitle.includes('journal')) return 'paper';
        if (lowerTitle.includes('documentation') || lowerTitle.includes('api reference')) return 'docs';
        if (lowerTitle.includes('course') || lowerTitle.includes('lecture')) return 'course';
        if (lowerTitle.includes('cheat sheet') || lowerTitle.includes('summary')) return 'study_material';
      }

      return 'article';
    } catch {
      return 'website';
    }
  },

  /**
   * Generates a high-quality favicon URL for any domain using Google S2 service with direct fallback.
   */
  getFaviconUrl(domain: string): string {
    if (!domain) return '';
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  },

  /**
   * Safely fetches webpage metadata (title, description, preview image, favicon) with a non-blocking timeout.
   */
  async fetchMetadata(targetUrl: string): Promise<LinkMetadataResult> {
    const cleanResult = this.cleanUrl(targetUrl);
    const domain = cleanResult.domain || 'website.com';
    const fallbackFavicon = this.getFaviconUrl(domain);
    const fallbackType = this.detectResourceType(cleanResult.cleanedUrl);

    if (!cleanResult.isValid) {
      return {
        title: domain || 'Saved Resource',
        description: '',
        domain,
        faviconUrl: fallbackFavicon,
        detectedType: fallbackType,
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(cleanResult.cleanedUrl, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          title: domain,
          description: '',
          domain,
          faviconUrl: fallbackFavicon,
          detectedType: fallbackType,
        };
      }

      // Read initial 60KB to parse meta tags without heavy memory use
      const htmlText = await response.text();
      const headChunk = htmlText.substring(0, 65000);

      // 1. Extract Title
      let title = '';
      const ogTitleMatch = headChunk.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
                           headChunk.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        title = decodeHtmlEntities(ogTitleMatch[1]);
      } else {
        const twitterTitleMatch = headChunk.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i);
        if (twitterTitleMatch && twitterTitleMatch[1]) {
          title = decodeHtmlEntities(twitterTitleMatch[1]);
        } else {
          const titleTagMatch = headChunk.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleTagMatch && titleTagMatch[1]) {
            title = decodeHtmlEntities(titleTagMatch[1]);
          }
        }
      }

      // 2. Extract Description
      let description = '';
      const ogDescMatch = headChunk.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
                          headChunk.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
      if (ogDescMatch && ogDescMatch[1]) {
        description = decodeHtmlEntities(ogDescMatch[1]);
      } else {
        const descMatch = headChunk.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
        if (descMatch && descMatch[1]) {
          description = decodeHtmlEntities(descMatch[1]);
        }
      }

      // 3. Extract Preview Image
      let previewImageUrl: string | undefined = undefined;
      const ogImageMatch = headChunk.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                           headChunk.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
      if (ogImageMatch && ogImageMatch[1]) {
        const rawImg = ogImageMatch[1].trim();
        if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) {
          previewImageUrl = rawImg;
        } else if (rawImg.startsWith('/')) {
          const urlObj = new URL(cleanResult.cleanedUrl);
          previewImageUrl = `${urlObj.protocol}//${urlObj.host}${rawImg}`;
        }
      }

      // 4. Final title fallback
      if (!title) {
        title = domain;
      }

      const detectedType = this.detectResourceType(cleanResult.cleanedUrl, title);

      return {
        title,
        description,
        domain,
        faviconUrl: fallbackFavicon,
        previewImageUrl,
        detectedType,
      };
    } catch {
      // Return safe fallback values on network timeout or failure
      return {
        title: domain,
        description: '',
        domain,
        faviconUrl: fallbackFavicon,
        detectedType: fallbackType,
      };
    }
  },
};
