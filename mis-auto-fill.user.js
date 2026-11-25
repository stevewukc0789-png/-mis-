// ==UserScript==
// @name         無界塾 MIS 問卷自動填寫
// @namespace    https://mis.btsflip.org/
// @version      3.0
// @description  偵測 AJAX 與「正在存檔」狀態，安全逐題勾選非常同意
// @match        https://mis.btsflip.org/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  if (window.self !== window.top) {
    return;
  }

  var AFTER_SELECT_WAIT_MS = 350;
  var MAX_WAIT_MS = 10000;

  var isRunning = false;
  var isCancelled = false;

  function cleanText(str) {
    return (str || '').replace(/\s+/g, '');
  }

  function isElemVisible(el) {
    if (!el || !el.ownerDocument) {
      return false;
    }
    var view = el.ownerDocument.defaultView || window;
    try {
      var style = view.getComputedStyle(el);
      if (style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')) {
        return false;
      }
    } catch (e) {
    }
    var rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function getAllWindows(win, list) {
    list = list || [];
    if (!win) {
      return list;
    }
    try {
      var doc = win.document;
      if (!doc) {
        return list;
      }
      if (list.indexOf(win) === -1) {
        list.push(win);
      }

      var frameCount = win.frames.length;
      for (var i = 0; i < frameCount; i++) {
        try {
          getAllWindows(win.frames[i], list);
        } catch (e1) {
        }
      }

      var iframes = doc.querySelectorAll('iframe, frame');
      for (var j = 0; j < iframes.length; j++) {
        try {
          if (iframes[j].contentWindow) {
            getAllWindows(iframes[j].contentWindow, list);
          }
        } catch (e2) {
        }
      }
    } catch (e3) {
    }
    return list;
  }

  function isSystemBusy() {
    var wins = getAllWindows(window.top, []);
    for (var i = 0; i < wins.length; i++) {
      var w = wins[i];
      try {
        var jq = w.jQuery || w.$;
        if (jq && typeof jq.active === 'number' && jq.active > 0) {
          return true;
        }
      } catch (e1) {
      }

      try {
        var doc = w.document;
        var nodes = doc.querySelectorAll('div, span, p, h3, h4, td, label');
        for (var n = 0; n < nodes.length; n++) {
          var el = nodes[n];
          if (el.children.length > 2) {
            continue;
          }
          var txt = cleanText(el.textContent);
          if (txt.length > 0 && txt.length <= 20) {
            if (
              txt.indexOf('正在存檔') !== -1 ||
              txt.indexOf('存檔中') !== -1 ||
              txt.indexOf('儲存中') !== -1 ||
              txt.indexOf('處理中') !== -1
            ) {
              if (isElemVisible(el)) {
                return true;
              }
            }
          }
        }
      } catch (e2) {
      }
    }
    return false;
  }

  function waitUntilIdle(onReady, onTimeout) {
    var start = Date.now();
    function check() {
      if (isCancelled) {
        return;
      }
      if (!isSystemBusy()) {
        onReady();
        return;
      }
      if (Date.now() - start >= MAX_WAIT_MS) {
        onTimeout();
        return;
      }
      setTimeout(check, 120);
    }
    check();
  }

  function getVisibleTds(tr) {
    var allTds = tr.querySelectorAll('td');
    var visible = [];
    for (var i = 0; i < allTds.length; i++) {
      if (isElemVisible(allTds[i])) {
        visible.push(allTds[i]);
      }
    }
    return visible;
  }

  function isQuestionText(text) {
    var t = cleanText(text);
    if (t.length < 4) {
      return false;
    }
    if (t.indexOf('[') !== -1 && t.indexOf(']') !== -1) {
      return true;
    }
    return (
      t.indexOf('一、') === 0 ||
      t.indexOf('二、') === 0 ||
      t.indexOf('三、') === 0 ||
      t.indexOf('四、') === 0
    );
  }

  function findRowCells(tr) {
    var vTds = getVisibleTds(tr);
    if (vTds.length < 2) {
      return null;
    }
    for (var i = 0; i < vTds.length - 1; i++) {
      var qText = cleanText(vTds[i].textContent);
      if (isQuestionText(qText)) {
        return {
          row: tr,
          questionText: qText,
          scoreCell: vTds[i + 1]
        };
      }
    }
    return null;
  }

  function scanSurveyItems() {
    var wins = getAllWindows(window.top, []);
    var items = [];
    for (var w = 0; w < wins.length; w++) {
      var doc = wins[w].document;
      var trs = doc.querySelectorAll('tr');
      for (var r = 0; r < trs.length; r++) {
        var tr = trs[r];
        if (!isElemVisible(tr)) {
          continue;
        }
        var cells = findRowCells(tr);
        if (cells) {
          items.push(cells);
        }
      }
    }
    return items;
  }

  function getLiveItem(questionList, index) {
    var targetText = questionList[index];
    var currentItems = scanSurveyItems();
    for (var i = 0; i < currentItems.length; i++) {
      if (currentItems[i].questionText === targetText) {
        return currentItems[i];
      }
    }
    return currentItems[index] || null;
  }

  function findAgreeOption(row) {
    var primaries = row.querySelectorAll('label, button');
    var i;
    for (i = 0; i < primaries.length; i++) {
      var el = primaries[i];
      if (!isElemVisible(el)) {
        continue;
      }
      if (cleanText(el.textContent) === '非常同意') {
        var innerRadio = el.querySelector('input[type="radio"]');
        if (!innerRadio && el.getAttribute('for')) {
          innerRadio = row.ownerDocument.getElementById(el.getAttribute('for'));
        }
        var isAlreadyActive =
          (innerRadio && innerRadio.checked) ||
          (el.className && el.className.indexOf('active') !== -1);
        return { clickTarget: el, alreadySelected: isAlreadyActive };
      }
    }

    var radios = row.querySelectorAll('input[type="radio"]');
    for (i = 0; i < radios.length; i++) {
      var r = radios[i];
      var parentText = r.parentElement ? cleanText(r.parentElement.textContent) : '';
      if (parentText === '非常同意' || cleanText(r.value) === '非常同意') {
        return { clickTarget: r.parentElement || r, alreadySelected: !!r.checked };
      }
    }

    return null;
  }

  function resetButton(btn) {
    isRunning = false;
    isCancelled = false;
    btn.textContent = '⚡ 一鍵全選非常同意';
    btn.style.backgroundColor = '#2563eb';
  }

  function autoFillSurvey(btn) {
    if (isRunning) {
      isCancelled = true;
      resetButton(btn);
      return;
    }

    var initialItems = scanSurveyItems();
    if (!initialItems.length) {
      alert('找不到開啟中的問卷題目列，請先點開一份問卷再按一次！');
      return;
    }

    var questionList = [];
    for (var i = 0; i < initialItems.length; i++) {
      questionList.push(initialItems[i].questionText);
    }

    isRunning = true;
    isCancelled = false;
    btn.style.backgroundColor = '#dc2626';
    var filledCount = 0;

    function finish(msg) {
      resetButton(btn);
      alert(msg);
    }

    function waitForOptionOpen(index, onFound, onFail) {
      var start = Date.now();
      var retriedRowClick = false;

      function poll() {
        if (isCancelled) {
          return;
        }
        var live = getLiveItem(questionList, index);
        if (!live) {
          onFail();
          return;
        }

        if (isSystemBusy()) {
          if (Date.now() - start >= MAX_WAIT_MS) {
            onFail();
            return;
          }
          setTimeout(poll, 120);
          return;
        }

        var opt = findAgreeOption(live.row);
        if (opt) {
          onFound(opt);
          return;
        }

        if (!retriedRowClick && Date.now() - start >= 1500) {
          retriedRowClick = true;
          live.scoreCell.click();
        }

        if (Date.now() - start >= MAX_WAIT_MS) {
          onFail();
          return;
        }
        setTimeout(poll, 120);
      }

      poll();
    }

    function processIndex(index) {
      if (isCancelled) {
        return;
      }

      if (index >= questionList.length) {
        waitUntilIdle(
          function () {
            finish(
              '完成！共處理 ' + filledCount + ' / ' + questionList.length + ' 題「非常同意」。\n' +
              '請確認最後一題狀態，再填寫下方質性回饋與學生自評。'
            );
          },
          function () {
            finish('已完成全部題目，但系統存檔逾時，請檢查畫面狀態。');
          }
        );
        return;
      }

      btn.textContent = '⏹ 停止 (' + (index + 1) + '/' + questionList.length + ')';

      waitUntilIdle(
        function () {
          var live = getLiveItem(questionList, index);
          if (!live) {
            processIndex(index + 1);
            return;
          }

          try {
            live.row.scrollIntoView({ block: 'center' });
          } catch (e) {
            live.row.scrollIntoView();
          }

          var existingOpt = findAgreeOption(live.row);
          if (!existingOpt && cleanText(live.scoreCell.textContent) === '非常同意') {
            filledCount++;
            setTimeout(function () {
              processIndex(index + 1);
            }, 80);
            return;
          }

          function selectAndNext(opt) {
            if (isCancelled) {
              return;
            }
            if (!opt.alreadySelected) {
              opt.clickTarget.click();
            }
            filledCount++;

            setTimeout(function () {
              waitUntilIdle(
                function () {
                  processIndex(index + 1);
                },
                function () {
                  finish('在第 ' + (index + 1) + ' 題存檔時等待逾時，已暫停避免卡死。');
                }
              );
            }, AFTER_SELECT_WAIT_MS);
          }

          if (existingOpt) {
            selectAndNext(existingOpt);
            return;
          }

          live.scoreCell.click();
          waitForOptionOpen(
            index,
            selectAndNext,
            function () {
              finish('第 ' + (index + 1) + ' 題展開或存檔逾時，已停止執行。');
            }
          );
        },
        function () {
          finish('在第 ' + (index + 1) + ' 題前系統持續顯示存檔中，已自動停止。');
        }
      );
    }

    processIndex(0);
  }

  function mountButton() {
    if (document.getElementById('bts-auto-fill-btn')) {
      return;
    }
    var btn = document.createElement('button');
    btn.id = 'bts-auto-fill-btn';
    btn.textContent = ' 一鍵全選非常同意';
    btn.style.position = 'fixed';
    btn.style.right = '20px';
    btn.style.bottom = '20px';
    btn.style.zIndex = '999999';
    btn.style.padding = '10px 16px';
    btn.style.backgroundColor = '#2563eb';
    btn.style.color = '#ffffff';
    btn.style.border = 'none';
    btn.style.borderRadius = '8px';
    btn.style.fontSize = '14px';
    btn.style.fontWeight = 'bold';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25)';

    btn.addEventListener('click', function () {
      autoFillSurvey(btn);
    });
    document.body.appendChild(btn);
  }

  window.addEventListener('load', mountButton);
  mountButton();
})();
