// MintBlogger - Enhanced Blogger JavaScript Library

(function(window, document) {
  'use strict';

  const MintBlogger = {
    config: {
      postsPerPage: 7,
      commentsPerPage: 5,
      relatedPostsCount: 5,
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
          commentCount: '{} Comments',
          relatedPosts: 'Related Posts',
          errorOccurred: 'An error occurred. Please try again.'
        },
        ar: {
          loadMore: 'تحميل المزيد',
          loading: 'جاري التحميل...',
          noMorePosts: 'لا توجد مزيد من المقالات',
          copyLinkSuccess: 'تم نسخ رابط المقال',
          readingTime: '{} دقائق للقراءة',
          gridView: 'عرض شبكي',
          listView: 'عرض القائمة',
          commentCount: '{} تعليقات',
          relatedPosts: 'مقالات ذات صلة',
          errorOccurred: 'حدث خطأ. يرجى المحاولة مرة أخرى.'
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
      createElement: function(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        Object.entries(attributes).forEach(([key, value]) => {
          if (key === 'className') {
            element.className = value;
          } else {
            element.setAttribute(key, value);
          }
        });
        children.forEach(child => {
          if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
          } else {
            element.appendChild(child);
          }
        });
        return element;
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
      isGridView: true,

      init: function() {
        this.container = document.getElementById('mintblogger-posts');
        this.loadMoreButton = document.getElementById('load-more-button');
        
        if (this.container && this.loadMoreButton) {
          this.loadMoreButton.addEventListener('click', this.loadMore.bind(this));
          this.loadInitialPosts();
          this.setupViewToggle();
        }
      },

      loadInitialPosts: async function() {
        try {
          const data = await this.fetchPosts();
          this.renderPosts(data.feed.entry);
        } catch (error) {
          console.error('Error loading initial posts:', error);
          this.showError();
        }
      },

      loadMore: async function() {
        if (this.isLoading) return;
        this.isLoading = true;
        this.updateLoadMoreButton(true);

        try {
          const data = await this.fetchPosts();
          if (data.feed.entry && data.feed.entry.length > 0) {
            this.renderPosts(data.feed.entry);
            this.currentPage++;
          } else {
            this.showNoMorePosts();
          }
        } catch (error) {
          console.error('Error loading more posts:', error);
          this.showError();
        } finally {
          this.isLoading = false;
          this.updateLoadMoreButton(false);
        }
      },

      fetchPosts: async function() {
        const apiUrl = `${document.location.origin}/feeds/posts/summary?alt=json&orderby=published&start-index=${this.currentPage * MintBlogger.config.postsPerPage + 1}&max-results=${MintBlogger.config.postsPerPage}`;
        return await MintBlogger.util.fetchJSON(apiUrl);
      },

      renderPosts: function(posts) {
        posts.forEach(post => {
          const postElement = this.createPostElement(post);
          this.container.appendChild(postElement);
        });
        this.applyCurrentView();
      },

      createPostElement: function(post) {
        const title = post.title.$t;
        const url = post.link.find(link => link.rel === 'alternate').href;
        const image = post.media$thumbnail ? post.media$thumbnail.url.replace(/\/s[0-9]+(\-c)?\//, '/s640/') : 'https://via.placeholder.com/640x360';
        const excerpt = this.getExcerpt(post);
        const author = post.author[0].name.$t;
        const date = MintBlogger.util.formatDate(post.published.$t);

        return MintBlogger.util.createElement('div', { className: 'mintblogger-post' }, [
          MintBlogger.util.createElement('div', { className: 'post-image' }, [
            MintBlogger.util.createElement('a', { href: url }, [
              MintBlogger.util.createElement('img', { src: image, alt: title, className: 'w-full h-full object-cover' })
            ])
          ]),
          MintBlogger.util.createElement('div', { className: 'post-content' }, [
            MintBlogger.util.createElement('h3', { className: 'post-title' }, [
              MintBlogger.util.createElement('a', { href: url }, [title])
            ]),
            MintBlogger.util.createElement('p', { className: 'post-excerpt' }, [excerpt]),
            MintBlogger.util.createElement('div', { className: 'post-meta' }, [
              MintBlogger.util.createElement('span', { className: 'post-author' }, [author]),
              MintBlogger.util.createElement('span', { className: 'post-date' }, [date])
            ])
          ])
        ]);
      },

      getExcerpt: function(post) {
        let excerpt = post.summary ? post.summary.$t : '';
        excerpt = excerpt.replace(/<[^>]+>/g, '');
        return excerpt.length > 100 ? excerpt.substring(0, 100) + '...' : excerpt;
      },

      updateLoadMoreButton: function(isLoading) {
        this.loadMoreButton.textContent = isLoading ? MintBlogger.util.translate('loading') : MintBlogger.util.translate('loadMore');
        this.loadMoreButton.disabled = isLoading;
      },

      showNoMorePosts: function() {
        this.loadMoreButton.textContent = MintBlogger.util.translate('noMorePosts');
        this.loadMoreButton.disabled = true;
      },

      showError: function() {
        this.loadMoreButton.textContent = MintBlogger.util.translate('errorOccurred');
        this.loadMoreButton.disabled = true;
      },

      setupViewToggle: function() {
        const gridButton = document.getElementById('grid-view-button');
        const listButton = document.getElementById('list-view-button');

        if (gridButton && listButton) {
          gridButton.addEventListener('click', () => this.toggleView(true));
          listButton.addEventListener('click', () => this.toggleView(false));
        }
      },

      toggleView: function(isGrid) {
        this.isGridView = isGrid;
        localStorage.setItem('mintbloggerGridView', isGrid);
        this.applyCurrentView();
      },

      applyCurrentView: function() {
        const gridButton = document.getElementById('grid-view-button');
        const listButton = document.getElementById('list-view-button');

        if (this.isGridView) {
          this.container.classList.add('grid-view');
          this.container.classList.remove('list-view');
          gridButton.classList.add('active');
          listButton.classList.remove('active');
        } else {
          this.container.classList.add('list-view');
          this.container.classList.remove('grid-view');
          listButton.classList.add('active');
          gridButton.classList.remove('active');
        }
      }
    },

    comments: {
      container: null,
      loadMoreButton: null,
      currentPage: 1,
      isLoading: false,

      init: function() {
        this.container = document.getElementById('mintblogger-comments');
        this.loadMoreButton = document.getElementById('load-more-comments');
        
        if (this.container && this.loadMoreButton) {
          this.loadMoreButton.addEventListener('click', this.loadMore.bind(this));
          this.loadInitialComments();
        }
      },

      loadInitialComments: async function() {
        try {
          const data = await this.fetchComments();
          this.renderComments(data.feed.entry);
        } catch (error) {
          console.error('Error loading initial comments:', error);
          this.showError();
        }
      },

      loadMore: async function() {
        if (this.isLoading) return;
        this.isLoading = true;
        this.updateLoadMoreButton(true);

        try {
          const data = await this.fetchComments();
          if (data.feed.entry && data.feed.entry.length > 0) {
            this.renderComments(data.feed.entry);
            this.currentPage++;
          } else {
            this.showNoMoreComments();
          }
        } catch (error) {
          console.error('Error loading more comments:', error);
          this.showError();
        } finally {
          this.isLoading = false;
          this.updateLoadMoreButton(false);
        }
      },

      fetchComments: async function() {
        const apiUrl = `${document.location.origin}/feeds/comments/default?alt=json&orderby=published&start-index=${this.currentPage * MintBlogger.config.commentsPerPage + 1}&max-results=${MintBlogger.config.commentsPerPage}`;
        return await MintBlogger.util.fetchJSON(apiUrl);
      },

      renderComments: function(comments) {
        comments.forEach(comment => {
          const commentElement = this.createCommentElement(comment);
          this.container.appendChild(commentElement);
        });
      },

      createCommentElement: function(comment) {
        const author = comment.author[0].name.$t;
        const content = comment.content.$t;
        const date = MintBlogger.util.formatDate(comment.published.$t);
        const postTitle = comment.title.$t.split(' on ')[1];

        return MintBlogger.util.createElement('div', { className: 'mintblogger-comment' }, [
          MintBlogger.util.createElement('div', { className: 'comment-author' }, [author]),
          MintBlogger.util.createElement('div', { className: 'comment-content' }, [content]),
          MintBlogger.util.createElement('div', { className: 'comment-meta' }, [
            MintBlogger.util.createElement('span', { className: 'comment-date' }, [date]),
            MintBlogger.util.createElement('span', { className: 'comment-post' }, [postTitle])
          ])
        ]);
      },

      updateLoadMoreButton: function(isLoading) {
        this.loadMoreButton.textContent = isLoading ? MintBlogger.util.translate('loading') : MintBlogger.util.translate('loadMore');
        this.loadMoreButton.disabled = isLoading;
      },

      showNoMoreComments: function() {
        this.loadMoreButton.textContent = MintBlogger.util.translate('noMoreComments');
        this.loadMoreButton.disabled = true;
      },

      showError: function() {
        this.loadMoreButton.textContent = MintBlogger.util.translate('errorOccurred');
        this.loadMoreButton.disabled = true;
      }
    },

    relatedPosts: {
      container: null,

      init: function() {
        this.container = document.getElementById('mintblogger-related-posts');
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

        const heading = MintBlogger.util.createElement('h3', { className: 'related-posts-heading' }, [
          MintBlogger.util.translate('relatedPosts')
        ]);
        this.container.appendChild(heading);

        const list = MintBlogger.util.createElement('ul', { className: 'related-posts-list' });
        posts.forEach(post => {
          const listItem = this.createRelatedPostElement(post);
          list.appendChild(listItem);
        });
        this.container.appendChild(list);
      },

      createRelatedPostElement: function(post) {
        const title = post.title.$t;
        const url = post.link.find(link => link.rel === 'alternate').href;

        return MintBlogger.util.createElement('li', { className: 'related-post-item' }, [
          MintBlogger.util.createElement('a', { href: url }, [title])
        ]);
      }
    },

    postUtilities: {
      init: function() {
        this.setupCopyLink();
        this.calculateReadingTime();
      },

      setupCopyLink: function() {
        const copyButton = document.getElementById('copy-link-button');
        if (copyButton) {
          copyButton.addEventListener('click', this.copyPostUrl.bind(this));
        }
      },

      copyPostUrl: function() {
        navigator.clipboard.writeText(window.location.href).then(() => {
          this.showTooltip(MintBlogger.util.translate('copyLinkSuccess'));
        }).catch(err => {
          console.error('Could not copy text: ', err);
        });
      },

      showTooltip: function(message) {
        const tooltip = document.getElementById('copy-link-tooltip');
        if (tooltip) {
          tooltip.textContent = message;
          tooltip.classList.remove('opacity-0');
          tooltip.classList.add('opacity-100');

          setTimeout(() => {
            tooltip.classList.remove('opacity-100');
            tooltip.classList.add('opacity-0');
          }, 2000);
        }
      },

      calculateReadingTime: function() {
        const articleContent = document.querySelector('.post-body');
        const readingTimeElement = document.getElementById('reading-time');
        
        if (articleContent && readingTimeElement) {
          const text = articleContent.textContent || articleContent.innerText;
          const wordCount = text.trim().split(/\s+/).length;
          const readingTime = Math.ceil(wordCount / 200);
          
          readingTimeElement.textContent = MintBlogger.util.translate('readingTime', readingTime);
        }
      }
    },

    init: function() {
      this.posts.init();
      this.comments.init();
      this.relatedPosts.init();
      this.postUtilities.init();
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
