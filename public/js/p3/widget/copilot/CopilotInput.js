/**
 * @module p3/widget/CopilotInput
 * @description A widget that provides a text input interface for the PATRIC Copilot chat system.
 * Includes an auto-expanding textarea and submit button for sending queries to the Copilot API.
 * All submissions route through the /copilot-agent streaming endpoint.
 */
define([
    'dojo/_base/declare', 'dojo/dom-construct', 'dojo/on', 'dijit/layout/ContentPane', 'dijit/form/Textarea', 'dijit/form/Button', 'dojo/topic', 'dojo/_base/lang', 'html2canvas/dist/html2canvas.min', './WorkspacePathUtils', './CopilotWorkspacePathPicker'
  ], function (
    declare, domConstruct, on, ContentPane, Textarea, Button, topic, lang, html2canvas, WorkspacePathUtils, CopilotWorkspacePathPicker
  ) {
    /**
     * @class CopilotInput
     * @extends {dijit/layout/ContentPane}
     */
    return declare([ContentPane], {
      /** Reference to the CopilotAPI instance for making backend requests */
      copilotApi: null,

      /** Flag indicating if this is a new chat session that needs initialization */
      new_chat: true,
      /** Tracks whether the current new-chat session has already been registered in backend */
      session_registered: false,

      /** Flag to prevent multiple simultaneous submissions */
      isSubmitting: false,

      /** @deprecated No longer used — Stop button is always visible during submission. */
      isQueryProgressActive: false,

      /** Custom system prompt to prepend to queries */
      systemPrompt: null,

      /** Selected language model for chat completion */
      model: null,

      /**
       * Plan/Execute toggle state for the current session.
       * 'plan' (default): agents prepare jobs but the backend refuses
       * submit_gowe_job / create_group.  'execute': those tools run.
       * Persisted on the session (chat_sessions.execution_mode); the
       * gateway reads it from Mongo on every turn.
       */
      executionMode: 'plan',
      modeToggleNode: null,
      modeOptionNodes: null,

      statePrompt: null,

      /** Plan step context waiting for user input (set by needs_input event) */
      _pendingPlanStepInput: null,

      // Widget styling
      style: 'padding: 0 5px 5px 5px; border: 0; height: 20%; overflow: visible;',

      // Size constraints for the widget
      minSize: 40,
      maxSize: 200,

      attachedImages: [],
      attachedFiles: [],    // text file attachments [{id, name, content, size, mimeType}]
      attachedPdfs: [],     // PDF attachments [{id, name, content, size, mimeType}]
      imageUploadInput: null,
      imageActionNode: null,
      imageActionMenuNode: null,
      imageActionOutsideClickHandle: null,
      screenshotMenuItemNode: null,
      _nextImageAttachmentId: 0,
      _isCapturingScreenshot: false,
      _attachMenuKeyHandle: null,

      /**
       * Constructor that initializes the widget with provided options
       * Uses safeMixin to safely merge configuration arguments
       */
      constructor: function(args) {
        declare.safeMixin(this, args);
        this._nextImageAttachmentId = 0;
        this._topicHandles = [];
      },

      _getInputValue: function() {
        if (!this.textArea) {
          return '';
        }
        return this.textArea.get('value') || '';
      },

      _setInputTextValue: function(value) {
        if (!this.textArea) {
          return;
        }
        this.textArea.set('value', value || '');
        this._renderAttachmentChips();
      },

      _focusWorkspacePathInTextarea: function(match) {
        if (!match || !this.textArea || !this.textArea.textbox) {
          return;
        }
        var textbox = this.textArea.textbox;
        textbox.focus();
        if (typeof textbox.setSelectionRange === 'function') {
          textbox.setSelectionRange(match.start, match.end);
        }
      },

      _removeWorkspacePathFromInput: function(match) {
        if (!match) {
          return;
        }
        var currentValue = this._getInputValue();
        if (!currentValue) {
          return;
        }
        var nextValue = currentValue.slice(0, match.outerStart) + currentValue.slice(match.outerEnd);
        nextValue = nextValue.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n');
        this._setInputTextValue(nextValue);
      },

      _getAttachmentSlotCount: function() {
        return (this.attachedImages ? this.attachedImages.length : 0) +
          (this.attachedFiles ? this.attachedFiles.length : 0);
      },

      _createAttachMenuItem: function(menuNode, iconClass, label, onClick) {
        var item = domConstruct.create('button', {
          type: 'button',
          className: 'copilotAttachMenuItem',
          role: 'menuitem'
        }, menuNode);
        domConstruct.create('i', {
          className: 'fa ' + iconClass
        }, item);
        domConstruct.create('span', {
          textContent: label
        }, item);
        on(item, 'click', lang.hitch(this, function(evt) {
          evt.preventDefault();
          evt.stopPropagation();
          onClick.call(this);
        }));
        return item;
      },

      _isAttachMenuOpen: function() {
        return !!(this.imageActionMenuNode && this.imageActionMenuNode.style.display !== 'none');
      },

      _toggleAttachMenu: function(evt) {
        if (evt) {
          evt.preventDefault();
          evt.stopPropagation();
        }
        if (this._isCapturingScreenshot) {
          return;
        }
        if (this._isAttachMenuOpen()) {
          this._closeAttachMenu();
        } else {
          this._openAttachMenu();
        }
      },

      _openAttachMenu: function() {
        if (!this.imageActionMenuNode) {
          return;
        }
        this._updateImageCapabilityUI();
        this.imageActionMenuNode.style.display = 'block';
        if (this.imageActionNode) {
          this.imageActionNode.setAttribute('aria-expanded', 'true');
        }
        this._bindAttachMenuDismiss();
      },

      _closeAttachMenu: function() {
        if (this.imageActionMenuNode) {
          this.imageActionMenuNode.style.display = 'none';
        }
        if (this.imageActionNode) {
          this.imageActionNode.setAttribute('aria-expanded', 'false');
        }
        this._unbindAttachMenuDismiss();
      },

      _bindAttachMenuDismiss: function() {
        this._unbindAttachMenuDismiss();
        this.imageActionOutsideClickHandle = on(document, 'mousedown', lang.hitch(this, function(evt) {
          var target = evt.target;
          if (this.imageActionMenuNode && this.imageActionMenuNode.contains(target)) {
            return;
          }
          if (this.imageActionNode && this.imageActionNode.contains(target)) {
            return;
          }
          this._closeAttachMenu();
        }));
        this._attachMenuKeyHandle = on(document, 'keydown', lang.hitch(this, function(evt) {
          if (evt.key === 'Escape' || evt.keyCode === 27) {
            this._closeAttachMenu();
          }
        }));
      },

      _unbindAttachMenuDismiss: function() {
        if (this.imageActionOutsideClickHandle) {
          this.imageActionOutsideClickHandle.remove();
          this.imageActionOutsideClickHandle = null;
        }
        if (this._attachMenuKeyHandle) {
          this._attachMenuKeyHandle.remove();
          this._attachMenuKeyHandle = null;
        }
      },

      _setAttachButtonCapturing: function(isCapturing) {
        if (!this.imageActionNode) {
          return;
        }
        this.imageActionNode.disabled = !!isCapturing;
        this.imageActionNode.title = isCapturing ? 'Capturing screenshot...' : 'Attach';
        this.imageActionNode.classList.toggle('isCapturing', !!isCapturing);
      },

      _captureScreenshotNow: function() {
        if (this._isCapturingScreenshot) {
          return;
        }
        if (!this._modelSupportsImage(this.model)) {
          return;
        }
        var maxAttachments = 3;
        if (this._getAttachmentSlotCount() >= maxAttachments) {
          topic.publish('CopilotApiError', { error: new Error('You can attach up to 3 files per message.') });
          return;
        }

        this._isCapturingScreenshot = true;
        this._setAttachButtonCapturing(true);

        var capturePromise = html2canvas(document.body, {
          onclone: function(clonedDoc) {
            var chatPanels = clonedDoc.querySelectorAll('.ChatContainerFloatingWindow, .CopilotFloatingWindow');
            for (var i = 0; i < chatPanels.length; i++) {
              chatPanels[i].style.display = 'none';
            }
          }
        });
        var timeoutPromise = new Promise(function(_, reject) {
          setTimeout(function() { reject(new Error('Screenshot capture timed out')); }, 10000);
        });

        Promise.race([capturePromise, timeoutPromise]).then(lang.hitch(this, function(canvas) {
          if (this._getAttachmentSlotCount() >= maxAttachments) {
            return;
          }
          this.attachedImages.push({
            id: 'img-' + Date.now() + '-' + Math.floor(Math.random() * 1000000),
            image: canvas.toDataURL('image/png'),
            attachment: {
              type: 'image',
              source: 'screenshot',
              name: 'Page screenshot'
            }
          });
          this._renderAttachmentChips();
        })).catch(lang.hitch(this, function(error) {
          console.error('Screenshot capture failed:', error);
          topic.publish('CopilotApiError', {
            error: error instanceof Error ? error : new Error('Screenshot capture failed.')
          });
        })).finally(lang.hitch(this, function() {
          this._isCapturingScreenshot = false;
          this._setAttachButtonCapturing(false);
        }));
      },

      _removeAttachedImageById: function(id) {
        this.attachedImages = (this.attachedImages || []).filter(function(entry) {
          return entry && entry.id !== id;
        });
        this._renderAttachmentChips();
      },

      _removeAttachedFileById: function(id) {
        this.attachedFiles = (this.attachedFiles || []).filter(function(entry) {
          return entry && entry.id !== id;
        });
        this._renderAttachmentChips();
      },

      _removeAttachedPdfById: function(id) {
        this.attachedPdfs = (this.attachedPdfs || []).filter(function(entry) {
          return entry && entry.id !== id;
        });
        this._renderAttachmentChips();
      },

      _appendAttachmentChip: function(parentNode, options) {
        var chip = domConstruct.create('div', {
          className: 'copilotAttachmentChip'
        }, parentNode);

        if (options.thumbnail) {
          domConstruct.create('img', {
            className: 'copilotAttachmentChipThumb',
            src: options.thumbnail,
            alt: ''
          }, chip);
        } else if (options.iconClass) {
          domConstruct.create('i', {
            className: 'fa ' + options.iconClass + ' copilotAttachmentChipIcon'
          }, chip);
        }

        domConstruct.create('span', {
          className: 'copilotAttachmentChipName',
          textContent: options.label || '',
          title: options.title || options.label || ''
        }, chip);

        var removeButton = domConstruct.create('button', {
          type: 'button',
          className: 'workspacePathEditorTokenRemove',
          textContent: '\u00d7',
          title: options.removeTitle || 'Remove attachment'
        }, chip);
        on(removeButton, 'click', lang.hitch(this, function(evt) {
          evt.preventDefault();
          evt.stopPropagation();
          if (typeof options.onRemove === 'function') {
            options.onRemove();
          }
        }));
        return chip;
      },

      _renderAttachmentChips: function() {
        if (!this.workspacePathTokenEditorNode) {
          return;
        }
        domConstruct.empty(this.workspacePathTokenEditorNode);

        var images = Array.isArray(this.attachedImages) ? this.attachedImages : [];
        var files = Array.isArray(this.attachedFiles) ? this.attachedFiles : [];
        var pdfs = Array.isArray(this.attachedPdfs) ? this.attachedPdfs : [];
        var matches = WorkspacePathUtils.findPathMatches(this._getInputValue());
        var hasChips = images.length > 0 || files.length > 0 || pdfs.length > 0 || matches.length > 0;

        if (!hasChips) {
          this.workspacePathTokenEditorNode.style.display = 'none';
          return;
        }

        this.workspacePathTokenEditorNode.style.display = 'flex';

        var tokenListNode = domConstruct.create('div', {
          className: 'workspacePathTokenEditorList'
        }, this.workspacePathTokenEditorNode);

        images.forEach(lang.hitch(this, function(entry) {
          if (!entry) {
            return;
          }
          var attachment = entry.attachment || {};
          var label = attachment.name || (attachment.source === 'screenshot' ? 'Page screenshot' : 'Attached image');
          this._appendAttachmentChip(tokenListNode, {
            thumbnail: typeof entry.image === 'string' ? entry.image : null,
            iconClass: 'icon-image',
            label: label,
            title: label,
            removeTitle: 'Remove this image',
            onRemove: lang.hitch(this, function() {
              this._removeAttachedImageById(entry.id);
            })
          });
        }));

        files.forEach(lang.hitch(this, function(entry) {
          if (!entry) {
            return;
          }
          var label = entry.name || 'Attached file';
          this._appendAttachmentChip(tokenListNode, {
            iconClass: 'icon-file-text-o',
            label: label,
            title: label,
            removeTitle: 'Remove this file',
            onRemove: lang.hitch(this, function() {
              this._removeAttachedFileById(entry.id);
            })
          });
        }));

        pdfs.forEach(lang.hitch(this, function(entry) {
          if (!entry) {
            return;
          }
          var label = entry.name || 'Attached PDF';
          this._appendAttachmentChip(tokenListNode, {
            iconClass: 'icon-file-pdf-o',
            label: label,
            title: label,
            removeTitle: 'Remove this PDF',
            onRemove: lang.hitch(this, function() {
              this._removeAttachedPdfById(entry.id);
            })
          });
        }));

        matches.forEach(lang.hitch(this, function(match) {
          var tokenNode = domConstruct.create('div', {
            className: 'workspacePathEditorToken'
          }, tokenListNode);

          var focusButton = domConstruct.create('button', {
            type: 'button',
            className: 'workspacePathEditorTokenFocus',
            title: 'Click to select this path in the text area'
          }, tokenNode);
          domConstruct.create('i', {
            className: 'fa icon-folder-open-o',
            style: 'margin-right: 4px; color: #5b7aa7;'
          }, focusButton);
          var segments = match.path.split('/').filter(function(s) { return s; });
          var displayName = segments.length > 1
            ? '\u2026/' + segments[segments.length - 1]
            : match.path;
          domConstruct.create('span', { textContent: displayName }, focusButton);
          focusButton.title = match.path;
          on(focusButton, 'click', lang.hitch(this, function(evt) {
            evt.preventDefault();
            this._focusWorkspacePathInTextarea(match);
          }));

          var removeButton = domConstruct.create('button', {
            type: 'button',
            className: 'workspacePathEditorTokenRemove',
            textContent: '\u00d7',
            title: 'Remove this path from the prompt'
          }, tokenNode);
          on(removeButton, 'click', lang.hitch(this, function(evt) {
            evt.preventDefault();
            this._removeWorkspacePathFromInput(match);
          }));
        }));
      },

      _openWorkspaceChooser: function() {
        var _self = this;
        var userPath = (window.App && window.App.user && window.App.user.id)
          ? '/' + window.App.user.id
          : '/';

        if (!this._workspacePicker) {
          this._workspacePicker = new CopilotWorkspacePathPicker({
            title: 'Select Workspace Path',
            path: userPath,
            onSelect: function(selectedPath) {
              if (!selectedPath || typeof selectedPath !== 'string') {
                return;
              }
              // Always quoted, so a path with spaces stays one path (one
              // rule users can copy when typing paths by hand).
              var pathOnly = '"' + selectedPath.trim() + '"';
              var current = _self._getInputValue();
              var separator = '';
              if (current.length > 0 && !/\s$/.test(current)) {
                separator = '\n';
              }
              _self._setInputTextValue(current + separator + pathOnly);
              if (_self.textArea) {
                _self.textArea.focus();
              }
            }
          });
        }
        this._workspacePicker.path = userPath;
        this._workspacePicker.show();
      },

      _applyToolMetadataToAssistantMessage: function(assistantMessage, toolMetadata) {
        if (!assistantMessage || !toolMetadata) {
          return;
        }

        // Gateway-classified card
        if (toolMetadata.card && toolMetadata.card.card_type) {
          assistantMessage.card = toolMetadata.card;
          // Bridge card payloads to the properties that ChatMessage renderers expect.
          if (toolMetadata.card.card_type === 'clarification' && toolMetadata.card.card_payload) {
            assistantMessage.clarificationData = toolMetadata.card.card_payload;
            assistantMessage.isPlanClarification = true;
          }
          if (toolMetadata.card.card_type === 'plan' && toolMetadata.card.card_payload) {
            assistantMessage.planData = toolMetadata.card.card_payload;
            assistantMessage.isPlan = true;
          }
        }

        // Pass through original query for clarification flows
        if (toolMetadata.originalQuery) {
          assistantMessage.originalQuery = toolMetadata.originalQuery;
        }
      },

      _registerSessionIfNeeded: function() {
        if (this.session_registered || !this.copilotApi || !this.sessionId) {
          return Promise.resolve(false);
        }

        // A session already in the sidebar store exists in Mongo: nothing to do.
        // Otherwise register even when new_chat is false: an id restored from
        // localStorage after "delete chat" + reload was never saved, and used
        // to be created silently by the gateway with no sidebar entry. The
        // gateway's register is an idempotent upsert, so an older session that
        // simply isn't on the loaded sidebar page comes back created:false.
        var store = window && window.App && window.App.chatSessionsStore;
        if (!this.new_chat && store && store.index && store.index[this.sessionId] !== undefined) {
          this.session_registered = true;
          return Promise.resolve(false);
        }

        var sessionId = this.sessionId;
        return this.copilotApi.registerSession(sessionId, 'New Chat').then(lang.hitch(this, function(result) {
          this.session_registered = true;
          var created = !!(result && result.created === true);
          if (!this.new_chat && !created) {
            return false;
          }
          if (!this.new_chat) {
            // Restored id with no row: title it like any new chat (the
            // submit-time new-chat flag was captured before this ran).
            this._createdOnFirstSendId = sessionId;
          }

          if (window && window.App && window.App.chatSessionsStore) {
            window.App.chatSessionsStore.addSession({
              session_id: sessionId,
              title: 'New Chat',
              created_at: Date.now()
            });
          }

          topic.publish('reloadUserSessions', { highlightSessionId: sessionId });
          return true;
        }));
      },

      _submitCopilotQueryStreamWithRegistration: function(params, onData, onEnd, onError, onProgress, onStatusMessage) {
        this._registerSessionIfNeeded().then(lang.hitch(this, function() {
          this.copilotApi.submitCopilotQueryStream(params, onData, onEnd, onError, onProgress, onStatusMessage);
        })).catch(function(error) {
          if (onError) {
            onError(error);
          }
        });
      },

      /**
       * Submits a planning agent action via the standard SSE streaming path.
       * Reuses _submitCopilotQueryStreamWithRegistration with target_agent='planning'
       * (or targetAgent: answers to another agent's questions go back to it)
       * so all SSE events (plan_created, plan_step_*, ask_questions) flow through
       * the normal onData/onEnd/onError/onStatusMessage callbacks.
       *
       * @param {string} queryText - Human-readable description of the action
       * @param {string} sessionId - Chat session ID
       * @param {Object} workflowContext - Planning workflow context (plan_action, plan, etc.)
       */
      _submitPlanAction: function(queryText, sessionId, workflowContext, targetAgent) {
        var _self = this;

        // Prevent concurrent submissions
        if (this.isSubmitting) {
          console.warn('[CopilotInput] _submitPlanAction: already submitting, ignoring');
          return;
        }

        // Switch to Messages tab
        topic.publish('ChatMessageSubmitted');

        this.isSubmitting = true;
        this.isQueryProgressActive = false;
        this.submitButton.set('disabled', true);
        this._updateStopButtonState();

        // Plan actions (Approve, Continue, answers) are turns too: show the
        // sidebar's "Running" state like a typed message does.  Same end rules
        // as _handleSubmitStream: an aborted or disconnected stream leaves the
        // chip to the sidebar's active_job_id poll.
        var planSessionId = sessionId || this.sessionId;
        topic.publish('ChatSession:TurnStarted', { sessionId: planSessionId });

        this.displayWidget.showLoadingIndicator('Processing\u2026');

        var assistantMessage = null;
        var statusMessageId = null;
        var assistantMessageCreated = false;
        var lastSteps = null;

        var params = {
          inputText: queryText,
          sessionId: planSessionId,
          systemPrompt: '',
          model: this.model,
          save_chat: true,
          execution_mode: this.executionMode,
          // Plan actions go to planning; answers to another agent's
          // questions go back to that agent.
          target_agent: targetAgent || 'planning',
          workflow_context: workflowContext
        };

        this._submitCopilotQueryStreamWithRegistration(params,
          function(chunk, toolMetadata) {
            // onData — same pattern as _handleSubmitStream
            // Only create an assistant message when we actually have something
            // to render (text chunk or a UI widget such as plan/clarification).
            var hasTextChunk = !!(chunk && String(chunk).length > 0);
            var hasWidget = !!(toolMetadata && toolMetadata.card);

            if (!assistantMessageCreated && (hasTextChunk || hasWidget)) {
              if (statusMessageId) {
                _self.chatStore.removeMessage(statusMessageId);
                statusMessageId = null;
              }
              assistantMessage = {
                role: 'assistant',
                agent_metadata: lastSteps && lastSteps.length ? { steps: lastSteps } : undefined,
                content: '',
                message_id: 'assistant_' + Date.now(),
                timestamp: new Date().toISOString()
              };
              if (toolMetadata) {
                _self._applyToolMetadataToAssistantMessage(assistantMessage, toolMetadata);
              }
              _self.chatStore.addMessage(assistantMessage);
              assistantMessageCreated = true;
            }

            if (assistantMessageCreated && toolMetadata) {
              _self._applyToolMetadataToAssistantMessage(assistantMessage, toolMetadata);
            }

            if (assistantMessageCreated && hasTextChunk) {
              if (!(chunk.length > 1 && assistantMessage.content.length >= chunk.length && assistantMessage.content.endsWith(chunk))) {
                assistantMessage.content += chunk;
              }
            }

            if (assistantMessageCreated) {
              _self.displayWidget.showMessages(_self.chatStore.query());
            }
          },
          function(info) {
            // onEnd
            _self.isSubmitting = false;
            _self.isQueryProgressActive = false;
            _self.submitButton.set('disabled', false);
            _self._updateStopButtonState();
            if (!info || info.reason !== 'aborted') {
              topic.publish('ChatSession:TurnEnded', { sessionId: planSessionId });
            }
          },
          function(error) {
            // onError
            topic.publish('CopilotApiError', { error: error });
            _self.displayWidget.hideLoadingIndicator();
            _self.isSubmitting = false;
            _self.isQueryProgressActive = false;
            _self.submitButton.set('disabled', false);
            _self._updateStopButtonState();
            // Another turn holds the chat (409), or the stream dropped while
            // the gateway keeps running: leave the chip to the poll.
            if (error && (error.code === 'TURN_IN_FLIGHT' || error.isStreamDisconnect)) { return; }
            topic.publish('ChatSession:TurnEnded', { sessionId: planSessionId });
          },
          function(progressInfo) {
            // onProgress — silent for plan actions
          },
          function(statusMessage) {
            // onStatusMessage — same pattern as _handleSubmitStream
            if (statusMessage.should_remove) {
              _self.chatStore.removeMessage(statusMessage.message_id);
              if (statusMessageId === statusMessage.message_id) {
                statusMessageId = null;
              }
            } else {
              statusMessageId = statusMessage.message_id;
              if (Array.isArray(statusMessage.steps)) {
                lastSteps = statusMessage.steps;
              }
              var existingMessage = _self.chatStore.getMessageById(statusMessage.message_id);
              if (existingMessage) {
                _self.chatStore.updateMessage(statusMessage);
              } else {
                _self.chatStore.addMessage(statusMessage);
              }
            }
            _self.displayWidget.showMessages(_self.chatStore.query());
          }
        );
      },

      /**
       * Sets up the widget UI after DOM creation
       * Implementation:
       * - Creates a unified composer bar (attach + textarea + send)
       * - Adds auto-expanding textarea
       * - Sets up event handlers
       */
      postCreate: function() {
        // Create main wrapper with flex layout
        var wrapperDiv = domConstruct.create('div', {
            className: 'copilotInputWrapper'
        }, this.containerNode);

        var composer = domConstruct.create('div', {
            className: 'copilotComposer'
        }, wrapperDiv);

        this.workspacePathTokenEditorNode = domConstruct.create('div', {
            className: 'workspacePathTokenEditor',
            style: 'display: none;'
        }, composer);

        var composerRow = domConstruct.create('div', {
            className: 'copilotComposerRow'
        }, composer);

        var toggleContainer = domConstruct.create('div', {
            className: 'copilotAttachButtonContainer'
        }, composerRow);

        this.imageActionNode = domConstruct.create('button', {
            type: 'button',
            className: 'copilotAttachButton',
            title: 'Attach',
            'aria-haspopup': 'true',
            'aria-expanded': 'false',
            innerHTML: '<i class="fa icon-paperclip"></i>'
        }, toggleContainer);
        on(this.imageActionNode, 'click', lang.hitch(this, this._toggleAttachMenu));

        this.imageActionMenuNode = domConstruct.create('div', {
            className: 'copilotAttachMenu',
            role: 'menu',
            style: 'display: none;'
        }, toggleContainer);

        this.screenshotMenuItemNode = this._createAttachMenuItem(
            this.imageActionMenuNode,
            'icon-image',
            'Screenshot',
            function() {
                this._closeAttachMenu();
                this._captureScreenshotNow();
            }
        );

        this._createAttachMenuItem(
            this.imageActionMenuNode,
            'icon-file-text-o',
            'Upload File',
            function() {
                this._closeAttachMenu();
                if (this.imageUploadInput) {
                    this.imageUploadInput.click();
                }
            }
        );

        this._createAttachMenuItem(
            this.imageActionMenuNode,
            'icon-folder-open-o',
            'Add Workspace Path',
            function() {
                this._closeAttachMenu();
                this._openWorkspaceChooser();
            }
        );

        this.imageUploadInput = domConstruct.create('input', {
            type: 'file',
            multiple: true,
            style: 'display: none;'
        }, wrapperDiv);
        on(this.imageUploadInput, 'change', lang.hitch(this, this._handleImageUploadChange));

        this._buildModeToggle(composerRow);

        var textAreaWrapper = domConstruct.create('div', {
            className: 'copilotTextAreaWrapper'
        }, composerRow);

        this.textArea = new Textarea({
            'class': 'copilotComposerTextarea',
            rows: 1,
            maxLength: 10000,
            placeholder: 'Ask anything...'
        });
        this.textArea.placeAt(textAreaWrapper);
        this._composerNode = composer;
        // Publish the initial (plan) mode so PlanCard / ChatMessage can
        // read window.App.copilotExecutionMode before any toggle click.
        this.setExecutionMode(this.executionMode, { silent: true });

        this.submitButton = new Button({
            label: '<i class="fa icon-arrow-up"></i>',
            title: 'Send',
            'class': 'copilotSendButton',
            onClick: lang.hitch(this, function() {
            if (this.isSubmitting) return;
            if (!this.copilotApi) {
                console.error('CopilotApi widget not initialized');
                return;
            }
            this._handleSubmitStream();
            })
        });

        this.submitButton.placeAt(composerRow);

        this.stopButton = new Button({
            label: '<i class="fa icon-stop"></i> Stop',
            'class': 'copilotStopButton',
            onClick: lang.hitch(this, function() {
                this._handleStopClick();
            })
        });
        this.stopButton.placeAt(composerRow);
        // Hidden by default — shown only while isSubmitting
        this.stopButton.domNode.style.display = 'none';

        this._topicHandles.push(topic.subscribe('ChatSession:Selected', lang.hitch(this, function(data) {
            this._closeAttachMenu();
            this._clearAttachedImage();
            this._pendingPlanStepInput = null;
            // Restore the stored Plan/Execute state for this session.
            this.setExecutionMode(
              (data && data.execution_mode === 'execute') ? 'execute' : 'plan',
              { silent: true }
            );
        })));

        // Maximum height for textarea before scrolling
        const maxHeight = 160;

        // Handle textarea auto-expansion on input
        on(this.textArea, 'input', function() {
            var node = this.textArea.domNode || this.textArea.textbox;
            if (!node) {
              return;
            }
            node.style.height = 'auto';
            node.style.height = node.scrollHeight + 'px';

            if (node.scrollHeight > maxHeight) {
              node.style.height = maxHeight + 'px';
              node.style.overflowY = 'auto';
            } else {
              node.style.overflowY = 'hidden';
            }
            this._renderAttachmentChips();
        }.bind(this));

        on(this.textArea, 'paste', lang.hitch(this, function() {
            setTimeout(lang.hitch(this, this._renderAttachmentChips), 0);
        }));

        on(this.textArea, 'keyup', lang.hitch(this, this._renderAttachmentChips));

        // Handle Enter key for submission (except with Shift)
        on(this.textArea, 'keypress', lang.hitch(this, function(evt) {
            if (evt.keyCode === 13 && !evt.shiftKey && !this.isSubmitting) {
            evt.preventDefault();
            this.submitButton.onClick();
            }
        }));

        // Subscribe to main chat suggestion selection to populate input text area
        this._topicHandles.push(topic.subscribe('populateInputSuggestion', lang.hitch(this, function(suggestion) {
          if (this.textArea) {
            this._setInputTextValue(suggestion);
            // Focus on the text area and place cursor at the end
            this.textArea.focus();
            if (this.textArea.textbox) {
              var textbox = this.textArea.textbox;
              textbox.selectionStart = textbox.selectionEnd = suggestion.length;
            }
          }
        })));

        // Retry a user message — sets the textarea and immediately submits
        this._topicHandles.push(topic.subscribe('RetryUserMessage', lang.hitch(this, function(messageContent) {
          if (this.isSubmitting) { return; }
          if (!messageContent || typeof messageContent !== 'string') { return; }
          this._setInputTextValue(messageContent);
          this._handleSubmitStream();
        })));

        // ==================== Planning Agent Topic Subscribers ====================

        // 0. CopilotPlanClarificationAnswered — remove the ask_questions chip UI message
        this._topicHandles.push(topic.subscribe('CopilotPlanClarificationAnswered', lang.hitch(this, function(data) {
          try {
            var msgs = this.chatStore && this.chatStore.query ? this.chatStore.query() : [];
            (msgs || []).forEach(lang.hitch(this, function(m) {
              if (m && m.isPlanClarification === true) {
                this.chatStore.removeMessage(m.message_id);
              }
            }));
            this.displayWidget.showMessages(this.chatStore.query());
          } catch (e) {
            console.warn('[CopilotInput] Failed to remove clarification prompt message:', e);
          }
        })));

        // 1. CopilotPlanAnswerQuestions — user answered clarification questions.
        // The answers go back to the agent that asked (data.agent): planning
        // takes them as structured clarification_answers; any other agent
        // gets one turn pinned to it with the original request plus the
        // answers; a paused plan step re-runs through the plan-step reply
        // path (_handleSubmitStream's _pendingPlanStepInput intercept).
        this._topicHandles.push(topic.subscribe('CopilotPlanAnswerQuestions', lang.hitch(this, function(data) {
          if (!data || !data.answers) { return; }
          console.log('[CopilotInput] CopilotPlanAnswerQuestions received:', data);

          var askingAgent = data.agent || 'planning';
          if (askingAgent !== 'planning') {
            var answerLines = data.answers.map(function(a) {
              return '- ' + a.question + ' ' + a.answer;
            }).join('\n');
            if (data.planStep && this._pendingPlanStepInput) {
              this._setInputTextValue('My answers to your questions:\n' + answerLines);
              this._handleSubmitStream();
              return;
            }
            var answeredMessage = this._buildClarificationResponseMessage(data.answers);
            this.chatStore.addMessage(answeredMessage);
            this.displayWidget.showMessages(this.chatStore.query());
            var turnText = (data.originalQuery ? data.originalQuery + '\n\n' : '')
              + 'My answers to your questions:\n' + answerLines;
            this._submitPlanAction(
              turnText,
              data.sessionId,
              {
                plan_action: 'answer_questions',
                clarification_answers: data.answers,
                original_query: data.originalQuery || ''
              },
              askingAgent
            );
            return;
          }

          var clarificationMessage = this._buildClarificationResponseMessage(data.answers);
          this.chatStore.addMessage(clarificationMessage);
          this.displayWidget.showMessages(this.chatStore.query());

          // Keep this compact for backend logs/history. Structured answers are in workflow_context.
          var answerSummary = data.answers.map(function(a) {
            return a.question + ': ' + a.answer;
          }).join('\n');

          this._submitPlanAction(
            data.originalQuery || 'Submitted clarification responses.',
            data.sessionId,
            {
              plan_action: 'answer_questions',
              clarification_answers: data.answers,
              clarification_summary: answerSummary,
              original_query: data.originalQuery || ''
            }
          );
        })));

        // 2. CopilotPlanApproved — user approved the plan, start step 0
        this._topicHandles.push(topic.subscribe('CopilotPlanApproved', lang.hitch(this, function(data) {
          if (!data || !data.plan) { return; }
          console.log('[CopilotInput] CopilotPlanApproved received:', data);

          this._submitPlanAction(
            'Execute approved plan: ' + (data.plan.plan_name || data.plan.plan_id || 'plan'),
            data.sessionId,
            {
              plan: data.plan,
              plan_action: 'execute_next',
              current_step_index: 0,
              completed_step_results: {}
            }
          );
        })));

        // CopilotExecutionModeRun — the run button on an execution_blocked
        // card.  Runs ONE turn in execute mode (execute_once) without
        // changing the session's Plan/Execute toggle — "allow once", not
        // "allow always".  The canned follow-up is pinned to the agent
        // that was blocked; the gateway re-pins it to the service agent,
        // which replays the card's blocked_actions verbatim (no LLM
        // rebuild of the inputs).
        this._topicHandles.push(topic.subscribe('CopilotExecutionModeRun', lang.hitch(this, function(data) {
          if (!data) { return; }
          if (data.sessionId && this.sessionId && data.sessionId !== this.sessionId) { return; }
          if (this.isSubmitting) {
            console.warn('[CopilotInput] CopilotExecutionModeRun: already submitting, ignoring');
            return;
          }
          this._setInputTextValue(this._buildExecuteRunMessage(data.blocked_actions));
          this._handleSubmitStream({
            target_agent: data.agent || null,
            execute_once: true,
            replay_actions: data.blocked_actions || null
          });
        })));

        // CopilotExecutionRevise — "Other" (free text) on the prepared-jobs
        // question.  A normal turn pinned to the service agent that carries
        // the stored set as prepared_actions, so the agent edits the set
        // instead of starting over, and asks again.  Nothing is submitted.
        this._topicHandles.push(topic.subscribe('CopilotExecutionRevise', lang.hitch(this, function(data) {
          if (!data || !data.text) { return; }
          if (data.sessionId && this.sessionId && data.sessionId !== this.sessionId) { return; }
          if (this.isSubmitting) {
            console.warn('[CopilotInput] CopilotExecutionRevise: already submitting, ignoring');
            return;
          }
          this._setInputTextValue(data.text);
          this._handleSubmitStream({
            target_agent: 'service',
            prepared_actions: data.blocked_actions || null
          });
        })));

        // 3. CopilotPlanExecuteNext — execute the next step in plan
        this._topicHandles.push(topic.subscribe('CopilotPlanExecuteNext', lang.hitch(this, function(data) {
          if (!data || !data.plan) { return; }
          console.log('[CopilotInput] CopilotPlanExecuteNext received:', data);

          var stepIndex = data.currentStepIndex || 0;
          var stepLabel = data.plan.steps && data.plan.steps[stepIndex]
            ? data.plan.steps[stepIndex].description || ('step ' + (stepIndex + 1))
            : 'step ' + (stepIndex + 1);

          this._submitPlanAction(
            'Execute plan step: ' + stepLabel,
            data.sessionId,
            {
              plan: data.plan,
              plan_action: 'execute_next',
              current_step_index: stepIndex,
              completed_step_results: data.completedResults || {}
            }
          );
        })));

        // 4. CopilotPlanSkipStep — skip a step during plan execution
        this._topicHandles.push(topic.subscribe('CopilotPlanSkipStep', lang.hitch(this, function(data) {
          if (!data || !data.plan || !data.stepId) { return; }
          console.log('[CopilotInput] CopilotPlanSkipStep received:', data);

          // Mark the step as skipped in the plan and advance to next
          var plan = data.plan;
          var nextIndex = 0;
          if (plan.steps) {
            for (var i = 0; i < plan.steps.length; i++) {
              if (plan.steps[i].step_id === data.stepId) {
                plan.steps[i].status = 'skipped';
                nextIndex = i + 1;
                break;
              }
            }
          }

          this._submitPlanAction(
            'Skip step and continue plan execution',
            data.sessionId,
            {
              plan: plan,
              plan_action: 'execute_next',
              current_step_index: nextIndex,
              completed_step_results: data.completedResults || {}
            }
          );
        })));

        // 4b. CopilotPlanEditResubmit — user edited a step description and wants to re-execute it
        this._topicHandles.push(topic.subscribe('CopilotPlanEditResubmit', lang.hitch(this, function(data) {
          if (!data || !data.plan) { return; }
          console.log('[CopilotInput] CopilotPlanEditResubmit received:', data);

          var stepIndex = data.currentStepIndex || 0;
          var editedDesc = data.editedDescription || '';
          var stepLabel = editedDesc
            ? editedDesc.substring(0, 80) + (editedDesc.length > 80 ? '...' : '')
            : 'step ' + (stepIndex + 1);

          this._submitPlanAction(
            'Re-execute edited step: ' + stepLabel,
            data.sessionId,
            {
              plan: data.plan,
              plan_action: 'execute_next',
              current_step_index: stepIndex,
              completed_step_results: data.completedResults || {}
            }
          );
        })));

        // 4b. CopilotExecutionQuestionAnswered — keep a question's answer on
        // the stored message so a re-render (a plan's next step redraws the
        // chat right after Yes) shows it answered, as a reload would.
        this._topicHandles.push(topic.subscribe('CopilotExecutionQuestionAnswered', lang.hitch(this, function(data) {
          if (!data || !data.answered || !this.chatStore) { return; }
          var key = JSON.stringify(data.blocked_actions || []);
          var messages = this.chatStore.query();
          for (var i = messages.length - 1; i >= 0; i--) {
            var card = messages[i] && messages[i].card;
            if (card && card.card_type === 'execution_blocked' && card.card_payload &&
                JSON.stringify(card.card_payload.blocked_actions || []) === key) {
              card.card_payload.answered = data.answered;
              break;
            }
          }
        })));

        // 5. CopilotPlanStepUpdate — sync step statuses on the plan message
        // in the chat store so they survive showMessages() re-renders.
        this._topicHandles.push(topic.subscribe('CopilotPlanStepUpdate', lang.hitch(this, function(data) {
          if (!data || !data.plan_id) { return; }
          var messages = this.chatStore.query();
          for (var i = 0; i < messages.length; i++) {
            var msg = messages[i];
            var planData = msg.planData || msg.plan;
            if (planData && planData.plan_id === data.plan_id && planData.steps) {
              for (var j = 0; j < planData.steps.length; j++) {
                if (planData.steps[j].step_id === data.step_id) {
                  if (data.event === 'started') {
                    planData.steps[j].status = 'running';
                    planData.status = 'executing';
                  } else if (data.event === 'completed') {
                    planData.steps[j].status = 'completed';
                    planData.steps[j].result_summary = data.result_summary || '';
                  } else if (data.event === 'needs_input') {
                    planData.steps[j].status = 'needs_input';
                    planData.steps[j].question = data.question || '';
                    // Track the plan context so _handleSubmitStream can
                    // intercept the user's reply and re-execute this step.
                    this._pendingPlanStepInput = {
                      plan: planData,
                      stepIndex: data.step_index,
                      sessionId: this.sessionId,
                      completedResults: this._getCompletedResultsFromPlan(planData)
                    };
                  } else if (data.event === 'blocked') {
                    // D4 Phase 3: waiting on the step's Yes / No / Other question.
                    planData.steps[j].status = 'awaiting_approval';
                  } else if (data.event === 'failed') {
                    planData.steps[j].status = 'failed';
                  }
                  break;
                }
              }
              break;
            }
          }
        })));

        // 6. CopilotPlanEdited — user edited plan steps (non-streaming)
        this._topicHandles.push(topic.subscribe('CopilotPlanEdited', lang.hitch(this, function(data) {
          if (!data || !data.plan) { return; }
          console.log('[CopilotInput] CopilotPlanEdited received:', data);

          var planId = data.plan.plan_id;
          if (!planId) {
            console.warn('[CopilotInput] CopilotPlanEdited: no plan_id, ignoring');
            return;
          }
          this.copilotApi.editPlan(planId, data.plan, data.sessionId).then(
            function(result) {
              console.log('[CopilotInput] Plan edit saved:', result);
            },
            function(error) {
              console.error('[CopilotInput] Plan edit failed:', error);
              topic.publish('CopilotApiError', { error: error });
            }
          );
        })));

        // 6. CopilotPlanRegenerate — re-submit original query through normal chat flow
        this._topicHandles.push(topic.subscribe('CopilotPlanRegenerate', lang.hitch(this, function(data) {
          if (!data || !data.plan) { return; }
          console.log('[CopilotInput] CopilotPlanRegenerate received:', data);

          // Use the plan's original query if available, otherwise fallback
          var originalQuery = data.plan.original_query || data.plan.plan_name || 'Regenerate plan';
          this._setInputTextValue(originalQuery);
          // Trigger a fresh submit through the normal chat path
          this.submitButton.onClick();
        })));

        this._updateImageCapabilityUI();
        this._updateStopButtonState();
        this._renderAttachmentChips();
      },

      /**
       * Show/hide the Stop button based on isSubmitting state.
       * Stop is visible and enabled whenever a turn is in flight.
       */
      _updateStopButtonState: function() {
        if (!this.stopButton) return;
        if (this.stopButton.domNode) {
          this.stopButton.domNode.style.display = this.isSubmitting ? '' : 'none';
        }
      },

      /**
       * Handle Stop button click.
       * - Calls abort POST so the backend sets the Redis cancel flag
       * - Closes the local SSE stream
       * - Unlocks the input immediately so the user can send again
       * - Keeps the assistant bubble (partial tokens already rendered)
       */
      _handleStopClick: function() {
        if (!this.copilotApi || !this.isSubmitting) return;

        // 1. Fire-and-forget abort POST (backend sets Redis cancel flag).
        //    This is the primary cancel mechanism. The SSE close (step 2)
        //    only disconnects the local stream; the backend only stops when
        //    the Redis flag is polled.  If currentJobId is not yet set
        //    (Stop pressed before the first SSE event), the gateway stops
        //    whatever turn holds this chat (session_id).
        this.copilotApi.abortActiveQueryJob({
          user_id: this.copilotApi.user_id,
          session_id: this.sessionId,
          reason: 'Stopped from chat UI'
        }).catch(function(err) {
          console.warn('[CopilotInput] Stop abort POST failed:', err.message);
        });

        // 2. Close the SSE stream
        console.log('[CopilotInput] _handleStopClick: closing SSE stream');
        this.copilotApi.abortActiveStream();

        // 3. Unlock immediately — user can send a new message
        this.displayWidget.hideLoadingIndicator();
        this.isSubmitting = false;
        this.isQueryProgressActive = false;
        this.submitButton.set('disabled', false);
        this._updateStopButtonState();
        // Do NOT publish TurnEnded here. Stop just requests cancellation; the
        // gateway needs a moment to observe the Redis flag, unwind agent tasks,
        // and clear active_job_id in Mongo. The sidebar's per-session poll
        // (ChatSessionScrollBar) will hide the chip once the gateway confirms.
      },

      /**
       * Resets widget state for new chat session
       * Clears textarea and sets new chat flag
       */
      startNewChat: function() {
        this.new_chat = true;
        this.session_registered = false;
        this._pendingPlanStepInput = null;
        this._setInputTextValue('');
        // Every new session starts in plan mode; the gateway writes the
        // same default when it creates the session document.
        this.setExecutionMode('plan', { silent: true });

        // If an SSE stream was in progress, reset the submit state so the
        // input is re-enabled for the new session.
        if (this.isSubmitting) {
            this.isSubmitting = false;
            this.isQueryProgressActive = false;
            this.submitButton.set('disabled', false);
            this._updateStopButtonState();
        }

        this._closeAttachMenu();
        this._clearAttachedImage();
      },

      /**
       * Updates the current session identifier
       * @param {string} sessionId - New session ID
       */
      setSessionId: function(sessionId) {
        var previousSessionId = this.sessionId;
        this.sessionId = sessionId;
        this.session_registered = false;
        this.new_chat = false;

        // Only reset submit state when actually switching to a different
        // session.  Re-entering the same session (e.g. path change topic
        // re-fire) must NOT clear isSubmitting, or the live SSE stream's
        // UI state (disabled send, visible Stop, loading indicator) gets
        // prematurely unlocked.
        if (this.isSubmitting && previousSessionId && previousSessionId !== sessionId) {
            this.isSubmitting = false;
            this.isQueryProgressActive = false;
            this.submitButton.set('disabled', false);
            this._updateStopButtonState();
        }

        this._closeAttachMenu();
        this._clearAttachedImage();
      },

      /**
       * Sets system prompt from structured data
       * Implementation:
       * - Takes array of data objects
       * - Builds prompt string with JSON stringified data
       * - Sets as system prompt
       */
      setSystemPromptWithData: function(data) {
        if (!data || !data.length) {
          this.systemPrompt = '';
          return;
        }

        let promptStr = "Use the following information to answer the user's question:\n";
        data.forEach(function(item) {
          promptStr += JSON.stringify(item) + '\n';
        });

        this.systemPrompt = promptStr;
      },

      /**
       * Sets raw system prompt string
       */
      setSystemPrompt: function(systemPrompt) {
        this.systemPrompt = systemPrompt;
      },

      /**
       * Builds the Plan | Execute segmented control in the composer row.
       * Both entry points (floating window and /view/Copilot) share this
       * widget, so one toggle covers both.
       */
      _buildModeToggle: function(composerRow) {
        var _self = this;
        this.modeToggleNode = domConstruct.create('div', {
          className: 'copilotModeToggle',
          role: 'radiogroup',
          'aria-label': 'Execution mode'
        }, composerRow);

        this.modeOptionNodes = {};
        var options = [
          {
            mode: 'plan',
            label: 'Plan',
            title: 'Plan mode \u2014 the assistant prepares jobs and groups but cannot submit or create them'
          },
          {
            mode: 'execute',
            label: 'Execute',
            title: 'Execute mode \u2014 the assistant may submit jobs and create groups'
          }
        ];
        options.forEach(function(opt) {
          var btn = domConstruct.create('button', {
            type: 'button',
            className: 'copilotModeOption copilotModeOption--' + opt.mode,
            role: 'radio',
            'aria-checked': 'false',
            'data-mode': opt.mode,
            title: opt.title,
            innerHTML: opt.label
          }, _self.modeToggleNode);
          on(btn, 'click', function() {
            if (_self.executionMode === opt.mode) { return; }
            _self.setExecutionMode(opt.mode);
          });
          _self.modeOptionNodes[opt.mode] = btn;
        });
      },

      /**
       * Reflects executionMode into the toggle, composer styling, and
       * the textarea placeholder.
       */
      _applyExecutionModeToDom: function() {
        var mode = this.executionMode === 'execute' ? 'execute' : 'plan';
        if (this.modeOptionNodes) {
          Object.keys(this.modeOptionNodes).forEach(lang.hitch(this, function(key) {
            var node = this.modeOptionNodes[key];
            var active = key === mode;
            node.setAttribute('aria-checked', active ? 'true' : 'false');
            if (active) {
              node.classList.add('copilotModeOption--active');
            } else {
              node.classList.remove('copilotModeOption--active');
            }
          }));
        }
        if (this.modeToggleNode) {
          this.modeToggleNode.setAttribute('data-mode', mode);
        }
        if (this._composerNode) {
          if (mode === 'execute') {
            this._composerNode.classList.add('copilotComposer--execute');
          } else {
            this._composerNode.classList.remove('copilotComposer--execute');
          }
        }
        if (this.textArea) {
          this.textArea.set('placeholder', mode === 'execute'
            ? 'Ask anything\u2026 (execute mode)'
            : 'Ask anything\u2026 (plan mode)');
        }
      },

      /**
       * Switches the Plan/Execute mode.
       *
       * @param {'plan'|'execute'} mode
       * @param {Object} [opts]
       * @param {boolean} [opts.silent] - Do not persist to the backend
       *   (used when restoring a session's stored mode, or for a new chat
       *   that has no session document yet).
       * @returns {Promise} resolves once persisted (or immediately when silent)
       */
      setExecutionMode: function(mode, opts) {
        opts = opts || {};
        var next = mode === 'execute' ? 'execute' : 'plan';
        var previous = this.executionMode;
        this.executionMode = next;
        this._applyExecutionModeToDom();
        if (window.App) {
          window.App.copilotExecutionMode = next;
        }
        topic.publish('CopilotExecutionModeChanged', { sessionId: this.sessionId, mode: next });

        if (opts.silent || !this.copilotApi || !this.sessionId) {
          return Promise.resolve(next);
        }
        // A brand-new chat has no session document yet.  Do not register
        // one just for the toggle (that would add an empty "New Chat" to
        // the sidebar); the first send carries execution_mode as a
        // write-through and the gateway persists it then.
        if (this.new_chat && !this.session_registered) {
          return Promise.resolve(next);
        }
        var _self = this;
        return this.copilotApi.setSessionExecutionMode(this.sessionId, next).then(function() {
          return next;
        }).catch(function(error) {
          // Revert so the UI never claims a mode the backend did not store.
          console.warn('[CopilotInput] Failed to persist execution mode, reverting', error);
          _self.executionMode = previous;
          _self._applyExecutionModeToDom();
          if (window.App) {
            window.App.copilotExecutionMode = previous;
          }
          topic.publish('CopilotExecutionModeChanged', { sessionId: _self.sessionId, mode: previous });
          throw error;
        });
      },

      /**
       * Canned follow-up sent by the execution_blocked card button.
       * Names the blocked tool so the agent (and router) know what to run.
       */
      _buildExecuteRunMessage: function(blockedActions) {
        var tools = {};
        (blockedActions || []).forEach(function(a) {
          if (a && a.tool) { tools[a.tool] = true; }
        });
        var hasSubmit = !!tools.submit_gowe_job;
        var hasGroup = !!tools.create_group;
        if (hasSubmit && hasGroup) {
          return 'Execute mode is on for this message. Submit the job and create the group exactly as you prepared them above.';
        }
        if (hasGroup) {
          return 'Execute mode is on for this message. Create the group exactly as you prepared it above.';
        }
        return 'Execute mode is on for this message. Submit the job exactly as you prepared it above.';
      },

      /**
       * Returns currently selected model
       */
      getModel: function() {
        return this.model;
      },

      /**
       * Updates selected model and UI
       */
      setModel: function(model) {
        this.model = model;
        if (window && window.App) {
          window.App.copilotSelectedModel = model;
        }
        this._updateImageCapabilityUI();
      },

      _getAvailableModels: function() {
        if (window && window.App && Array.isArray(window.App.copilotModelList)) {
          return window.App.copilotModelList;
        }
        return [];
      },

      _supportsImageFlag: function(value) {
        return value === true || value === 1 || value === '1' || value === 'true';
      },

      _modelSupportsImage: function(modelId) {
        var models = this._getAvailableModels();
        if (!modelId || models.length === 0) {
          return true;
        }
        var match = models.find(function(entry) {
          return entry && entry.model === modelId;
        });
        if (!match) {
          return true;
        }
        return !!(match && this._supportsImageFlag(match.supports_image));
      },

      _resolveImageModel: function() {
        if (this.model && this._modelSupportsImage(this.model)) {
          return this.model;
        }
        var models = this._getAvailableModels();
        if (models.length === 0) {
          return this.model;
        }
        var defaultImage = models.find(function(entry) {
          return entry && entry.active !== false && this._supportsImageFlag(entry.supports_image) && entry.is_default === true;
        }, this);
        if (defaultImage && defaultImage.model) {
          return defaultImage.model;
        }
        var firstImage = models.find(function(entry) {
          return entry && entry.active !== false && this._supportsImageFlag(entry.supports_image) && entry.model;
        });
        return firstImage && firstImage.model ? firstImage.model : this.model;
      },

      _updateImageCapabilityUI: function() {
        var enabled = this._modelSupportsImage(this.model);

        if (this.screenshotMenuItemNode) {
          this.screenshotMenuItemNode.style.display = enabled ? 'flex' : 'none';
        }

        if (!enabled && this.attachedImages && this.attachedImages.length > 0) {
          this.attachedImages = [];
          this._renderAttachmentChips();
        }
      },

      _handleImageUploadChange: function(evt) {
        var files = evt && evt.target && evt.target.files ? Array.prototype.slice.call(evt.target.files) : [];
        if (!files || files.length === 0) {
          return;
        }

        var maxAttachments = 3;
        var maxImageBytes = 6 * 1024 * 1024;    // 6 MB for images
        var maxFileBytes = 10 * 1024 * 1024;     // 10 MB for text files
        var currentCount = this.attachedImages.length + this.attachedFiles.length + this.attachedPdfs.length;
        var remainingSlots = Math.max(0, maxAttachments - currentCount);

        if (remainingSlots <= 0) {
          topic.publish('CopilotApiError', { error: new Error('You can attach up to 3 files per message.') });
          this.imageUploadInput.value = '';
          return;
        }

        var acceptedFiles = files.slice(0, remainingSlots);
        if (files.length > remainingSlots) {
          topic.publish('CopilotApiError', {
            error: new Error('Only the first ' + remainingSlots + ' file(s) were attached. Maximum is 3 total.')
          });
        }

        var imageFiles = [];
        var textFiles = [];
        var pdfFiles = [];
        var modelSupportsImage = this._modelSupportsImage(this.model);

        acceptedFiles.forEach(function(file) {
          if (/^image\/(png|jpeg|jpg)$/i.test(file.type || '')) {
            imageFiles.push(file);
          } else if (/^application\/pdf$/i.test(file.type || '') || /\.pdf$/i.test(file.name || '')) {
            pdfFiles.push(file);
          } else {
            textFiles.push(file);
          }
        });

        // Reject image files if model doesn't support images
        if (imageFiles.length > 0 && !modelSupportsImage) {
          topic.publish('CopilotApiError', {
            error: new Error('The current model does not support image attachments. Only text files can be uploaded.')
          });
          imageFiles = [];
        }

        var readPromises = [];

        // Process image files (existing logic)
        imageFiles.forEach(lang.hitch(this, function(file) {
          readPromises.push(new Promise(lang.hitch(this, function(resolve, reject) {
            if (file.size > maxImageBytes) {
              reject(new Error('Image "' + (file.name || 'image') + '" is larger than 6 MB.'));
              return;
            }
            var reader = new FileReader();
            reader.onload = function(loadEvt) {
              resolve({
                fileType: 'image',
                id: 'img-' + Date.now() + '-' + Math.floor(Math.random() * 1000000),
                image: loadEvt && loadEvt.target ? loadEvt.target.result : null,
                attachment: {
                  type: 'image',
                  source: 'upload',
                  name: file.name || 'Uploaded image'
                }
              });
            };
            reader.onerror = function() {
              reject(new Error('Unable to read image "' + (file.name || 'image') + '".'));
            };
            reader.readAsDataURL(file);
          })));
        }));

        // Process PDF files — read as data URL (binary), NOT gated on model image support
        var maxPdfBytes = 10 * 1024 * 1024; // 10 MB
        pdfFiles.forEach(lang.hitch(this, function(file) {
          readPromises.push(new Promise(lang.hitch(this, function(resolve, reject) {
            if (file.size > maxPdfBytes) {
              reject(new Error('PDF "' + (file.name || 'file') + '" is larger than 10 MB.'));
              return;
            }
            var reader = new FileReader();
            reader.onload = function(loadEvt) {
              resolve({
                fileType: 'pdf',
                id: 'pdf-' + Date.now() + '-' + Math.floor(Math.random() * 1000000),
                content: loadEvt && loadEvt.target ? loadEvt.target.result : null,
                name: file.name || 'document.pdf',
                size: file.size,
                mimeType: 'application/pdf',
                attachment: {
                  type: 'pdf',
                  source: 'upload',
                  name: file.name || 'Attached PDF',
                  size: file.size
                }
              });
            };
            reader.onerror = function() {
              reject(new Error('Unable to read PDF "' + (file.name || 'file') + '".'));
            };
            reader.readAsDataURL(file);
          })));
        }));

        // Process text files (NEW)
        textFiles.forEach(lang.hitch(this, function(file) {
          readPromises.push(new Promise(lang.hitch(this, function(resolve, reject) {
            if (file.size > maxFileBytes) {
              reject(new Error('File "' + (file.name || 'file') + '" is larger than 10 MB.'));
              return;
            }
            var reader = new FileReader();
            reader.onload = function(loadEvt) {
              var content = loadEvt && loadEvt.target ? loadEvt.target.result : '';
              // Validate it's valid text (check for null bytes as binary indicator)
              if (content && content.indexOf('\u0000') !== -1) {
                reject(new Error('File "' + (file.name || 'file') + '" appears to be a binary file. Only text files are supported.'));
                return;
              }
              resolve({
                fileType: 'text',
                id: 'file-' + Date.now() + '-' + Math.floor(Math.random() * 1000000),
                name: file.name || 'Uploaded file',
                content: content,
                size: file.size,
                mimeType: file.type || 'text/plain',
                attachment: {
                  type: 'file',
                  source: 'upload',
                  name: file.name || 'Uploaded file',
                  size: file.size
                }
              });
            };
            reader.onerror = function() {
              reject(new Error('Unable to read file "' + (file.name || 'file') + '".'));
            };
            reader.readAsText(file);
          })));
        }));

        Promise.all(readPromises).then(lang.hitch(this, function(results) {
          results.forEach(lang.hitch(this, function(entry) {
            var total = this.attachedImages.length + this.attachedFiles.length + this.attachedPdfs.length;
            if (total >= maxAttachments) return;
            if (entry.fileType === 'image' && entry.image) {
              this.attachedImages.push(entry);
            } else if (entry.fileType === 'pdf' && entry.content) {
              this.attachedPdfs.push(entry);
            } else if (entry.fileType === 'text' && entry.content !== undefined) {
              this.attachedFiles.push(entry);
            }
          }));
          this._renderAttachmentChips();
        })).catch(function(error) {
          topic.publish('CopilotApiError', { error: error });
        }).finally(lang.hitch(this, function() {
          this.imageUploadInput.value = '';
        }));
      },

      _clearAttachedImage: function() {
        this.attachedImages = [];
        this.attachedFiles = [];
        this.attachedPdfs = [];
        if (this.imageUploadInput) {
          this.imageUploadInput.value = '';
        }
        this._renderAttachmentChips();
      },

      setAttachedImages: function(entries) {
        this.attachedImages = Array.isArray(entries) ? entries.slice() : [];
        this._renderAttachmentChips();
      },

      _buildUserMessageForSubmit: function(inputText, attachmentMeta) {
        var userMessage = {
          role: 'user',
          content: inputText,
          message_id: 'user_' + Date.now(),
          timestamp: new Date().toISOString()
        };
        if (attachmentMeta) {
          if (Array.isArray(attachmentMeta) && attachmentMeta.length > 0) {
            userMessage.attachments = attachmentMeta;
          } else if (!Array.isArray(attachmentMeta)) {
            userMessage.attachments = [attachmentMeta];
          }
        }
        return userMessage;
      },

      _buildClarificationResponseMessage: function(answers) {
        var formattedLines = ['**Clarification Responses**'];
        (answers || []).forEach(function(a, idx) {
          var question = (a && a.question) ? String(a.question) : ('Question ' + (idx + 1));
          var answer = (a && a.answer) ? String(a.answer) : '(no answer)';
          formattedLines.push((idx + 1) + '. **' + question + '**');
          formattedLines.push('   - ' + answer);
        });

          return {
            role: 'user_clarification',
            content: formattedLines.join('\n'),
            message_id: 'user_clarification_' + Date.now(),
            timestamp: new Date().toISOString(),
            clarificationAnswers: answers || []
          };
      },

      _getUploadedImagePayload: function() {
        if (!Array.isArray(this.attachedImages) || this.attachedImages.length === 0) {
          return null;
        }
        var maxImages = 3;
        var normalized = this.attachedImages
          .filter(function(entry) {
            return entry && typeof entry.image === 'string' && entry.image.length > 0;
          })
          .slice(0, maxImages);
        if (normalized.length === 0) {
          return null;
        }
        return {
          images: normalized.map(function(entry) { return entry.image; }),
          attachments: normalized.map(function(entry) {
            var attachment = entry.attachment || {};
            return {
              type: 'image',
              source: attachment.source || 'upload',
              name: attachment.name || 'Uploaded image'
            };
          })
        };
      },


      _getUploadedFilesPayload: function() {
        if (!Array.isArray(this.attachedFiles) || this.attachedFiles.length === 0) {
          return null;
        }
        return {
          files: this.attachedFiles.map(function(entry) {
            return {
              name: entry.name,
              content: entry.content,
              mime_type: entry.mimeType || 'text/plain',
              size: entry.size || 0
            };
          }),
          attachments: this.attachedFiles.map(function(entry) {
            return {
              type: 'file',
              source: 'upload',
              name: entry.name || 'Uploaded file',
              size: entry.size || 0
            };
          })
        };
      },

      _getUploadedPdfsPayload: function() {
        if (!Array.isArray(this.attachedPdfs) || this.attachedPdfs.length === 0) {
          return null;
        }
        return {
          pdfs: this.attachedPdfs.map(function(entry) {
            return {
              name: entry.name || 'document.pdf',
              content: entry.content,
              mime_type: 'application/pdf',
              size: entry.size || 0
            };
          }),
          attachments: this.attachedPdfs.map(function(entry) {
            return {
              type: 'pdf',
              source: 'upload',
              name: entry.name || 'Attached PDF',
              size: entry.size || 0
            };
          })
        };
      },

      setStatePrompt: function(statePrompt) {
        this.statePrompt = statePrompt;
      },

      /**
       * Build a completedResults map from a plan object's step data.
       * Used when resuming a paused needs_input step.
       */
      _getCompletedResultsFromPlan: function(planData) {
        var results = {};
        if (!planData || !planData.steps) { return results; }
        for (var i = 0; i < planData.steps.length; i++) {
          var s = planData.steps[i];
          if (s.status === 'completed' && s.result_summary) {
            results[s.step_id] = { result_summary: s.result_summary };
          }
        }
        return results;
      },

      /**
       * Finalizes creation of a brand-new chat after the first successful response.
       * Session registration/list updates are handled earlier; this now marks the
       * chat as initialized and triggers title generation.
       * @param {boolean} generateTitleImmediately – if false, skip title generation (default true)
       */
      _finishNewChat: function(generateTitleImmediately, sessionId) {
        if (typeof generateTitleImmediately === 'undefined') { generateTitleImmediately = true; }
        // These flags belong to the session on screen.  A turn from an
        // earlier session finishing after New Chat must not clear the new
        // session's flags (its first send would skip registration/title).
        if (!sessionId || sessionId === this.sessionId) {
          this.new_chat = false;
          this.session_registered = true;
        }

        if (generateTitleImmediately && sessionId) {
          setTimeout(function() {
            topic.publish('generateSessionTitle', { sessionId: sessionId });
          }, 100);
        }
      },

    /**
     * @param {Object} [submitOpts]
     * @param {string} [submitOpts.target_agent] - Force routing to an agent
     *   (used by the execution_blocked card's run button).
     * @param {boolean} [submitOpts.execute_once] - Run this one turn in
     *   execute mode without changing the session toggle.
     * @param {Array} [submitOpts.replay_actions] - With execute_once: the
     *   card's blocked_actions, replayed verbatim by the service agent.
     * @param {Array} [submitOpts.prepared_actions] - Without execute_once:
     *   the card's blocked_actions, sent back for revision ("Other"); the
     *   service agent edits the set under the plan gate and asks again.
     */
    _handleSubmitStream: function(submitOpts) {
      submitOpts = submitOpts || {};
      var inputText = this.textArea.get('value');
      var _self = this;
      // Capture session ID and new-chat flag at submit time so title
      // generation and TurnEnded publish the correct values even if the
      // user switches sessions mid-turn.
      var submitSessionId = this.sessionId;
      var submitWasNewChat = this.new_chat;

      // --- Plan step needs_input intercept ---
      // If a plan step is paused waiting for user input, redirect the
      // user's message to re-execute that same step.  The user's answer
      // becomes the query text, and recent_messages (which now include
      // the agent's question + user's answer) provide the context the
      // planning agent needs to reformulate the step query.
      if (this._pendingPlanStepInput && inputText && inputText.trim()) {
        var pending = this._pendingPlanStepInput;
        this._pendingPlanStepInput = null;  // Clear before re-submit

        // Show user message in chat before submitting
        var userMessage = this._buildUserMessageForSubmit(inputText, null);
        this.chatStore.addMessage(userMessage);
        this.displayWidget.showMessages(this.chatStore.query());
        this._setInputTextValue('');

        // Reset the step to pending so the planning agent re-executes it
        if (pending.plan && pending.plan.steps && pending.plan.steps[pending.stepIndex]) {
          pending.plan.steps[pending.stepIndex].status = 'pending';
          delete pending.plan._needsInputStepIndex;
        }

        // Publish so PlanCard can update its UI (step back to pending, unpause)
        topic.publish('CopilotPlanStepUpdate', {
          event: 'started',
          plan_id: pending.plan.plan_id,
          step_id: pending.plan.steps[pending.stepIndex].step_id,
          step_index: pending.stepIndex
        });

        this._submitPlanAction(
          inputText,
          pending.sessionId,
          {
            plan: pending.plan,
            plan_action: 'execute_next',
            current_step_index: pending.stepIndex,
            completed_step_results: pending.completedResults || {}
          }
        );
        return;
      }
      var uploadedImagePayload = this._getUploadedImagePayload();
      var hasUploadedImage = !!(uploadedImagePayload && Array.isArray(uploadedImagePayload.images) && uploadedImagePayload.images.length > 0 && this._modelSupportsImage(this.model));
      var uploadedFilesPayload = this._getUploadedFilesPayload();
      var hasUploadedFiles = !!(uploadedFilesPayload && Array.isArray(uploadedFilesPayload.files) && uploadedFilesPayload.files.length > 0);
      var uploadedPdfsPayload = this._getUploadedPdfsPayload();
      var hasUploadedPdfs = !!(uploadedPdfsPayload && Array.isArray(uploadedPdfsPayload.pdfs) && uploadedPdfsPayload.pdfs.length > 0);
      var hasScreenshot = hasUploadedImage && (uploadedImagePayload.attachments || []).some(function(att) {
        return att && att.source === 'screenshot';
      });
      // Nothing to send: no text and no attachment.
      if (!(inputText && inputText.trim()) && !hasUploadedImage && !hasUploadedFiles && !hasUploadedPdfs) {
        return;
      }
      var hasAnyImage = hasUploadedImage;
      var submitModel = hasAnyImage ? this._resolveImageModel() : this.model;

      topic.publish('ChatMessageSubmitted');

      var allAttachments = [];
      if (hasUploadedImage) {
        allAttachments = allAttachments.concat(uploadedImagePayload.attachments);
      }
      if (hasUploadedFiles) {
        allAttachments = allAttachments.concat(uploadedFilesPayload.attachments);
      }
      if (hasUploadedPdfs) {
        allAttachments = allAttachments.concat(uploadedPdfsPayload.attachments);
      }
      if (submitOpts.execute_once) {
        // Mirrors the chip the gateway persists on the stored message.
        allAttachments = allAttachments.concat([{ type: 'execution', source: 'once', name: 'Execute mode (this message only)' }]);
      } else if (Array.isArray(submitOpts.prepared_actions) && submitOpts.prepared_actions.length > 0) {
        allAttachments = allAttachments.concat([{ type: 'execution', source: 'revise', name: 'Changing the prepared jobs' }]);
      }
      var userMessage = this._buildUserMessageForSubmit(
          inputText,
          allAttachments.length > 0 ? allAttachments : null
      );

      this.chatStore.addMessage(userMessage);
      this.displayWidget.showMessages(this.chatStore.query());
      this._setInputTextValue('');
      if (hasUploadedImage || hasUploadedFiles || hasUploadedPdfs) {
        this._clearAttachedImage();
      }

      this.isSubmitting = true;
      this.isQueryProgressActive = false;
      this.submitButton.set('disabled', true);
      this._updateStopButtonState();

      // Notify sidebar so the busy dot can update immediately
      topic.publish('ChatSession:TurnStarted', { sessionId: submitSessionId });

      this.displayWidget.showLoadingIndicator('Processing\u2026');

      var systemPrompt = 'You are a helpful scientist website assistant for the website BV-BRC, the Bacterial and Viral Bioinformatics Resource Center.\\n\\n';
      if (this.systemPrompt) {
          systemPrompt += this.systemPrompt;
      }
      if (this.statePrompt) {
          systemPrompt += this.statePrompt;
      }
      if (hasAnyImage) {
          systemPrompt += '\\n\\nThe user attached an image. Use it as additional context.';
      }
      if (hasScreenshot) {
          systemPrompt += ' Analyze the screenshot and respond to the user\'s query.';
      }

      let assistantMessage = null;
      let statusMessageId = null;
      let lastSteps = null;
      let assistantMessageCreated = false;

      const params = {
          inputText: inputText,
          sessionId: this.sessionId,
          systemPrompt: systemPrompt,
          model: submitModel,
          save_chat: true,
          execution_mode: this.executionMode
      };
      if (submitOpts.target_agent) {
        params.target_agent = submitOpts.target_agent;
      }
      if (submitOpts.execute_once) {
        params.execute_once = true;
      }
      if (submitOpts.execute_once && Array.isArray(submitOpts.replay_actions) && submitOpts.replay_actions.length > 0) {
        params.replay_actions = submitOpts.replay_actions;
      }
      if (!submitOpts.execute_once && Array.isArray(submitOpts.prepared_actions) && submitOpts.prepared_actions.length > 0) {
        params.prepared_actions = submitOpts.prepared_actions;
      }

      if (hasUploadedImage) {
        params.images = uploadedImagePayload.images;
        params.image_attachments = uploadedImagePayload.attachments || [];
      }
      if (hasUploadedFiles) {
        params.files = uploadedFilesPayload.files;
      }
      if (hasUploadedPdfs) {
        params.pdfs = uploadedPdfsPayload.pdfs;
      }

      this._submitCopilotQueryStreamWithRegistration(params,
          (chunk, toolMetadata) => {
              var hasTextChunk = !!(chunk && String(chunk).length > 0);
              var hasWidget = !!(toolMetadata && toolMetadata.card);

              if (!assistantMessageCreated && (hasTextChunk || hasWidget)) {
                  this.displayWidget.hideLoadingIndicator();
                  if (statusMessageId) {
                      this.chatStore.removeMessage(statusMessageId);
                      statusMessageId = null;
                  }
                  assistantMessage = {
                      role: 'assistant',
                      content: '',
                      message_id: 'assistant_' + Date.now(),
                      timestamp: new Date().toISOString()
                  };
                  if (lastSteps && lastSteps.length) {
                      // The steps shown while waiting stay under the answer
                      // (the gateway saves them as agent_metadata.steps).
                      assistantMessage.agent_metadata = { steps: lastSteps };
                  }
                  if (toolMetadata) {
                      this._applyToolMetadataToAssistantMessage(assistantMessage, toolMetadata);
                  }
                  this.chatStore.addMessage(assistantMessage);
                  assistantMessageCreated = true;
              }
              if (assistantMessageCreated && toolMetadata) {
                  this._applyToolMetadataToAssistantMessage(assistantMessage, toolMetadata);
              }
              if (assistantMessageCreated && hasTextChunk) {
                  if (!(chunk.length > 1 && assistantMessage.content.length >= chunk.length && assistantMessage.content.endsWith(chunk))) {
                      assistantMessage.content += chunk;
                  }
              }
              if (assistantMessageCreated) {
                  this.displayWidget.showMessages(this.chatStore.query());
              }
          },
          (info) => {
              this.displayWidget.hideLoadingIndicator();
              // Use the captured submit-time new-chat flag + session ID so
              // title generation targets the originating session even when
              // the user has already switched to another session.
              if (submitWasNewChat || _self._createdOnFirstSendId === submitSessionId) {
                  submitWasNewChat = false; // prevent double-fire
                  _self._createdOnFirstSendId = null;
                  _self._finishNewChat(true, submitSessionId);
              }
              this.isSubmitting = false;
              this.isQueryProgressActive = false;
              this.submitButton.set('disabled', false);
              this._updateStopButtonState();
              // Only publish TurnEnded when the stream truly ended (server 'done'
              // or normal close). On abort (session switch / Stop), the gateway
              // keeps running the turn — the sidebar chip must persist until
              // ChatSessionScrollBar's per-session poll observes active_job_id
              // clearing in Mongo.
              if (!info || info.reason !== 'aborted') {
                  topic.publish('ChatSession:TurnEnded', { sessionId: submitSessionId });
              }
          },
          (error) => {
              // Another turn is still running in this chat (gateway 409).
              // Nothing was sent: take the message back out of the chat, give
              // the text back, and show the notice without "Reload Session".
              var turnInFlight = !!(error && error.code === 'TURN_IN_FLIGHT');
              if (turnInFlight) {
                  this.chatStore.removeMessage(userMessage.message_id);
                  this.displayWidget.showMessages(this.chatStore.query());
                  if (!submitOpts.execute_once && !this.textArea.get('value')) {
                      this._setInputTextValue(inputText);
                  }
                  error.noReload = true;
              }
              topic.publish('CopilotApiError', { error: error });
              this.displayWidget.hideLoadingIndicator();
              this.isSubmitting = false;
              this.isQueryProgressActive = false;
              this.submitButton.set('disabled', false);
              this._updateStopButtonState();
              // The other turn is still running: keep its busy chip.
              if (turnInFlight) { return; }
              // Errors that pre-empt the turn locally shouldn't clear the chip.
              // The gateway may still be running; the poll is the source of truth.
              if (error && error.isStreamDisconnect) {
                  // Connection interrupted — do not publish TurnEnded; poll will
                  // detect real completion or the user can reload the session.
                  return;
              }
              topic.publish('ChatSession:TurnEnded', { sessionId: submitSessionId });
          },
          null, // onProgress — agent progress is handled via statusMessage callback above
          (statusMessage) => {
              if (statusMessage.should_remove) {
                  this.chatStore.removeMessage(statusMessage.message_id);
                  if (statusMessageId === statusMessage.message_id) {
                      statusMessageId = null;
                  }
              } else {
                  this.displayWidget.hideLoadingIndicator();
                  statusMessageId = statusMessage.message_id;
                  if (Array.isArray(statusMessage.steps)) {
                      lastSteps = statusMessage.steps;
                  }
                  var existingMessage = this.chatStore.getMessageById(statusMessage.message_id);
                  if (existingMessage) {
                      this.chatStore.updateMessage(statusMessage);
                  } else {
                      this.chatStore.addMessage(statusMessage);
                  }
              }
              this.displayWidget.showMessages(this.chatStore.query());
          }
      );
    },

    destroy: function() {
      this._closeAttachMenu();
      this._topicHandles.forEach(function(h) { h.remove(); });
      this._topicHandles = [];
      this.inherited(arguments);
    }
  });
});
