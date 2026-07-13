/* ============================================
   PR Dashboard - Media Monitoring
   Help Page JavaScript (help.js)
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Layout Injection
  initLayout('Pusri Media Intelligence', 'Sistem Analisis Sentimen PR PT Pupuk Sriwidjaja Palembang');

  // 2. Initialize FAQ Accordions
  initFaqAccordions();

  // 3. Initialize Guide Search Filtering
  initGuideSearch();
});

/* ============================================
   1. FAQ ACCORDION TRANSITIONS
   ============================================ */
function initFaqAccordions() {
  const faqBtns = document.querySelectorAll('.faq-question-btn');

  faqBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const faqItem = btn.closest('.faq-item');
      const faqAnswer = faqItem.querySelector('.faq-answer');
      const arrow = btn.querySelector('.faq-arrow');

      // Check if already active
      const isActive = faqItem.classList.contains('active');

      // Close all other FAQ items first for accordion effect
      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
        item.querySelector('.faq-answer').style.maxHeight = null;
        item.querySelector('.faq-arrow').style.transform = 'rotate(0deg)';
      });

      if (!isActive) {
        faqItem.classList.add('active');
        // Set dynamic max-height based on scrollHeight for transition smoothness
        faqAnswer.style.maxHeight = faqAnswer.scrollHeight + 'px';
        arrow.style.transform = 'rotate(180deg)';
      }
    });
  });
}

/* ============================================
   2. SEARCH FILTER ENGINE FOR GUIDES/FAQ
   ============================================ */
function initGuideSearch() {
  const searchInput = document.getElementById('help-search-input');
  const cards = document.querySelectorAll('.help-card');
  const faqItems = document.querySelectorAll('.faq-item');

  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();

    // 1. Filter the main help cards
    cards.forEach(card => {
      const title = card.querySelector('.help-card-title').textContent.toLowerCase();
      const desc = card.querySelector('.help-card-text').textContent.toLowerCase();

      if (title.includes(query) || desc.includes(query)) {
        card.style.display = 'block';
        card.style.opacity = '1';
      } else {
        card.style.display = 'none';
      }
    });

    // 2. Filter FAQ items
    faqItems.forEach(item => {
      const question = item.querySelector('.faq-question-btn span').textContent.toLowerCase();
      const answer = item.querySelector('.faq-answer p').textContent.toLowerCase();

      if (question.includes(query) || answer.includes(query)) {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }
    });
  });
}
