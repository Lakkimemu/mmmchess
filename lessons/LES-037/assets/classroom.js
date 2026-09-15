(function () {
  var data = JSON.parse(document.getElementById('lesson-data').textContent);
  var taskNode = document.getElementById('task-data');
  var taskData = taskNode ? JSON.parse(taskNode.textContent) : {tasks: []};
  var mode = document.body.dataset.mode;
  if (mode === 'deck') {
    var appHome = document.getElementById('app-home');
    if (appHome && /\/lessons\/LES-\d+\/(?:index\.html)?$/.test(location.pathname)) {
      appHome.href = '../../index.html';
    }
    var deckIndex = 0;
    var deckView = 'teach';
    var deckRevealed = false;
    var byDeckId = function (id) { return document.getElementById(id); };
    var dialog = byDeckId('contents-dialog');
    var continuationGroups = (data.continue_teaching && data.continue_teaching.groups) || [];
    var continuationSlides = [];
    continuationGroups.forEach(function (group) {
      group.screens.forEach(function (screen) {
        continuationSlides.push(Object.assign({group_id: group.id, group_title: group.title}, screen));
      });
    });
    var reusableDiagram = ((data.teach && data.teach.slides) || data.teach_slides || []).find(function (slide) { return slide.diagram_url; });
    var practiceSlides = (taskData.tasks || []).map(function (task, taskIndex) {
      var isTactical = task.task_type === 'TACTICAL_SEQUENCE' && task.position && task.position.fen;
      return {
        id: task.task_id,
        type: task.task_type,
        title: 'Practice ' + (taskIndex + 1),
        text: task.prompt,
        parent_prompt: 'Hint: ' + task.hint,
        reveal: task.answer && task.answer.text,
        board_fen: isTactical ? task.position.fen : null,
        diagram_url: !isTactical && reusableDiagram ? reusableDiagram.diagram_url : null,
        visual: isTactical || reusableDiagram ? {layout: 'VISUAL_60', animation: 'NONE'} : {layout: 'TEXT_ONLY', animation: 'NONE'}
      };
    });
    var completionSlide = {type: 'COMPLETE', title: 'Core lesson complete', text: 'You can finish now, keep exploring, open the full guide, or repeat the core lesson.', completion: true};
    function activeSlides() {
      if (deckView === 'teach') return ((data.teach && data.teach.slides) || data.teach_slides).concat([completionSlide]);
      if (deckView === 'continue') return continuationSlides;
      if (deckView === 'practice') return practiceSlides;
      return (data.full_guide && data.full_guide.sections) || data.guide_sections;
    }
    function fenPieces(fen) {
      var pieces = {'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙', 'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'};
      var placement = String(fen || '').split(' ')[0];
      var ranks = placement.split('/');
      if (ranks.length !== 8) return null;
      var result = [];
      ranks.forEach(function (rank) {
        rank.split('').forEach(function (symbol) {
          if (/^[1-8]$/.test(symbol)) {
            for (var empty = 0; empty < Number(symbol); empty += 1) result.push('');
          } else {
            result.push(pieces[symbol] || '');
          }
        });
      });
      return result.length === 64 ? result : null;
    }
    function drawBoard(kind, fen) {
      var board = byDeckId('board-view');
      board.innerHTML = '';
      var position = fen ? fenPieces(fen) : null;
      if (!kind && !position) { board.hidden = true; return; }
      for (var squareIndex = 0; squareIndex < 64; squareIndex += 1) {
        var square = document.createElement('span');
        var row = Math.floor(squareIndex / 8);
        var column = squareIndex % 8;
        square.className = 'board-square' + ((row + column) % 2 ? ' dark' : '');
        if (kind === 'EDGE_COUNT' && row === 7) square.className += ' highlight';
        if (kind === 'CORNERS' && [0, 7, 56, 63].indexOf(squareIndex) >= 0) square.className += ' marker';
        if (kind === 'CENTER_FOUR' && [27, 28, 35, 36].indexOf(squareIndex) >= 0) square.className += ' marker';
        if (position && position[squareIndex]) {
          square.className += ' fen-piece';
          square.textContent = position[squareIndex];
          square.setAttribute('aria-label', position[squareIndex]);
        }
        board.appendChild(square);
      }
      board.hidden = false;
    }
    function rebuildContents() {
      var list = byDeckId('contents-list');
      list.innerHTML = '';
      activeSlides().forEach(function (slide, slideIndex) {
        var button = document.createElement('button');
        button.type = 'button';
        button.textContent = (slideIndex + 1) + '. ' + (slide.title || slide.type || 'Lesson step');
        button.addEventListener('click', function () {
          deckIndex = slideIndex; deckRevealed = false; dialog.close(); renderDeck();
        });
        list.appendChild(button);
      });
    }
    function renderDeck() {
      var slides = activeSlides();
      var slide = slides[deckIndex];
      var isTeach = deckView === 'teach';
      var isContinue = deckView === 'continue';
      var isPractice = deckView === 'practice';
      byDeckId('slide-type').textContent = (isTeach || isContinue || isPractice) ? (slide.type || 'Practice').replaceAll('_', ' ') : 'Section ' + slide.section_ordinal;
      byDeckId('slide-title').textContent = slide.title || '';
      byDeckId('slide-text').textContent = slide.text || '';
      var slideFrame = document.querySelector('.deck-slide');
      var visual = slide.visual || {layout: slide.diagram_url ? 'VISUAL_40' : 'TEXT_ONLY', animation: 'NONE'};
      slideFrame.dataset.layout = visual.layout || 'TEXT_ONLY';
      slideFrame.classList.toggle('teach-mode', isTeach || isContinue || isPractice);
      slideFrame.classList.toggle('dense', !isTeach && !isContinue && !isPractice && slide.text.length > 900);
      slideFrame.classList.toggle('very-dense', !isTeach && !isContinue && !isPractice && slide.text.length > 1700);
      byDeckId('section-label').textContent = isTeach ? data.title : (isContinue ? slide.group_title : (isPractice ? 'Practice' : slide.section_id.replaceAll('_', ' ')));
      byDeckId('progress-label').textContent = (deckIndex + 1) + ' / ' + slides.length;
      byDeckId('progress-bar').style.width = (((deckIndex + 1) / slides.length) * 100) + '%';
      var cue = byDeckId('parent-prompt');
      cue.textContent = slide.parent_prompt || '';
      cue.hidden = (!isTeach && !isContinue && !isPractice) || !slide.parent_prompt;
      byDeckId('completion-actions').hidden = !slide.completion;
      drawBoard(slide.board_view, slide.board_fen);
      var image = byDeckId('slide-diagram');
      var imageError = byDeckId('diagram-error');
      imageError.hidden = true;
      if (slide.diagram_url) {
        image.src = slide.diagram_url;
        image.alt = (slide.diagram_alt || slide.position_title || slide.title || '') + ' diagram';
        image.hidden = false;
        image.dataset.animation = visual.animation || 'NONE';
      } else {
        image.hidden = true;
        image.removeAttribute('src');
      }
      var sticker = byDeckId('slide-sticker');
      if (visual.sticker_url) {
        sticker.src = visual.sticker_url; sticker.alt = visual.sticker_alt || ''; sticker.hidden = false;
      } else { sticker.hidden = true; sticker.removeAttribute('src'); }
      var reveal = byDeckId('reveal');
      var revealBox = byDeckId('reveal-box');
      reveal.hidden = (!isTeach && !isContinue && !isPractice) || !slide.reveal;
      reveal.textContent = deckRevealed ? 'Hide answer' : 'Reveal answer';
      revealBox.textContent = slide.reveal || '';
      revealBox.hidden = !(slide.reveal && deckRevealed);
      byDeckId('previous').disabled = deckIndex === 0;
      byDeckId('next').disabled = deckIndex === slides.length - 1;
      byDeckId('teach-view').classList.toggle('active', isTeach);
      byDeckId('continue-view').classList.toggle('active', isContinue);
      byDeckId('practice-view').classList.toggle('active', isPractice);
      byDeckId('guide-view').classList.toggle('active', deckView === 'guide');
      history.replaceState(null, '', '#' + deckView + '-' + (deckIndex + 1));
    }
    function deckMove(delta) {
      deckIndex = Math.max(0, Math.min(activeSlides().length - 1, deckIndex + delta));
      deckRevealed = false;
      renderDeck();
    }
    function switchView(nextView) {
      deckView = nextView; deckIndex = 0; deckRevealed = false; rebuildContents(); renderDeck();
    }
    byDeckId('teach-view').addEventListener('click', function () { switchView('teach'); });
    byDeckId('continue-view').disabled = continuationSlides.length === 0;
    byDeckId('continue-view').addEventListener('click', function () { if (continuationSlides.length) switchView('continue'); });
    byDeckId('practice-view').disabled = practiceSlides.length === 0;
    byDeckId('practice-view').addEventListener('click', function () { if (practiceSlides.length) switchView('practice'); });
    byDeckId('guide-view').addEventListener('click', function () { switchView('guide'); });
    byDeckId('continue-after-core').disabled = continuationSlides.length === 0;
    byDeckId('continue-after-core').addEventListener('click', function () { if (continuationSlides.length) switchView('continue'); });
    byDeckId('guide-after-core').addEventListener('click', function () { switchView('guide'); });
    byDeckId('repeat-core').addEventListener('click', function () { switchView('teach'); });
    byDeckId('finish-lesson').addEventListener('click', function () { byDeckId('slide-text').textContent = 'Lesson finished. Great work!'; });
    byDeckId('previous').addEventListener('click', function () { deckMove(-1); });
    byDeckId('next').addEventListener('click', function () { deckMove(1); });
    byDeckId('reveal').addEventListener('click', function () { deckRevealed = !deckRevealed; renderDeck(); });
    byDeckId('contents').addEventListener('click', function () { dialog.showModal(); });
    byDeckId('close-contents').addEventListener('click', function () { dialog.close(); });
    byDeckId('fullscreen').addEventListener('click', function () {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    });
    window.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowRight' || event.key === 'PageDown') deckMove(1);
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') deckMove(-1);
      if (event.key === 'Home') { deckIndex = 0; renderDeck(); }
      if (event.key.toLowerCase() === 'r' && !byDeckId('reveal').hidden) byDeckId('reveal').click();
      if (event.key.toLowerCase() === 'f') byDeckId('fullscreen').click();
      if (event.key === 'Escape' && dialog.open) dialog.close();
    });
    byDeckId('slide-diagram').addEventListener('error', function () {
      this.hidden = true;
      byDeckId('diagram-error').textContent = 'Diagram could not be loaded: ' + this.getAttribute('src');
      byDeckId('diagram-error').hidden = false;
    });
    var hashMatch = location.hash.match(/^#(teach|continue|practice|guide)-(\d+)$/);
    if (hashMatch) {
      deckView = hashMatch[1];
      if (deckView === 'continue' && continuationSlides.length === 0) deckView = 'teach';
      deckIndex = Math.min(activeSlides().length - 1, Math.max(0, Number(hashMatch[2]) - 1));
    }
    rebuildContents();
    renderDeck();
    return;
  }
}());
