// MintBlogger - Enhanced Blogger JavaScript Library

(function(window, document) {
  'use strict';

  const MintBlogger = {
    config: {
      postsPerPage: 7,
      relatedPostsCount: 3,
      defaultLanguage: 'en',
      supportedLanguages: ['en', 'ar'],
      translations: {
        en: {
          loadMore: 'Load More',
          loading: 'Loading...',
          noMorePosts: 'No more posts',
          copyLinkSuccess: 'Article link copied',
          readingTime: '{} min read',
          gridView: 'Grid View',
          listView: 'List View',
          relatedPosts: 'Suggested for you',
          errorOccurred: 'An error occurred. Please try again.'
        },
        ar: {
          loadMore: 'تحميل المزيد',
          loading: 'جاري التحميل...',
          noMorePosts: 'لا توجد مقالات أخرى',
          copyLinkSuccess: 'تم نسخ رابط المقال',
          readingTime: '{} دقائق للقراءة',
          gridView: 'عرض شبكي',
          listView: 'عرض القائمة',
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
          return await response.json();
        } catch (error) {
          console.error('Error fetching JSON:', error);
          throw error;
        }
      },
      formatDate: function(dateString) {
        const date = new Date(dateString);
        const lang = this.getLanguage();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', options);
      }
    },

    posts: {
      container: null,
      loadMoreButton: null,
      currentPage: 1,
      isLoading: false,
      isGridView: localStorage.getItem('gridView') !== 'false',
      authorImages: {},

      init: function() {
        this.container = document.getElementById('articles-grid');
        this.loadMoreButton = document.getElementById('load-more-button');
        
        if (this.container && this.loadMoreButton) {
          this.loadMoreButton.addEventListener('click', this.loadMore.bind(this));
          this.setupViewToggle();
          this.applyCurrentView();
        }
      },

      loadMore: async function() {
        if (this.isLoading) return;
        this.isLoading = true;
        
        const originalButtonText = this.loadMoreButton.textContent;
        this.loadMoreButton.innerHTML = originalButtonText + " <span class='mask spin'></span>";
        this.loadMoreButton.disabled = true;

        try {
          const data = await this.fetchPosts();
          
          if (!data || !data.feed || !data.feed.entry || data.feed.entry.length === 0) {
            this.showNoMorePosts();
            return;
          }

          const posts = data.feed.entry;

          // Add skeleton loaders
          for (let i = 0; i < posts.length; i++) {
            this.container.innerHTML += '<div class="skeleton rounded-lg dark:bg-neutral-800 h-96"></div>';
          }

          // Replace skeleton loaders with actual posts
          setTimeout(() => {
            this.container.querySelectorAll('.skeleton').forEach(skeleton => skeleton.remove());
            posts.forEach(post => {
              const postElement = this.createPostElement(post);
              if (postElement) {
                this.container.appendChild(postElement);
              }
            });

            this.currentPage++;
            this.isLoading = false;
            this.loadMoreButton.innerHTML = originalButtonText;
            this.loadMoreButton.disabled = false;
            this.applyCurrentView();
          }, 250);

        } catch (error) {
          console.error('Error loading more posts:', error);
          this.showError();
        }
      },

      fetchPosts: async function() {
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('q');
        const labelName = window.location.pathname.split('/').pop();
        const isSearchPage = searchQuery !== null;
        const isLabelPage = window.location.pathname.includes('/label/');

        let apiUrl = `${document.location.origin}/feeds/posts/summary?alt=json&orderby=published&start-index=${this.currentPage * MintBlogger.config.postsPerPage + 1}&max-results=${MintBlogger.config.postsPerPage}`;
        
        if (isSearchPage) {
          apiUrl += `&q=${encodeURIComponent(searchQuery)}`;
        } else if (isLabelPage) {
          apiUrl += `/-/${encodeURIComponent(labelName)}`;
        }

        return await MintBlogger.util.fetchJSON(apiUrl);
      },

      createPostElement: function(post) {
        if (!post) return null;

        const postElement = document.createElement('div');
        postElement.className = 'rounded-lg dark:bg-neutral-800';
        
        const title = post.title && post.title.$t ? post.title.$t : 'No Title';
        const url = post.link ? post.link.find(link => link.rel === 'alternate').href : '#';
        const image = post.media$thumbnail ? post.media$thumbnail.url.replace(/\/s[0-9]+(\-c)?\//, '/s640/') : 'https://via.placeholder.com/640x360';
        
        let excerpt = 'No excerpt available';
        if (post.summary && post.summary.$t) {
          excerpt = post.summary.$t;
        } else if (post.content && post.content.$t) {
          const div = document.createElement('div');
          div.innerHTML = post.content.$t;
          excerpt = div.textContent || div.innerText || '';
        }
        excerpt = excerpt.substring(0, 100).trim() + (excerpt.length > 100 ? '...' : '');

        const author = post.author && post.author[0] && post.author[0].name ? post.author[0].name.$t : 'Unknown Author';
        
        const dateIso = post.published && post.published.$t ? post.published.$t : new Date().toISOString();
        const dateFormatted = MintBlogger.util.formatDate(dateIso);

        // Get the author's image
        let authorImage = this.getAuthorImage(post);

        postElement.innerHTML = `
          <div class="w-full h-60 rounded-t-lg">
            <a aria-label="Image" href="${url}">
              <img alt="${title}" class="object-cover w-full h-full rounded-t-lg nice-effect" src="${image}">
            </a>
          </div>
          <div class="p-4 dark:bg-neutral-800">
            <h3 class="text-lg font-semibold mb-5">
              <a class="link-title" href="${url}">${title}</a>
            </h3>
            <p class="text-sm text-neutral-600 dark:text-neutral-300">${excerpt}</p>
            <div class="shrink-0 group block mt-4">
              <div class="flex items-center">
                <img alt="Avatar" class="inline-block shrink-0 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full" src="${authorImage}">
                <div class="rtl:mr-3 ltr:ml-3">
                  <h3 class="font-semibold text-neutral-800 dark:text-neutral-300 text-sm sm:text-base">
                    ${author}
                  </h3>
                  <time datetime="${dateIso}" class="text-xs sm:text-sm text-neutral-500">
                    ${dateFormatted}
                  </time>
                </div>
              </div>
            </div>
          </div>
        `;

        return postElement;
      },

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
      },

      showNoMorePosts: function() {
        this.loadMoreButton.textContent = MintBlogger.util.translate('noMorePosts');
        this.loadMoreButton.disabled = true;
        this.loadMoreButton.className = 'py-3 px-6 text-sm rounded-lg border border-primary text-primary cursor-not-allowed font-semibold text-center shadow-xs transition-all duration-500 bg-gray-300 text-gray-600';
        this.isLoading = false;
      },

      showError: function() {
        this.loadMoreButton.textContent = MintBlogger.util.translate('errorOccurred');
        this.loadMoreButton.classList.add('err');
        
        setTimeout(() => {
          this.loadMoreButton.textContent = MintBlogger.util.translate('loadMore');
          this.loadMoreButton.classList.remove('err');
          this.loadMoreButton.disabled = false;
        }, 1500);
      },

      setupViewToggle: function() {
        const gridIcon = document.getElementById('grid-icon');
        const listIcon = document.getElementById('list-icon');

        if (gridIcon && listIcon) {
          gridIcon.addEventListener('click', () => this.toggleView(true));
          listIcon.addEventListener('click', () => this.toggleView(false));
        }
      },

      toggleView: function(gridView) {
        this.isGridView = gridView;
        localStorage.setItem('gridView', gridView);
        this.applyCurrentView();
      },

      applyCurrentView: function() {
        const gridIcon = document.getElementById('grid-icon');
        const listIcon = document.getElementById('list-icon');

        gridIcon.classList.toggle('active', this.isGridView);
        listIcon.classList.toggle('active', !this.isGridView);
        this.container.className = `grid gap-6 ${this.isGridView ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`;

        this.container.querySelectorAll('.rounded-lg.dark\\:bg-neutral-800').forEach((card) => {
          if (this.isGridView) {
            card.className = 'rounded-lg dark:bg-neutral-800';
            card.firstElementChild.className = 'w-full h-60 rounded-t-lg';
          } else {
            card.className = 'rounded-lg flex dark:bg-neutral-800';
            card.firstElementChild.className = 'w-1/3 md:h-48 h-60 rounded-r-lg';
          }
          card.lastElementChild.className = `p-4 dark:bg-neutral-800 ${this.isGridView ? '' : 'flex-1'}`;
        });
      }
    },

    relatedPosts: {
      container: null,

      init: function() {
        this.container = document.querySelector('.items-related');
        if (this.container) {
          this.loadRelatedPosts();
        }
      },

      loadRelatedPosts: async function() {
        try {
          const labels = this.getPostLabels();
          if (labels.length === 0) return;

          const data = await this.fetchRelatedPosts(labels);
          this.renderRelatedPosts(data.feed.entry);
        } catch (error) {
          console.error('Error loading related posts:', error);
        }
      },

      getPostLabels: function() {
        const labelElements = document.querySelectorAll('.post-labels a');
        return Array.from(labelElements).map(el => el.textContent);
      },

      fetchRelatedPosts: async function(labels) {
        const query = labels.map(label => `label:"${label}"`).join('|');
        const apiUrl = `${document.location.origin}/feeds/posts/default?alt=json&orderby=published&max-results=${MintBlogger.config.relatedPostsCount}&q=${encodeURIComponent(query)}`;
        return await MintBlogger.util.fetchJSON(apiUrl);
      },

      renderRelatedPosts: function(posts) {
        if (!posts || posts.length === 0) return;

        const relatedPostsContainer = this.container.querySelector('.grid');
        relatedPostsContainer.innerHTML = '';

        posts.forEach(post => {
          const postElement = this.createRelatedPostElement(post);
          relatedPostsContainer.appendChild(postElement);
        });
      },

      createRelatedPostElement: function(post) {
        const title = post.title.$t;
        const url = post.link.find(link => link.rel === 'alternate').href;
        const image = post.media$thumbnail ? post.media$thumbnail.url.replace(/\/s[0-9]+(\-c)?\//, '/s300-c/') : 'https://via.placeholder.com/300x200';
        const author = post.author[0].name.$t;
        const dateIso = post.published.$t;
        const dateFormatted = MintBlogger.util.formatDate(dateIso);
        const authorImage = MintBlogger.posts.getAuthorImage(post);

        const article = document.createElement('article');
        article.className = 'relative isolate flex flex-col justify-end overflow-hidden rounded-lg bg-gray-900 px-4 pb-4 pt-32 sm:pt-24 lg:pt-32';
        article.innerHTML = `
          <img alt="" class="absolute inset-0 -z-10 h-full w-full object-cover" width="300" height="200" style="aspect-ratio: 300 / 200; object-fit: cover" src="${image}">
          <div class="absolute inset-0 -z-10 bg-gradient-to-t from-gray-900 via-gray-900/40"></div>
          <div class="absolute inset-0 -z-10 rounded-lg ring-1 ring-inset ring-gray-900/10"></div>
          <div class="flex flex-wrap items-center gap-y-1 overflow-hidden text-sm leading-6 text-gray-300">
            <time datetime="${dateIso}" class="rtl:ml-4 ltr:mr-4">${dateFormatted}</time>
            <div class="rtl:mr-2 ltr:ml-2 flex items-center gap-x-2 text-gray-500">
              <span class="relative flex overflow-hidden rounded-full h-5 w-5 flex-none">
                <img class="aspect-square h-full w-full" alt="${author}" src="${authorImage}">
              </span>
              <span>${author}</span>
            </div>
          </div>
          <h3 class="mt-2 text-base font-semibold leading-6 text-white">
            <a href="${url}">${title}</a>
          </h3>
        `;

        return article;
      }
    },

    init: function() {
      this.posts.init();
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

console.log("MintBlogger initialized successfully!");
