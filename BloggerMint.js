class BloggerMint {
  constructor(options) {
    this.options = {
      homepage: window.location.origin,
      locale: document.documentElement.lang || 'en',
      defaultImage: 'https://via.placeholder.com/640x360',
      defaultAvatar: 'https://lh3.googleusercontent.com/a/default-user',
      perPage: 7,
      containerElementId: 'articles-grid',
      loadMoreButtonId: 'load-more-button',
      relatedPostsElementId: 'related-posts',
      commentsElementId: 'comments-container',
      searchQuery: new URLSearchParams(window.location.search).get('q'),
      labelName: window.location.pathname.includes('/label/') ? window.location.pathname.split('/').pop() : null,
      loadRelated: false,
      loadComments: false,
      loadSections: false,
      blogSections: [],
      ...options
    };

    this.state = {
      currentPage: 1,
      isLoading: false,
      isGridView: localStorage.getItem('gridView') !== 'false',
      hasMore: true
    };

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.applyCurrentView();
    if (this.options.loadRelated) this.loadRelatedPosts();
    if (this.options.loadSections) this.loadBlogSections();
    if (this.options.loadComments) this.loadComments();
    this.loadPosts();
  }

  setupEventListeners() {
    const loadMoreButton = document.getElementById(this.options.loadMoreButtonId);
    if (loadMoreButton) {
      loadMoreButton.addEventListener('click', () => this.loadPosts());
    }

    const gridIcon = document.getElementById('grid-icon');
    const listIcon = document.getElementById('list-icon');
    if (gridIcon && listIcon) {
      gridIcon.addEventListener('click', () => this.toggleView(true));
      listIcon.addEventListener('click', () => this.toggleView(false));
    }
  }

  async loadPosts() {
    if (this.state.isLoading || !this.state.hasMore) return;

    this.state.isLoading = true;
    this.updateLoadMoreButton('loading');

    try {
      const posts = await this.fetchPosts('posts');
      
      if (posts.length === 0) {
        this.state.hasMore = false;
        this.showNoMorePosts();
        return;
      }

      this.renderPosts(posts);
      this.state.currentPage++;
      this.applyCurrentView();
    } catch (error) {
      console.error('Error loading posts:', error);
      this.updateLoadMoreButton('error');
    } finally {
      this.state.isLoading = false;
      this.updateLoadMoreButton('normal');
    }
  }

  async fetchPosts(type = 'posts') {
    const { homepage, perPage } = this.options;
    const { currentPage } = this.state;
    let apiUrl = `${homepage}/feeds/${type}/summary?alt=json&orderby=published&start-index=${(currentPage - 1) * perPage + 1}&max-results=${perPage}`;

    if (this.options.searchQuery) {
      apiUrl += `&q=${encodeURIComponent(this.options.searchQuery)}`;
    } else if (this.options.labelName) {
      apiUrl += `/-/${encodeURIComponent(this.options.labelName)}`;
    }

    const response = await fetch(apiUrl);
    const data = await response.json();
    return data.feed.entry || [];
  }

  renderPosts(posts) {
    const container = document.getElementById(this.options.containerElementId);
    if (!container) return;

    posts.forEach(post => {
      const postElement = this.createPostElement(post);
      container.appendChild(postElement);
    });
  }

  createPostElement(post) {
    const postElement = document.createElement('div');
    postElement.className = 'rounded-lg dark:bg-neutral-800';
    
    const title = post.title?.$t || 'No Title';
    const url = post.link?.find(link => link.rel === 'alternate')?.href || '#';
    const image = post.media$thumbnail?.url.replace(/\/s[0-9]+(\-c)?\//, '/s640/') || this.options.defaultImage;
    const excerpt = this.getExcerpt(post);
    const author = post.author?.[0]?.name?.$t || 'Unknown Author';
    const dateFormatted = this.formatDate(post.published?.$t);
    const authorImage = post.author?.[0]?.gd$image?.src || this.options.defaultAvatar;

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
              <time datetime="${post.published?.$t}" class="text-xs sm:text-sm text-neutral-500">
                ${dateFormatted}
              </time>
            </div>
          </div>
        </div>
      </div>
    `;

    return postElement;
  }

  getExcerpt(post) {
    let excerpt = 'No excerpt available';
    if (post.summary?.$t) {
      excerpt = post.summary.$t;
    } else if (post.content?.$t) {
      const div = document.createElement('div');
      div.innerHTML = post.content.$t;
      excerpt = div.textContent || div.innerText || '';
    }
    return excerpt.substring(0, 100).trim() + (excerpt.length > 100 ? '...' : '');
  }

  formatDate(dateString) {
    const dateObj = new Date(dateString);
    const isArabic = this.options.locale.startsWith('ar');
    return dateObj.toLocaleDateString(this.options.locale, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  toggleView(gridView) {
    this.state.isGridView = gridView;
    localStorage.setItem('gridView', gridView.toString());
    this.applyCurrentView();
  }

  applyCurrentView() {
    const container = document.getElementById(this.options.containerElementId);
    if (!container) return;

    const { isGridView } = this.state;

    const gridIcon = document.getElementById('grid-icon');
    const listIcon = document.getElementById('list-icon');
    if (gridIcon) gridIcon.classList.toggle('active', isGridView);
    if (listIcon) listIcon.classList.toggle('active', !isGridView);

    container.className = `grid gap-6 ${isGridView ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`;

    container.querySelectorAll('> div').forEach((card) => {
      if (isGridView) {
        card.className = 'rounded-lg dark:bg-neutral-800';
        card.firstElementChild.className = 'w-full h-60 rounded-t-lg';
        card.lastElementChild.className = 'p-4 dark:bg-neutral-800';
      } else {
        card.className = 'rounded-lg flex dark:bg-neutral-800';
        card.firstElementChild.className = 'w-1/3 md:h-48 h-60 rounded-l-lg';
        card.lastElementChild.className = 'p-4 dark:bg-neutral-800 flex-1';
      }
    });
  }

  updateLoadMoreButton(state) {
    const loadMoreButton = document.getElementById(this.options.loadMoreButtonId);
    if (!loadMoreButton) return;

    const isArabic = this.options.locale.startsWith('ar');

    switch (state) {
      case 'loading':
        loadMoreButton.innerHTML = isArabic ? 'جاري التحميل...' : 'Loading...';
        loadMoreButton.disabled = true;
        break;
      case 'error':
        loadMoreButton.textContent = isArabic ? 'حدث خطأ. حاول مرة أخرى' : 'Error. Try again';
        loadMoreButton.classList.add('err');
        setTimeout(() => {
          this.updateLoadMoreButton('normal');
        }, 1500);
        break;
      case 'normal':
        loadMoreButton.textContent = isArabic ? 'عرض المزيد' : 'Load More';
        loadMoreButton.disabled = false;
        loadMoreButton.classList.remove('err');
        break;
    }
  }

  showNoMorePosts() {
    const loadMoreButton = document.getElementById(this.options.loadMoreButtonId);
    if (!loadMoreButton) return;

    const isArabic = this.options.locale.startsWith('ar');
    
    loadMoreButton.textContent = isArabic ? 'لا يوجد مقالات أخرى' : 'No more posts';
    loadMoreButton.disabled = true;
    loadMoreButton.className = 'py-3 px-6 text-sm rounded-lg border border-primary text-primary cursor-not-allowed font-semibold text-center shadow-xs transition-all duration-500 bg-gray-300 text-gray-600';
  }

  async loadRelatedPosts() {
    try {
      const posts = await this.fetchPosts('posts');
      this.renderRelatedPosts(posts);
    } catch (error) {
      console.error('Error loading related posts:', error);
    }
  }

  renderRelatedPosts(posts) {
    const container = document.getElementById(this.options.relatedPostsElementId);
    if (!container) return;

    posts.forEach(post => {
      const postElement = this.createRelatedPostElement(post);
      container.appendChild(postElement);
    });
  }

  createRelatedPostElement(post) {
    const postElement = document.createElement('div');
    postElement.className = 'rounded-lg dark:bg-neutral-800';
    
    const title = post.title?.$t || 'No Title';
    const url = post.link?.find(link => link.rel === 'alternate')?.href || '#';
    const image = post.media$thumbnail?.url.replace(/\/s[0-9]+(\-c)?\//, '/s640/') || this.options.defaultImage;

    postElement.innerHTML = `
      <div class="w-full h-40 rounded-t-lg">
        <a aria-label="Image" href="${url}">
          <img alt="${title}" class="object-cover w-full h-full rounded-t-lg nice-effect" src="${image}">
        </a>
      </div>
      <div class="p-4 dark:bg-neutral-800">
        <h3 class="text-md font-semibold">
          <a class="link-title" href="${url}">${title}</a>
        </h3>
      </div>
    `;

    return postElement;
  }

  async loadBlogSections() {
    try {
      const sections = this.options.blogSections || [];
      for (const section of sections) {
        const posts = await this.fetchPosts('posts');
        this.renderBlogSection(section, posts);
      }
    } catch (error) {
      console.error('Error loading blog sections:', error);
    }
  }

  renderBlogSection(section, posts) {
    const container = document.getElementById(section.elementId);
    if (!container) return;

    const sectionElement = document.createElement('div');
    sectionElement.className = 'blog-section mb-8';
    sectionElement.innerHTML = `<h2 class="text-2xl font-bold mb-4">${section.title}</h2>`;

    const postsContainer = document.createElement('div');
    postsContainer.className = 'grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

    posts.slice(0, section.postCount || 3).forEach(post => {
      const postElement = this.createBlogSectionElement(post);
      postsContainer.appendChild(postElement);
    });

    sectionElement.appendChild(postsContainer);
    container.appendChild(sectionElement);
  }

  createBlogSectionElement(post) {
    const postElement = document.createElement('div');
    postElement.className = 'rounded-lg dark:bg-neutral-800';
    
    const title = post.title?.$t || 'No Title';
    const url = post.link?.find(link => link.rel === 'alternate')?.href || '#';
    const excerpt = this.getExcerpt(post);
    const image = post.media$thumbnail?.url.replace(/\/s[0-9]+(\-c)?\//, '/s640/') || this.options.defaultImage;

    postElement.innerHTML = `
      <div class="w-full h-40 rounded-t-lg">
        <a aria-label="Image" href="${url}">
          <img alt="${title}" class="object-cover w-full h-full rounded-t-lg nice-effect" src="${image}">
        </a>
      </div>
      <div class="p-4">
        <h3 class="text-lg font-semibold mb-2">
          <a class="link-title" href="${url}">${title}</a>
        </h3>
        <p class="text-sm text-neutral-600 dark:text-neutral-300">${excerpt}</p>
      </div>
    `;

    return postElement;
  }

  async loadComments() {
    try {
      const comments = await this.fetchComments();
      this.renderComments(comments);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  }

  async fetchComments() {
    const { homepage, perPage } = this.options;
    let apiUrl = `${homepage}/feeds/comments/default?alt=json&orderby=published&max-results=${perPage}`;

    const response = await fetch(apiUrl);
    const data = await response.json();
    return data.feed.entry || [];
  }

  renderComments(comments) {
    const container = document.getElementById(this.options.commentsElementId);
    if (!container) return;

    comments.forEach(comment => {
      const commentElement = this.createCommentElement(comment);
      container.appendChild(commentElement);
    });
  }

  createCommentElement(comment) {
    const commentElement = document.createElement('div');
    commentElement.className = 'comment mb-4 p-4 bg-gray-100 dark:bg-neutral-800 rounded-lg';
    
    const author = comment.author?.[0]?.name?.$t || 'Anonymous';
    const content = comment.content?.$t || 'No comment';
    const dateFormatted = this.formatDate(comment.published?.$t);
    const authorImage = comment.author?.[0]?.gd$image?.src || this.options.defaultAvatar;

    commentElement.innerHTML = `
      <div class="flex items-start">
        <img src="${authorImage}" alt="${author}" class="w-10 h-10 rounded-full mr-4">
        <div>
          <h4 class="font-semibold">${author}</h4>
          <p class="text-sm text-gray-600 dark:text-gray-300">${content}</p>
          <time datetime="${comment.published?.$t}" class="text-xs text-gray-500">
            ${dateFormatted}
          </time>
        </div>
      </div>
    `;

    return commentElement;
  }
}
