import { linkService, decodeHtmlEntities, RESOURCE_TYPE_CONFIGS } from '../src/services/linkService';

describe('Smart Saved Links & Resource Manager Unit Tests', () => {
  describe('Smart URL Cleaner & Tracker Stripper', () => {
    test('removes standard Google Analytics UTM tracking parameters', () => {
      const url = 'https://example.com/article?utm_source=google&utm_medium=cpc&utm_campaign=summer_sale';
      const res = linkService.cleanUrl(url);

      expect(res.isValid).toBe(true);
      expect(res.cleanedUrl).toBe('https://example.com/article');
      expect(res.removedParams).toContain('utm_source');
      expect(res.removedParams).toContain('utm_medium');
      expect(res.removedParams).toContain('utm_campaign');
    });

    test('removes social media ad tracking (fbclid, gclid, msclkid, igshid)', () => {
      const url = 'https://react.dev/blog/react-19?fbclid=IwAR123456&gclid=EAIaIQobChMI&msclkid=abcd987';
      const res = linkService.cleanUrl(url);

      expect(res.cleanedUrl).toBe('https://react.dev/blog/react-19');
      expect(res.removedParams).toContain('fbclid');
      expect(res.removedParams).toContain('gclid');
      expect(res.removedParams).toContain('msclkid');
    });

    test('STRICTLY PRESERVES functional query parameters (id, page, article, video, doc)', () => {
      const url = 'https://example.com/lecture?id=123&page=5&article=456&utm_source=twitter';
      const res = linkService.cleanUrl(url);

      expect(res.cleanedUrl).toBe('https://example.com/lecture?id=123&page=5&article=456');
      expect(res.removedParams).toEqual(['utm_source']);
    });

    test('preserves YouTube video ID (v parameter) while removing share tracking (si)', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=tracking123&feature=share';
      const res = linkService.cleanUrl(url);

      expect(res.cleanedUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(res.removedParams).toContain('si');
    });

    test('prepends https:// when user enters a bare domain or path', () => {
      const url = 'github.com/facebook/react';
      const res = linkService.cleanUrl(url);

      expect(res.isValid).toBe(true);
      expect(res.cleanedUrl).toBe('https://github.com/facebook/react');
      expect(res.domain).toBe('github.com');
    });

    test('handles empty and invalid input safely without crashing', () => {
      const res1 = linkService.cleanUrl('');
      expect(res1.isValid).toBe(false);
      expect(res1.cleanedUrl).toBe('');

      const res2 = linkService.cleanUrl('   ');
      expect(res2.isValid).toBe(false);
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
