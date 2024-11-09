// MintBlogger - Enhanced Blogger JavaScript Library

(function(window, document) {
  'use strict';

  const MintBlogger = {
    config: {
      postsPerPage: 7,
      commentsPerPage: 5,
      relatedPostsCount: 3,
      defaultLanguage: 'en',
      supportedLanguages: ['en', 'ar'],
      translations: {
        en: {
          loadMore: 'Load More',
          loading: 'Loading...',
          noMorePosts: 'No more posts',
          noMoreComments: 'No more comments',
          copyLinkSuccess: 'Article link copied',
          readingTime: '{} min read',
          gridView: 'Grid View',
          listView: 'List View',
          commentCount: '{} Comments',
          relatedPosts: 'Suggested for you',
          errorOccurred: 'An error occurred. Please try again.'
        },
        ar: {
          loadMore: 'تحميل المزيد',
          loading: 'جاري التحميل...',
          noMorePosts: 'لا توجد مزيد من المقالات',
          noMoreComments: 'لا توجد المزيد من التعليقات',
          copyLinkSuccess: 'تم نسخ رابط المقال',
          readingTime: '{} دقائق للقراءة',
          gridView: 'عرض شبكي',
          listView: 'عرض القائمة',
          commentCount: '{} تعليقات',
          relatedPosts: 'مقترح لك',
          errorOccurred: 'حدث خطأ. حاول مرة أخرى.'
        }
      }
    },

    util: {
      isRTL: function() {
        return document.documentElement.dir === 'rtl';
      },
      getLanguage: function() {
        const htmlLang = document.documentElement.lang.split('-')[0];
        return MintBlogger.config.supportedLanguages.includes(htmlLang) ? htmlLang : MintBlogger.config.defaultLanguage;
      },
      translate: function(key, count) {
        const lang = this.getLanguage();
        let text = MintBlogger.config.translations[lang][key] || key;
        return count !== undefined ? text.replace('{}', count) : text;
      },
      fetchJSON: async function(url) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return await response.json();
        } catch (error) {
          throw error;
        }
      },
      formatDate: function(dateString) {
        const date = new Date(dateString);
        const lang = this.getLanguage();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', options);
      },
      shuffleArray: function(array) {
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      }
    },

    posts: {
      authorImages: {},
      getAuthorImage: function(post) {
        const authorId = post.author[0].gd$image.src;
        if (this.authorImages[authorId]) {
          return this.authorImages[authorId];
        }

        let authorImage = 'https://lh3.googleusercontent.com/a/default-user';
        if (!authorId.includes('g/blank.gif') && !authorId.includes('g/b16-rounded.gif')) {
          authorImage = authorId.replace(/\/s\d+-c\//, '/s80-c/');
        }

        this.authorImages[authorId] = authorImage;
        return authorImage;
      }
    },

    relatedPosts: {
      container: null,

      init: function() {
        this.container = document.getElementById('mintblogger-related-posts');
        if (this.container && this.container.getAttribute('data-bjs') === 'related') {
          this.loadRelatedPosts();
        }
      },

      loadRelatedPosts: async function() {
        try {
          const postId = this.container.getAttribute('data-id');
          const tagsAttr = this.container.getAttribute('data-tags');
          const tags = tagsAttr ? JSON.parse(tagsAttr.replace(/&quot;/g, '"')) : [];
          const maxResults = parseInt(this.container.getAttribute('data-max-results'), 10) || 15;
          const length = parseInt(this.container.getAttribute('data-length'), 10) || 3;

          if (tags.length === 0) {
            return;
          }

          const data = await this.fetchRelatedPosts(tags, maxResults);
          const filteredPosts = this.filterAndShufflePosts(data.feed.entry, postId, length);
          this.renderRelatedPosts(filteredPosts);
        } catch (error) {
          this.showErrorMessage();
        }
      },

      fetchRelatedPosts: async function(tags, maxResults) {
        const query = tags.map(tag => `label:"${tag}"`).join('|');
        const apiUrl = `${document.location.origin}/feeds/posts/default?alt=json&orderby=published&max-results=${maxResults}&q=${encodeURIComponent(query)}`;
        return await MintBlogger.util.fetchJSON(apiUrl);
      },

      filterAndShufflePosts: function(posts, currentPostId, length) {
        if (!posts) {
          return [];
        }
        const filteredPosts = posts.filter(post => post.id.$t !== currentPostId);
        return MintBlogger.util.shuffleArray(filteredPosts).slice(0, length);
      },

      renderRelatedPosts: function(posts) {
        if (!posts || posts.length === 0) {
          return;
        }

        this.container.innerHTML = `
          <div class="items-related">
            <div class="widget-title mb-4">
              <h3 class="text-lg font-bold text-color-text mb-2 dark:text-neutral-100">${MintBlogger.util.translate('relatedPosts')}</h3>
              <div class="title-border flex items-center gap-1" aria-hidden="true">
                <div class="h-1 bg-primary rounded-full w-16"></div>
                <div class="h-1 bg-primary opacity-60 rounded-full w-4"></div>
                <div class="h-1 bg-primary opacity-30 rounded-full w-2"></div>
              </div>
            </div>
            <div class="mx-auto mt-3 grid max-w-2xl auto-rows-fr grid-cols-1 gap-4 sm:mt-6 lg:mx-0 lg:max-w-none lg:grid-cols-3" dir="${document.dir}">
              ${posts.map(post => this.createRelatedPostElement(post)).join('')}
            </div>
          </div>
        `;
      },

      createRelatedPostElement: function(post) {
        const title = post.title.$t;
        const url = post.link.find(link => link.rel === 'alternate').href;
        const image = post.media$thumbnail ? post.media$thumbnail.url.replace(/\/s[0-9]+(\-c)?\//, '/s300-c/') : 'https://via.placeholder.com/300x200';
        const author = post.author[0].name.$t;
        const dateIso = post.published.$t;
        const dateFormatted = MintBlogger.util.formatDate(dateIso);
        const authorImage = MintBlogger.posts.getAuthorImage(post);

        return `
          <article class="relative isolate flex flex-col justify-end overflow-hidden rounded-lg bg-gray-900 px-4 pb-4 pt-32 sm:pt-24 lg:pt-32">
            <img alt="" class="absolute inset-0 -z-10 h-full w-full object-cover" width="300" height="200" style="aspect-ratio: 300 / 200; object-fit: cover" src="${image}">
            <div class="absolute inset-0 -z-10 bg-gradient-to-t from-gray-900 via-gray-900/40"></div>
            <div class="absolute inset-0 -z-10 rounded-lg ring-1 ring-inset ring-gray-900/10"></div>
            <div class="flex flex-wrap items-center gap-y-1 overflow-hidden text-sm leading-6 text-gray-300">
              <time datetime="${dateIso}" class="${MintBlogger.util.isRTL() ? 'ml-4' : 'mr-4'}">${dateFormatted}</time>
              <div class="${MintBlogger.util.isRTL() ? 'mr-2' : 'ml-2'} flex items-center gap-x-2 text-gray-500">
                <span class="relative flex overflow-hidden rounded-full h-5 w-5 flex-none">
                  <img class="aspect-square h-full w-full" alt="${author}" src="${authorImage}">
                </span>
                <span>${author}</span>
              </div>
            </div>
            <h3 class="mt-2 text-base font-semibold leading-6 text-white">
              <a href="${url}">${title}</a>
            </h3>
          </article>
        `;
      },

      showErrorMessage: function() {
        this.container.innerHTML = '<p class="text-red-500">Error loading related posts. Please try again later.</p>';
      }
    },

    init: function() {
      this.relatedPosts.init();
    }
  };

  // Initialize MintBlogger when the DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', MintBlogger.init.bind(MintBlogger));
  } else {
    MintBlogger.init();
  }

  // Export MintBlogger for use in Blogger templates
  window.MintBlogger = MintBlogger;

})(window, document);
