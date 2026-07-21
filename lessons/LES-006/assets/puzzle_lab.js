(function () {
  'use strict';
  var data = JSON.parse(document.getElementById('lab-data').textContent);
  var tasks = data.session.tasks, index = 0, retries = [];
  var glyphs = {K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
  function answerText(answer) {
    if (!answer) return '';
    if (typeof answer.value === 'string') return answer.value.replaceAll('_', ' ').toLowerCase();
    if (answer.value && answer.value.color) return answer.value.color.toLowerCase() + ' ' + answer.value.piece_type.toLowerCase();
    return JSON.stringify(answer.value);
  }
  function board(fen) {
    var node = document.getElementById('board'); node.innerHTML = '';
    String(fen).split(' ')[0].split('/').forEach(function (rank, r) {
      var file = 0;
      rank.split('').forEach(function (symbol) {
        var count = /[1-8]/.test(symbol) ? Number(symbol) : 1;
        for (var n = 0; n < count; n += 1) {
          var square = document.createElement('span'); square.className = 'square ' + ((r + file) % 2 ? 'dark' : 'light');
          if (!/[1-8]/.test(symbol)) square.textContent = glyphs[symbol] || '';
          square.setAttribute('aria-label', String.fromCharCode(97 + file) + (8 - r));
          if (r === 7) { var cf = document.createElement('span'); cf.className = 'coord file'; cf.textContent = String.fromCharCode(97 + file); cf.setAttribute('aria-hidden', 'true'); square.appendChild(cf); }
          if (file === 0) { var cr = document.createElement('span'); cr.className = 'coord rank'; cr.textContent = String(8 - r); cr.setAttribute('aria-hidden', 'true'); square.appendChild(cr); }
          node.appendChild(square); file += 1;
        }
      });
    });
  }
  function render() {
    var task = tasks[index]; board(task.presented_fen);
    document.getElementById('progress').textContent = (index + 1) + ' / ' + tasks.length;
    document.getElementById('type').textContent = task.task_type.replaceAll('_', ' ');
    document.getElementById('prompt').textContent = task.prompt;
    document.getElementById('answer').textContent = answerText(task.answer);
    document.getElementById('answer').hidden = true;
    document.getElementById('previous').disabled = index === 0;
    document.getElementById('next').disabled = index === tasks.length - 1;
  }
  document.getElementById('reveal').onclick = function () { document.getElementById('answer').hidden = false; };
  document.getElementById('retry').onclick = function () { if (retries.indexOf(tasks[index].task_id) < 0) retries.push(tasks[index].task_id); if (index < tasks.length - 1) { index += 1; render(); } };
  document.getElementById('correct').onclick = function () { retries = retries.filter(function (id) { return id !== tasks[index].task_id; }); if (index < tasks.length - 1) { index += 1; render(); } };
  document.getElementById('previous').onclick = function () { index = Math.max(0, index - 1); render(); };
  document.getElementById('next').onclick = function () { index = Math.min(tasks.length - 1, index + 1); render(); };
  render();
}());
