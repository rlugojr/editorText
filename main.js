/* Copyright (c) 2013-2016 The TagSpaces Authors.
 * Use of this source code is governed by the MIT license which can be found in the LICENSE.txt file. */
/* globals marked, Mousetrap, CodeMirror */
"use strict";

var isCordova;
var isWin;
var isWeb;

$(document).ready(function() {
  function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }

  var locale = getParameterByName("locale");
  var $htmlContent = $("#editorText");
  var extSettings;
  loadExtSettings();

  isCordova = parent.isCordova;
  isWin = parent.isWin;
  isWeb = parent.isWeb;

  // Init internationalization
  $.i18n.init({
    ns: {namespaces: ['ns.editorText']},
    debug: true,
    lng: locale,
    fallbackLng: 'en_US'
  }, function() {
    $('[data-i18n]').i18n();
  });

  if (marked) {
    marked.setOptions({
      renderer: new marked.Renderer(),
      gfm: true,
      tables: true,
      breaks: true,
      pedantic: false,
      smartLists: true,
      smartypants: false
    });
  }

  // Init Markdown Preview functionality
  $('#markdownPreviewModal').on('show.bs.modal', function() {
    if (marked) {
      var modalBody = $("#markdownPreviewModal .modal-body");
      modalBody.html(marked(cmEditor.getValue(), {sanitize: true}));
    } else {
      console.log("markdown to html transformer not found");
    }
  });

  $("#markdownPreview").on("click", function(e) {
    $("#markdownPreviewModal").modal({show: true});
  });

  $("#mdHelpButton").on("click", function(e) {
    $("#markdownHelpModal").modal({show: true});
  });

  function handleLinks($element) {
    $element.find("a[href]").each(function() {
      var currentSrc = $(this).attr("href");
      $(this).bind('click', function(e) {
        e.preventDefault();
        var msg = {command: "openLinkExternally", link: currentSrc};
        window.parent.postMessage(JSON.stringify(msg), "*");
      });
    });
  }

  function loadExtSettings() {
    extSettings = JSON.parse(localStorage.getItem("editorTextSettings"));
  }

  var filePath;

  function saveEditorText() {
    var msg = {command: "saveDocument", filepath: filePath};
    window.parent.postMessage(JSON.stringify(msg), "*");
  }

});

var editorText;
var cmEditor;
var viewMode = true;

function viewerMode(isViewerMode) {
  viewMode = isViewerMode;

  if (!viewMode) {
    cmEditor.focus();
  }

  //cmEditor.options.lineNumbers = isViewerMode;
  cmEditor.options.cursorBlinkRate = isViewerMode ? -1 : 530;
  cmEditor.options.readOnly = isViewerMode;
  cmEditor.options.foldGutter = isViewerMode;
  cmEditor.options.styleActiveLine = isViewerMode;
  cmEditor.options.matchBrackets = isViewerMode;
  cmEditor.options.showCursorWhenSelecting = isViewerMode;
  cmEditor.options.autofocus = !isViewerMode;
  cmEditor.refresh();
}

function setContent(content, filePath) {

  var $htmlContent = $("#editorText");
  $htmlContent.append('<div id="code" style="width: 100%; height: 100%; z-index: 9999;">');

  var filetype = [];
  filetype.h = "clike";
  filetype.c = "clike";
  filetype.clj = "clojure";
  filetype.coffee = "coffeescript";
  filetype.cpp = "clike";
  filetype.cs = "clike";
  filetype.css = "css";
  filetype.groovy = "groovy";
  filetype.haxe = "haxe";
  filetype.htm = "xml";
  filetype.html = "xml";
  filetype.java = "clike";
  filetype.js = "javascript";
  filetype.ts = "javascript";
  filetype.jsm = "javascript";
  filetype.json = "javascript";
  filetype.less = "less";
  filetype.lua = "lua";
  filetype.markdown = "markdown";
  filetype.md = "markdown";
  filetype.mdown = "markdown";
  filetype.mdwn = "markdown";
  filetype.mkd = "markdown";
  filetype.ml = "ocaml";
  filetype.mli = "ocaml";
  filetype.pl = "perl";
  filetype.php = "php";
  filetype.py = "python";
  filetype.rb = "ruby";
  filetype.sh = "shell";
  filetype.sql = "sql";
  filetype.svg = "xml";
  filetype.xml = "xml";
  filetype.txt = "txt";

  var fileExt = filePath.substring(filePath.lastIndexOf(".") + 1, filePath.length).toLowerCase();

  var mode = filetype[fileExt];

  var extensionDirectory;
  var modePath;
  if (mode) {
    modePath = extensionDirectory + "/libs/codemirror/mode/" + mode + "/" + mode;
  }

  if (mode !== filetype.markdown || mode !== filetype.md ||
    mode !== filetype.mdown || mode !== filetype.mdwn) {
    $("#markdownPreview").hide();
    $("#mdHelpButton").hide();
  } else {
    $("#markdownPreview").show();
    $("#mdHelpButton").show();
  }

  var place = document.getElementById("code");
  cmEditor = new CodeMirror(place, {
    mode: mode,
    lineNumbers: true,
    foldGutter: true,
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
    lineWrapping: true,
    tabSize: 2,
    //lineSeparator: isWin ? "\n\r" : null, // TODO check under windows if content contains \n\r -> set
    styleSelectedText: true,
    showCursorWhenSelecting: true,
    autofocus: !viewMode
    //theme: "lesser-dark",
    //extraKeys: keys // workarrounded with bindGlobal plugin for mousetrap
  });

  CodeMirror.modeURL = "libs/codemirror/mode/%N/%N.js";
  if (mode) {
    cmEditor.setOption("mode", mode);
    CodeMirror.autoLoadMode(cmEditor, mode);
  } else {
    throw new TypeError("Invalid mode !");
  }

  CodeMirror.on(cmEditor, "change", function() {
    if (!viewMode) {
      var msg = {command: "contentChangedInEditor", filepath: filePath};
      window.parent.postMessage(JSON.stringify(msg), "*");
      $('.CodeMirror-cursor').show();
    } else {
      $('.CodeMirror-cursor').hide();
    }
  });

  cmEditor.setSize("100%", "100%");

  var UTF8_BOM = "\ufeff";
  if (content.indexOf(UTF8_BOM) === 0) {
    content = content.substring(1, content.length);
  }

  cmEditor.setValue(content);
  cmEditor.clearHistory();
  cmEditor.refresh();
}
