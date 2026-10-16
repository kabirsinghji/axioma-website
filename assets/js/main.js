// Axioma Therapeutics site behaviour: mobile menu and form handling. No dependencies.

// Paste your form service URLs here (for example a Formspree form URL such as
// "https://formspree.io/f/abcdwxyz"). Until set, forms explain they are not connected yet.
var FORM_ENDPOINTS = {
  newsletter: '',
  contact: ''
};

(function () {
  // Mobile menu
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  // Forms
  var forms = document.querySelectorAll('form[data-form]');
  Array.prototype.forEach.call(forms, function (form) {
    var status = form.querySelector('.form-status');
    function say(text, isError) {
      if (!status) return;
      status.textContent = text;
      status.classList.toggle('is-error', !!isError);
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var endpoint = FORM_ENDPOINTS[form.getAttribute('data-form')] || '';
      if (!/^https:\/\//.test(endpoint)) {
        say('This form is not connected yet. Please email us instead.', true);
        return;
      }
      var button = form.querySelector('[type="submit"]');
      if (button) button.disabled = true;
      say('Sending…');
      fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (res) {
          if (!res.ok) throw new Error(String(res.status));
          form.reset();
          say(form.getAttribute('data-success') || 'Thank you. We will be in touch.');
        })
        .catch(function () {
          say('Something went wrong sending this. Please try again or email us.', true);
        })
        .then(function () {
          if (button) button.disabled = false;
        });
    });
  });
})();
