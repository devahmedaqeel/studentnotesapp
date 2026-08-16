import { linkService, decodeHtmlEntities, RESOURCE_TYPE_CONFIGS, TRACKING_QUERY_PARAMS, FUNCTIONAL_QUERY_PARAMS } from '../src/services/linkService';

describe('Smart Saved Links & Resource Manager Unit Tests', () => {
  describe('Smart URL Cleaner & Tracker Stripper', () => {
    test('removes standard Google Analytics UTM tracking parameters', () => {
      const url = 'https://example.com/article?utm_source=google&utm_medium=cpc&utm_campaign=summer_sale&utm_term=react&utm_content=logolink';
      const res = linkService.cleanUrl(url);

      expect(res.isValid).toBe(true);
      expect(res.cleanedUrl).toBe('https://example.com/article');
      expect(res.removedParams).toContain('utm_source');
      expect(res.removedParams).toContain('utm_medium');
      expect(res.removedParams).toContain('utm_campaign');
      expect(res.removedParams).toContain('utm_term');
      expect(res.removedParams).toContain('utm_content');
      expect(res.hasTrackingParams).toBe(true);
    });

    test('removes social media ad tracking (fbclid, gclid, msclkid, igshid, ttclid, yclid, twclid)', () => {
      const url = 'https://react.dev/blog/react-19?fbclid=IwAR123456&gclid=EAIaIQobChMI&msclkid=abcd987&igshid=xyz123&ttclid=tt456';
      const res = linkService.cleanUrl(url);

      expect(res.cleanedUrl).toBe('https://react.dev/blog/react-19');
      expect(res.removedParams).toContain('fbclid');
      expect(res.removedParams).toContain('gclid');
      expect(res.removedParams).toContain('msclkid');
      expect(res.removedParams).toContain('igshid');
      expect(res.removedParams).toContain('ttclid');
    });

    test('STRICTLY PRESERVES functional query parameters (id, page, article, doc, query, search)', () => {
      const url = 'https://example.com/lecture?id=123&page=5&article=456&search=calculus&utm_source=twitter';
      const res = linkService.cleanUrl(url);

      expect(res.cleanedUrl).toBe('https://example.com/lecture?id=123&page=5&article=456&search=calculus');
      expect(res.removedParams).toEqual(['utm_source']);
      expect(res.preservedParams.some((p) => p.startsWith('id='))).toBe(true);
      expect(res.preservedParams.some((p) => p.startsWith('page='))).toBe(true);
    });

    test('preserves YouTube video ID (v parameter) and timestamp (t parameter) while removing share tracking (si, feature=share)', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&si=tracking123&feature=share';
      const res = linkService.cleanUrl(url);

      expect(res.cleanedUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s');
      expect(res.removedParams).toContain('si');
      expect(res.removedParams).toContain('feature');
    });

    test('preserves unknown custom query parameters by default', () => {
      const url = 'https://api.example.com/v1/data?custom_filter=enabled&dataset_version=2&utm_medium=email';
      const res = linkService.cleanUrl(url);

      expect(res.cleanedUrl).toBe('https://api.example.com/v1/data?custom_filter=enabled&dataset_version=2');
      expect(res.removedParams).toEqual(['utm_medium']);
    });

    test('supports Keep Original mode by disabling removeTracking option', () => {
      const url = 'https://example.com/item?id=99&utm_source=newsletter&fbclid=abc';
      const res = linkService.cleanUrl(url, { removeTracking: false });

      expect(res.cleanedUrl).toBe('https://example.com/item?id=99&utm_source=newsletter&fbclid=abc');
      expect(res.removedParams).toContain('utm_source');
      expect(res.removedParams).toContain('fbclid');
    });

    test('prepends https:// when user enters a bare domain or path', () => {
      const url = 'github.com/facebook/react';
      const res = linkService.cleanUrl(url);

      expect(res.isValid).toBe(true);
      expect(res.cleanedUrl).toBe('https://github.com/facebook/react');
      expect(res.domain).toBe('github.com');
    });

    test('extracts clean URL and title from natural shared text with title and link', () => {
      const input = 'Ahmed Aqeel | AI-Powered Full Stack App Expert https://share.google/ls25w648faOReU0sK';
      const res = linkService.cleanUrl(input);

      expect(res.isValid).toBe(true);
      expect(res.cleanedUrl).toBe('https://share.google/ls25w648faOReU0sK');
      expect(res.domain).toBe('share.google');
      expect(res.extractedTitle).toBe('Ahmed Aqeel | AI-Powered Full Stack App Expert');
    });

    test('extracts clean URL from WhatsApp/Telegram message with trailing punctuation', () => {
      const input = 'Check out this awesome React guide: https://react.dev/learn). Highly recommended!';
      const res = linkService.cleanUrl(input);

      expect(res.isValid).toBe(true);
      expect(res.cleanedUrl).toBe('https://react.dev/learn');
      expect(res.domain).toBe('react.dev');
    });

    test('extracts URL from markdown link format [Title](url)', () => {
      const input = '[Student Notes App](https://github.com/devahmedaqeel/studentnotesapp)';
      const res = linkService.cleanUrl(input);

      expect(res.isValid).toBe(true);
      expect(res.cleanedUrl).toBe('https://github.com/devahmedaqeel/studentnotesapp');
      expect(res.extractedTitle).toBe('Student Notes App');
    });

    test('handles empty and invalid input safely without crashing', () => {
      const res1 = linkService.cleanUrl('');
      expect(res1.isValid).toBe(false);
      expect(res1.cleanedUrl).toBe('');

      const res2 = linkService.cleanUrl('   ');
      expect(res2.isValid).toBe(false);

      const res3 = linkService.cleanUrl('not a valid url at all');
      expect(res3.isValid).toBe(false);
    });

    test('normalizes URL display format (removes protocol and www prefixes)', () => {
      const res = linkService.cleanUrl('https://www.coursera.org/learn/algorithms');
      expect(res.displayUrl).toBe('coursera.org/learn/algorithms');
    });
  });

  describe('Resource Type Auto-Detection', () => {
    test('identifies YouTube videos accurately', () => {
      expect(linkService.detectResourceType('https://youtube.com/watch?v=123')).toBe('youtube');
      expect(linkService.detectResourceType('https://youtu.be/xyz')).toBe('youtube');
    });

    test('identifies GitHub and GitLab code repositories accurately', () => {
      expect(linkService.detectResourceType('https://github.com/torvalds/linux')).toBe('github');
      expect(linkService.detectResourceType('https://gitlab.com/project/repo')).toBe('github');
    });

    test('identifies PDF documents from extension or path', () => {
      expect(linkService.detectResourceType('https://university.edu/slides/lecture1.pdf')).toBe('pdf');
      expect(linkService.detectResourceType('https://example.com/pdf/handout')).toBe('pdf');
    });

    test('identifies Research Papers from academic domains', () => {
      expect(linkService.detectResourceType('https://arxiv.org/abs/2301.00001')).toBe('paper');
      expect(linkService.detectResourceType('https://www.researchgate.net/publication/12345')).toBe('paper');
      expect(linkService.detectResourceType('https://ieeexplore.ieee.org/document/9876')).toBe('paper');
    });

    test('identifies Documentation websites', () => {
      expect(linkService.detectResourceType('https://react.dev/learn')).toBe('docs');
      expect(linkService.detectResourceType('https://developer.mozilla.org/en-US/docs/Web')).toBe('docs');
      expect(linkService.detectResourceType('https://docs.python.org/3/')).toBe('docs');
      expect(linkService.detectResourceType('https://tailwindcss.com/docs/installation')).toBe('docs');
    });

    test('identifies Online Courses', () => {
      expect(linkService.detectResourceType('https://www.coursera.org/learn/algorithms')).toBe('course');
      expect(linkService.detectResourceType('https://www.udemy.com/course/react-the-complete-guide/')).toBe('course');
      expect(linkService.detectResourceType('https://www.edx.org/course/cs50')).toBe('course');
    });

    test('identifies AI Tools & Resources', () => {
      expect(linkService.detectResourceType('https://chatgpt.com/')).toBe('ai_tool');
      expect(linkService.detectResourceType('https://claude.ai/')).toBe('ai_tool');
      expect(linkService.detectResourceType('https://huggingface.co/models')).toBe('ai_tool');
      expect(linkService.detectResourceType('https://v0.dev/')).toBe('ai_tool');
    });

    test('identifies University Resources', () => {
      expect(linkService.detectResourceType('https://canvas.mit.edu/courses/123')).toBe('university');
      expect(linkService.detectResourceType('https://portal.ox.ac.uk/students')).toBe('university');
    });

    test('identifies Blogs & Developer Articles', () => {
      expect(linkService.detectResourceType('https://medium.com/@author/my-article')).toBe('blog');
      expect(linkService.detectResourceType('https://dev.to/community/top-tips')).toBe('blog');
    });

    test('identifies Interactive Web Tools', () => {
      expect(linkService.detectResourceType('https://regex101.com/')).toBe('tool');
      expect(linkService.detectResourceType('https://codepen.io/pen/')).toBe('tool');
      expect(linkService.detectResourceType('https://figma.com/file/123')).toBe('tool');
    });
  });

  describe('HTML Entity Decoder', () => {
    test('decodes common HTML entities safely', () => {
      expect(decodeHtmlEntities('&lt;React &amp; Next.js Guide&gt;')).toBe('<React & Next.js Guide>');
      expect(decodeHtmlEntities('Student&#39;s Notes &quot;Edition&quot;')).toBe("Student's Notes \"Edition\"");
      expect(decodeHtmlEntities('Chapter 1 &ndash; Introduction &mdash; Overview')).toBe('Chapter 1 – Introduction — Overview');
    });

    test('handles empty or blank strings without throwing', () => {
      expect(decodeHtmlEntities('')).toBe('');
    });
  });

  describe('Favicon URL Generation', () => {
    test('generates valid Google S2 favicon service URLs', () => {
      const url = linkService.getFaviconUrl('react.dev');
      expect(url).toContain('https://www.google.com/s2/favicons?domain=react.dev');
    });
  });

  describe('Resource Type Configurations', () => {
    test('has complete configuration for all 15 resource types', () => {
      const types = Object.keys(RESOURCE_TYPE_CONFIGS);
      expect(types.length).toBe(15);
      for (const type of types) {
        const conf = (RESOURCE_TYPE_CONFIGS as any)[type];
        expect(conf.label).toBeDefined();
        expect(conf.icon).toBeDefined();
        expect(conf.color).toBeDefined();
        expect(conf.bgColor).toBeDefined();
      }
    });
  });
});
