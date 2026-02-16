/**
 * @module p3/widget/CopilotInput
 * @description A widget that provides a text input interface for the PATRIC Copilot chat system.
 * Includes an auto-expanding textarea and submit button for sending queries to the Copilot API.
 *
 * Implementation:
 * - Extends ContentPane to provide base widget functionality
 * - Creates a textarea and submit button interface
 * - Handles auto-expansion of textarea based on content
 * - Manages submission of both regular and RAG-enhanced queries
 * - Maintains chat session state and history
 * - Provides model and RAG database selection UI
 */
define([
    'dojo/_base/declare', 'dojo/dom-construct', 'dojo/on', 'dijit/layout/ContentPane', 'dijit/form/Textarea', 'dijit/form/Button', 'dojo/topic', 'dojo/_base/lang', 'html2canvas/dist/html2canvas.min'
  ], function (
    declare, domConstruct, on, ContentPane, Textarea, Button, topic, lang, html2canvas
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

      /** True only when query pagination progress is active; controls abort button visibility */
      isQueryProgressActive: false,

      /** Custom system prompt to prepend to queries */
      systemPrompt: null,

      /** Selected language model for chat completion */
      model: null,

      /** Selected RAG database for enhanced responses */
      ragDb: 'bvbrc_helpdesk',

      statePrompt: null,

      /** Number of documents to use for RAG queries */
      numDocs: 3,

      // Widget styling
      style: 'padding: 0 5px 5px 5px; border: 0; height: 20%;',

      // Size constraints for the widget
      minSize: 40,
      maxSize: 200,

      // Flag to track page content toggle state
      pageContentEnabled: false,

      enhancedPrompt: null,
      selectedWorkspaceItems: [],
      selectedJobs: [],
      selectedWorkflows: [],
      attachedImages: [],
      imageUploadInput: null,
      imageActionNode: null,
      imageActionMenuNode: null,
      imageActionOutsideClickHandle: null,
      onImageAttachmentsChanged: null,
      _nextImageAttachmentId: 0,

      /**
       * Constructor that initializes the widget with provided options
       * Uses safeMixin to safely merge configuration arguments
       */
      constructor: function(args) {
        declare.safeMixin(this, args);
        this._nextImageAttachmentId = 0;
      },

      _toContextImageItems: function(entries) {
        if (!Array.isArray(entries)) {
          return [];
        }
        return entries.map(function(entry, index) {
          var attachment = entry && entry.attachment ? entry.attachment : {};
          var id = entry && entry.id ? entry.id : ('img-' + index);
          return {
            id: id,
            name: attachment.name || 'Uploaded image',
            source: attachment.source || 'upload',
            thumbnail: entry && typeof entry.image === 'string' ? entry.image : null
          };
        });
      },

      _emitImageAttachmentsChanged: function() {
        if (typeof this.onImageAttachmentsChanged !== 'function') {
          return;
        }
        var entries = Array.isArray(this.attachedImages) ? this.attachedImages.slice() : [];
        this.onImageAttachmentsChanged({
          sessionId: this.sessionId,
          entries: entries,
          items: this._toContextImageItems(entries)
        });
      },

      _escapeHtml: function(text) {
        if (typeof text !== 'string') {
          return text;
        }
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      },

      _getSelectedWorkspaceItemsForRequest: function() {
        if (!Array.isArray(this.selectedWorkspaceItems) || this.selectedWorkspaceItems.length === 0) {
          return [];
        }
        // Extract only path and type from items
        return this.selectedWorkspaceItems.map(function(item) {
          if (!item || item.selected === false || !item.path) {
            return null;
          }
          return {
            path: item.path,
            type: item.type || null
          };
        }).filter(function(item) {
          return item !== null && typeof item.path === 'string' && item.path.length > 0;
        });
      },

      _appendWorkspaceSelectionToStreamParams: function(params) {
        var selectedItems = this._getSelectedWorkspaceItemsForRequest();
        if (selectedItems.length > 0) {
          params.selected_workspace_items = selectedItems;
        }
        var selectedJobs = this._getSelectedJobsForRequest();
        if (selectedJobs.length > 0) {
          params.selected_jobs = selectedJobs;
        }
        var selectedWorkflows = this._getSelectedWorkflowsForRequest();
        if (selectedWorkflows.length > 0) {
          params.selected_workflows = selectedWorkflows;
        }
      },

      _applyToolMetadataToAssistantMessage: function(assistantMessage, toolMetadata) {
        if (!assistantMessage || !toolMetadata) {
          return;
        }
        assistantMessage.source_tool = toolMetadata.source_tool || assistantMessage.source_tool;
        assistantMessage.isWorkflow = toolMetadata.isWorkflow;
        assistantMessage.workflowData = toolMetadata.workflowData;
        assistantMessage.isWorkspaceListing = toolMetadata.isWorkspaceListing;
        assistantMessage.workspaceData = toolMetadata.workspaceData;
        assistantMessage.isWorkspaceBrowse = toolMetadata.isWorkspaceBrowse;
        assistantMessage.workspaceBrowseResult = toolMetadata.workspaceBrowseResult;
        assistantMessage.isJobsBrowse = toolMetadata.isJobsBrowse;
        assistantMessage.jobsBrowseResult = toolMetadata.jobsBrowseResult;
        assistantMessage.chatSummary = toolMetadata.chatSummary;
        assistantMessage.uiPayload = toolMetadata.uiPayload;
        assistantMessage.uiAction = toolMetadata.uiAction;
      },

      setSelectedWorkspaceItems: function(items) {
        this.selectedWorkspaceItems = Array.isArray(items) ? items.slice() : [];
        this._renderWorkspaceSelectionIndicator();
      },

      _getSelectedJobsForRequest: function() {
        if (!Array.isArray(this.selectedJobs) || this.selectedJobs.length === 0) {
          return [];
        }
        return this.selectedJobs.map(function(job) {
          if (!job || job.selected === false || job.id === null || job.id === undefined || job.id === '') {
            return null;
          }
          return {
            id: String(job.id),
            status: job.status || null,
            application_name: job.application_name || job.app || null
          };
        }).filter(function(job) {
          return job !== null;
        });
      },

      setSelectedJobs: function(items) {
        this.selectedJobs = Array.isArray(items) ? items.slice() : [];
        this._renderJobsSelectionIndicator();
      },

      _getSelectedWorkflowsForRequest: function() {
        if (!Array.isArray(this.selectedWorkflows) || this.selectedWorkflows.length === 0) {
          return [];
        }
        return this.selectedWorkflows.map(function(workflow) {
          if (!workflow || workflow.selected === false) {
            return null;
          }
          var workflowId = workflow.workflow_id || workflow.id;
          if (!workflowId) {
            return null;
          }
          return {
            workflow_id: String(workflowId),
            workflow_name: workflow.workflow_name || null,
            status: workflow.status || null,
            submitted_at: workflow.submitted_at || null,
            completed_at: workflow.completed_at || null
          };
        }).filter(function(workflow) {
          return workflow !== null;
        });
      },

      setSelectedWorkflows: function(items) {
        this.selectedWorkflows = Array.isArray(items) ? items.slice() : [];
      },

      _registerSessionIfNeeded: function() {
        if (!this.new_chat || this.session_registered || !this.copilotApi || !this.sessionId) {
          return Promise.resolve(false);
        }

        return this.copilotApi.registerSession(this.sessionId, 'New Chat').then(lang.hitch(this, function() {
          this.session_registered = true;

          if (window && window.App && window.App.chatSessionsStore) {
            window.App.chatSessionsStore.addSession({
              session_id: this.sessionId,
              title: 'New Chat',
              created_at: Date.now()
            });
          }

          topic.publish('reloadUserSessions', { highlightSessionId: this.sessionId });
          return true;
        }));
      },

      _submitCopilotQueryWithRegistration: function() {
        var args = arguments;
        return this._registerSessionIfNeeded().then(lang.hitch(this, function() {
          return this.copilotApi.submitCopilotQuery.apply(this.copilotApi, args);
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
       * Sets up the widget UI after DOM creation
       * Implementation:
       * - Creates flex container layout
       * - Adds auto-expanding textarea
       * - Adds submit button
       * - Creates model/RAG selection UI
       * - Sets up event handlers
       */
      postCreate: function() {
        // Create main wrapper with flex layout
        var wrapperDiv = domConstruct.create('div', {
            style: 'display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; height: 100%; padding-top: 2px; border: 0;'
        }, this.containerNode);

        // Container for input elements with flex layout
        var inputContainer = domConstruct.create('div', {
            style: 'display: flex; justify-content: center; align-items: flex-start; width: 100%;'
        }, wrapperDiv);

        // Add container for the split image button on the left side
        var toggleContainer = domConstruct.create('div', {
            style: 'width: auto; height: 60px; display: flex; flex-direction: row; align-items: center; margin-right: 15px; position: relative; gap: 8px;'
        }, inputContainer);

        // Image attachment counter (similar to workspace selection indicator) - positioned to the left
        this.imageAttachmentCounter = domConstruct.create('div', {
            className: 'imageAttachmentCounter',
            title: 'Attached images'
        }, toggleContainer);
        this.imageAttachmentCountNode = domConstruct.create('span', {
            className: 'imageAttachmentCount'
        }, this.imageAttachmentCounter);

        // Create split button container
        var splitButtonContainer = domConstruct.create('div', {
            className: 'imageSplitButtonContainer'
        }, toggleContainer);

        // Top half - Screenshot
        var screenshotHalf = domConstruct.create('button', {
            type: 'button',
            className: 'imageSplitButtonTop pageContentToggleInactive',
            innerHTML: 'Screenshot'
        }, splitButtonContainer);
        this.screenshotToggleNode = screenshotHalf;

        // Bottom half - Upload
        var uploadHalf = domConstruct.create('button', {
            type: 'button',
            className: 'imageSplitButtonBottom',
            innerHTML: 'Upload'
        }, splitButtonContainer);
        this.uploadImageNode = uploadHalf;

        this.imageUploadInput = domConstruct.create('input', {
            type: 'file',
            accept: 'image/png,image/jpeg,image/jpg',
            multiple: true,
            style: 'display: none;'
        }, wrapperDiv);

        this.pageContentToggle = {
            domNode: screenshotHalf
        };

        screenshotHalf.title = 'Include a screenshot of the current page with your next message.';
        uploadHalf.title = 'Attach one or more images from your computer.';

        on(screenshotHalf, 'click', lang.hitch(this, function(evt) {
            evt.preventDefault();
            evt.stopPropagation();
            if (!this._modelSupportsImage(this.model)) {
                return;
            }
            topic.publish('pageContentToggleChanged', !this.pageContentEnabled);
        }));

        on(uploadHalf, 'click', lang.hitch(this, function(evt) {
            evt.preventDefault();
            evt.stopPropagation();
            if (!this._modelSupportsImage(this.model) || !this.imageUploadInput) {
                return;
            }
            this.imageUploadInput.click();
        }));

        on(this.imageUploadInput, 'change', lang.hitch(this, this._handleImageUploadChange));

        // Initialize button style
        this._updateToggleButtonStyle();

        // Configure textarea with auto-expansion and styling
        this.textArea = new Textarea({
            style: 'width: 60%; min-height: 50px; max-height: 100%; resize: none; overflow-y: hidden; border-radius: 5px; margin-right: 10px;',
            rows: 3, // Default visible rows
            maxLength: 10000,
            placeholder: 'Enter your text here...'
        });

        // Add textarea to container
        this.textArea.placeAt(inputContainer);

        // Configure submit button with click handler
        this.submitButton = new Button({
            label: 'Submit',
            style: 'height: 30px; margin-right: 10px;',
            onClick: lang.hitch(this, function() {
            // Prevent multiple simultaneous submissions
            if (this.isSubmitting) return;
            // Handle different submission types based on configuration
            if (this.pageContentEnabled) {
                this._handlePageSubmitStream();
            } else if (this.copilotApi && this.ragDb) {
                this._handleRagSubmitStream();
            } else if (this.copilotApi) {
                this._handleRegularSubmitStream();
            } else {
                console.error('CopilotApi widget not initialized');
            }
            })
        });

        // Add button to container
        this.submitButton.placeAt(inputContainer);

        this.abortButton = new Button({
            label: 'Abort',
            style: 'height: 30px; margin-right: 10px;',
            disabled: true,
            onClick: lang.hitch(this, function() {
                this._handleAbortClick();
            })
        });
        this.abortButton.placeAt(inputContainer);

        // Subscribe to page content toggle changes from ChatSessionOptionsBar
        topic.subscribe('pageContentToggleChanged', lang.hitch(this, function(checked) {
            if (!this._modelSupportsImage(this.model)) {
                this.pageContentEnabled = false;
                this._updateToggleButtonStyle();
                return;
            }
            this.pageContentEnabled = checked;
            this._updateToggleButtonStyle();
            console.log('Page content toggle changed to:', checked);
        }));

        // Subscribe to session changes to reset state
        topic.subscribe('ChatSession:Selected', lang.hitch(this, function(data) {
            // Reset screenshot toggle state
            this.pageContentEnabled = false;
            this._updateToggleButtonStyle();
            topic.publish('pageContentToggleChanged', false);

            // Clear attached images
            this._clearAttachedImage();

            // Clear selected workspace items
            this.selectedWorkspaceItems = [];
            this._renderWorkspaceSelectionIndicator();
            this.selectedJobs = [];
            this._renderJobsSelectionIndicator();
            this.selectedWorkflows = [];
        }));

        // Maximum height for textarea before scrolling
        const maxHeight = 200; // ~9 rows

        // Handle textarea auto-expansion on input
        on(this.textArea, 'input', function() {
            this.textArea.style.height = 'auto'; // Reset height
            this.textArea.style.height = (this.textArea.scrollHeight) + 'px'; // Expand to content

            // Enable scrolling if content exceeds max height
            if (this.textArea.scrollHeight > maxHeight) {
            this.textArea.style.height = maxHeight + 'px';
            this.textArea.style.overflowY = 'auto';
            } else {
            this.textArea.style.overflowY = 'hidden';
            }
        }.bind(this));

        // Handle Enter key for submission (except with Shift)
        on(this.textArea, 'keypress', lang.hitch(this, function(evt) {
            if (evt.keyCode === 13 && !evt.shiftKey && !this.isSubmitting) {
            evt.preventDefault();
            this.submitButton.onClick();
            }
        }));

        topic.subscribe('enhancePromptChange', lang.hitch(this, function(enhancedPrompt) {
          this.enhancedPrompt = enhancedPrompt;
        }));

        // Subscribe to main chat suggestion selection to populate input text area
        topic.subscribe('populateInputSuggestion', lang.hitch(this, function(suggestion) {
          if (this.textArea) {
            this.textArea.set('value', suggestion);
            // Focus on the text area and place cursor at the end
            this.textArea.focus();
            if (this.textArea.textbox) {
              var textbox = this.textArea.textbox;
              textbox.selectionStart = textbox.selectionEnd = suggestion.length;
            }
          }
        }));

        this._renderWorkspaceSelectionIndicator();
        this._renderJobsSelectionIndicator();
        this._updateImageCapabilityUI();
        this._updateAbortButtonState();
      },

      _isAbortableQueryTool: function(toolId) {
        if (!toolId || typeof toolId !== 'string') return false;
        var normalized = toolId.split('.').pop();
        return normalized === 'bvbrc_query_collection' || normalized === 'bvbrc_global_data_search';
      },

      _updateAbortButtonState: function() {
        if (!this.abortButton) return;
        var streamState = this.copilotApi && this.copilotApi.getCurrentStreamState
          ? this.copilotApi.getCurrentStreamState()
          : null;
        var activeToolId = streamState ? streamState.tool_id : null;
        var hasAbortableTool = !activeToolId || this._isAbortableQueryTool(activeToolId);
        var hasJobId = !!(streamState && streamState.job_id);
        var shouldShow = !!this.isQueryProgressActive;
        var shouldEnable = !!this.isSubmitting && shouldShow && hasJobId && hasAbortableTool;

        if (this.abortButton.domNode) {
          this.abortButton.domNode.style.display = shouldShow ? '' : 'none';
        }
        this.abortButton.set('disabled', !shouldEnable);
      },

      _handleAbortStatusMessageEvent: function(statusMessage) {
        if (!statusMessage || !statusMessage.event_type) return;
        if (statusMessage.event_type === 'query_progress') {
          this.isQueryProgressActive = true;
          this._updateAbortButtonState();
          return;
        }

        if (statusMessage.event_type === 'query_aborted' ||
            statusMessage.event_type === 'done' ||
            statusMessage.event_type === 'error') {
          this.isQueryProgressActive = false;
          this._updateAbortButtonState();
        }
      },

      _handleAbortClick: function() {
        if (!this.copilotApi || !this.isSubmitting) return;

        var streamState = this.copilotApi.getCurrentStreamState ? this.copilotApi.getCurrentStreamState() : null;
        var activeToolId = streamState ? streamState.tool_id : null;
        if (activeToolId && !this._isAbortableQueryTool(activeToolId)) {
          topic.publish('CopilotApiError', {
            error: new Error('Abort currently supports active data query tools only.')
          });
          return;
        }

        this.abortButton.set('disabled', true);
        this.abortButton.set('label', 'Aborting...');

        this.copilotApi.abortActiveQueryJob({
          user_id: this.copilotApi.user_id,
          scopes: ['query_tools'],
          reason: 'Aborted from copilot input button'
        }).then(lang.hitch(this, function() {
          // Keep disabled while backend finishes processing abort request.
          this.abortButton.set('label', 'Abort');
          // Keep disabled while backend finishes processing abort request.
          this.abortButton.set('disabled', true);
        })).catch(lang.hitch(this, function(error) {
          this.abortButton.set('label', 'Abort');
          this._updateAbortButtonState();
          topic.publish('CopilotApiError', { error: error });
        }));
      },

      _renderWorkspaceSelectionIndicator: function() {
        if (!this.workspaceSelectionIndicator || !this.workspaceSelectionCountNode) {
          return;
        }

        var selectedItems = Array.isArray(this.selectedWorkspaceItems) ? this.selectedWorkspaceItems : [];
        var count = selectedItems.length;
        var label = count === 1 ? '1 selected' : count + ' selected';
        var selectedItemLabels = selectedItems.map(function(item) {
          return item && item.path ? item.path : (item && item.name ? item.name : 'Unknown item');
        });

        this.workspaceSelectionCountNode.textContent = label;
        this.workspaceSelectionIndicator.title = count > 0
          ? ('Selected workspace files (' + count + ')' +
            (selectedItemLabels.length > 0 ? '\n' + selectedItemLabels.join('\n') : ''))
          : 'No workspace files selected';
        this.workspaceSelectionIndicator.classList.toggle('hasSelection', count > 0);
        this.workspaceSelectionIndicator.style.display = count > 0 ? 'inline-flex' : 'none';
      },

      _renderJobsSelectionIndicator: function() {
        if (!this.jobsSelectionIndicator || !this.jobsSelectionCountNode) {
          return;
        }
        var selectedItems = Array.isArray(this.selectedJobs) ? this.selectedJobs : [];
        var count = selectedItems.length;
        var label = count === 1 ? '1 job' : count + ' jobs';
        var selectedJobLabels = selectedItems.map(function(item) {
          var id = item && item.id ? item.id : 'Unknown job';
          var app = item && (item.application_name || item.app) ? (' (' + (item.application_name || item.app) + ')') : '';
          return id + app;
        });
        this.jobsSelectionCountNode.textContent = label;
        this.jobsSelectionIndicator.title = count > 0
          ? ('Selected jobs (' + count + ')' +
            (selectedJobLabels.length > 0 ? '\n' + selectedJobLabels.join('\n') : ''))
          : 'No jobs selected';
        this.jobsSelectionIndicator.classList.toggle('hasSelection', count > 0);
        this.jobsSelectionIndicator.style.display = count > 0 ? 'inline-flex' : 'none';
      },

      /**
       * Handles submission of RAG queries with document retrieval
       * Implementation:
       * - Immediately shows user message and clears text area
       * - Disables input during submission
       * - Shows loading indicator
       * - Retrieves documents via RAG API
       * - Builds system prompt with document context
       * - Makes follow-up LLM query with enhanced context
       * - Updates chat store with assistant/system messages only
       */
      _handleRagSubmit: function() {
        console.log('this.ragDb=', this.ragDb);
        var inputText = this.textArea.get('value');
        var _self = this;
        var uploadedImagePayload = this._getUploadedImagePayload();
        var hasUploadedImage = !!(uploadedImagePayload && Array.isArray(uploadedImagePayload.images) && uploadedImagePayload.images.length > 0 && this._modelSupportsImage(this.model));
        var submitModel = hasUploadedImage ? this._resolveImageModel() : this.model;

        if (this.state) {
          console.log('state', this.state);
        }

        // Immediately show user message and clear text area
        var userMessage = this._buildUserMessageForSubmit(
          inputText,
          hasUploadedImage ? uploadedImagePayload.attachments : null
        );

        this.chatStore.addMessage(userMessage);
        this.displayWidget.showMessages(this.chatStore.query());
        this.textArea.set('value', '');

        this.isSubmitting = true;
        this.submitButton.set('disabled', true);

        this.displayWidget.showLoadingIndicator(this.chatStore.query());

        var systemPrompt = 'You are a helpful scientist website assistant for the website BV-BRC, the Bacterial and Viral Bioinformatics Resource Center.\n\n';
        if (this.systemPrompt) {
            systemPrompt += this.systemPrompt;
        }
        if (this.statePrompt) {
            systemPrompt += this.statePrompt;
        }
        if (hasUploadedImage) {
            systemPrompt += '\n\nThe user attached an image. Use it as additional context.';
        }

        this._submitCopilotQueryWithRegistration(inputText, this.sessionId, systemPrompt, submitModel, true, this.ragDb, this.numDocs, null, this.enhancedPrompt, lang.mixin({
          images: hasUploadedImage ? uploadedImagePayload.images : null
        }, {
          selected_workspace_items: this._getSelectedWorkspaceItemsForRequest(),
          selected_jobs: this._getSelectedJobsForRequest(),
          selected_workflows: this._getSelectedWorkflowsForRequest()
        })).then(lang.hitch(this, function(response) {
          // Only add assistant message and system message (if present) - user message was already added
          var messagesToAdd = [];
          if (response.systemMessage) {
            messagesToAdd.push(response.systemMessage);
          }
          if (response.assistantMessage) {
            messagesToAdd.push(response.assistantMessage);
          }

          if (messagesToAdd.length > 0) {
            this.chatStore.addMessages(messagesToAdd);
          }

          this.displayWidget.showMessages(this.chatStore.query());

          if (_self.new_chat) {
            _self._finishNewChat();
          }
        })).catch(function(error) {
          topic.publish('CopilotApiError', { error: error });
        }).finally(lang.hitch(this, function() {
          this.displayWidget.hideLoadingIndicator();
          this.isSubmitting = false;
          this.submitButton.set('disabled', false);
        }));
      },

      /**
       * Handles submission of regular (non-RAG) queries
       * Implementation:
       * - Immediately shows user message and clears text area
       * - Disables input during submission
       * - Shows loading indicator
       * - Makes LLM query with basic system prompt
       * - Updates chat store with assistant/system messages only
       * - Handles new chat initialization
       */
      _handleRegularSubmit: function() {
        var inputText = this.textArea.get('value');
        var _self = this;
        var uploadedImagePayload = this._getUploadedImagePayload();
        var hasUploadedImage = !!(uploadedImagePayload && Array.isArray(uploadedImagePayload.images) && uploadedImagePayload.images.length > 0 && this._modelSupportsImage(this.model));
        var submitModel = hasUploadedImage ? this._resolveImageModel() : this.model;
        if (this.state) {
          console.log('state', this.state);
        }

        // Immediately show user message and clear text area
        var userMessage = this._buildUserMessageForSubmit(
          inputText,
          hasUploadedImage ? uploadedImagePayload.attachments : null
        );

        this.chatStore.addMessage(userMessage);
        this.displayWidget.showMessages(this.chatStore.query());
        this.textArea.set('value', '');

        this.isSubmitting = true;
        this.submitButton.set('disabled', true);

        this.displayWidget.showLoadingIndicator(this.chatStore.query());

        var systemPrompt = 'You are a helpful scientist website assistant for the website BV-BRC, the Bacterial and Viral Bioinformatics Resource Center.\n\n';
        if (this.systemPrompt) {
            systemPrompt += this.systemPrompt;
        }
        if (this.statePrompt) {
            systemPrompt += this.statePrompt;
        }
        if (hasUploadedImage) {
            systemPrompt += '\n\nThe user attached an image. Use it as additional context.';
        }

        this._submitCopilotQueryWithRegistration(inputText, this.sessionId, systemPrompt, submitModel, true, null, null, null, null, lang.mixin({
          images: hasUploadedImage ? uploadedImagePayload.images : null
        }, {
          selected_workspace_items: this._getSelectedWorkspaceItemsForRequest(),
          selected_jobs: this._getSelectedJobsForRequest(),
          selected_workflows: this._getSelectedWorkflowsForRequest()
        })).then(lang.hitch(this, function(response) {
          // Only add assistant message and system message (if present) - user message was already added
          var messagesToAdd = [];
          if (response.systemMessage) {
            messagesToAdd.push(response.systemMessage);
          }
          if (response.assistantMessage) {
            messagesToAdd.push(response.assistantMessage);
          }

          if (messagesToAdd.length > 0) {
            this.chatStore.addMessages(messagesToAdd);
          }

          this.displayWidget.showMessages(this.chatStore.query());

          if (_self.new_chat) {
            _self._finishNewChat();
          }
        })).catch(function(error) {
          topic.publish('CopilotApiError', { error: error });
        }).finally(lang.hitch(this, function() {
          this.displayWidget.hideLoadingIndicator();
          this.isSubmitting = false;
          this.submitButton.set('disabled', false);
        }));
      },

      /**
       * Resets widget state for new chat session
       * Clears textarea and sets new chat flag
       */
      startNewChat: function() {
        this.new_chat = true;
        this.session_registered = false;
        this.textArea.set('value', '');

        // Reset screenshot toggle state
        this.pageContentEnabled = false;
        this._updateToggleButtonStyle();
        topic.publish('pageContentToggleChanged', false);

        // Clear attached images
        this._clearAttachedImage();

        // Clear selected workspace items
        this.selectedWorkspaceItems = [];
        this._renderWorkspaceSelectionIndicator();
        this.selectedJobs = [];
        this._renderJobsSelectionIndicator();
        this.selectedWorkflows = [];
      },

      /**
       * Updates the current session identifier
       * @param {string} sessionId - New session ID
       */
      setSessionId: function(sessionId) {
        this.sessionId = sessionId;
        this.session_registered = false;

        // Reset screenshot toggle state
        this.pageContentEnabled = false;
        this._updateToggleButtonStyle();
        topic.publish('pageContentToggleChanged', false);

        // Clear attached images
        this._clearAttachedImage();

        // Clear selected workspace items
        this.selectedWorkspaceItems = [];
        this._renderWorkspaceSelectionIndicator();
        this.selectedJobs = [];
        this._renderJobsSelectionIndicator();
        this.selectedWorkflows = [];
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

        if (this.screenshotToggleNode) {
          this.screenshotToggleNode.style.display = enabled ? 'block' : 'none';
        }
        if (this.uploadImageNode) {
          this.uploadImageNode.style.display = enabled ? 'block' : 'none';
        }

        if (!enabled) {
          this.pageContentEnabled = false;
          this._clearAttachedImage();
          topic.publish('pageContentToggleChanged', false);
        } else {
          this._renderAttachedImageIndicator();
        }
      },

      _handleImageUploadChange: function(evt) {
        var files = evt && evt.target && evt.target.files ? Array.prototype.slice.call(evt.target.files) : [];
        if (!files || files.length === 0) {
          return;
        }
        var maxImages = 3;
        var maxBytes = 6 * 1024 * 1024;
        var remainingSlots = Math.max(0, maxImages - this.attachedImages.length);
        if (remainingSlots <= 0) {
          topic.publish('CopilotApiError', { error: new Error('You can attach up to 3 images per message.') });
          this.imageUploadInput.value = '';
          return;
        }

        var acceptedFiles = files.slice(0, remainingSlots);
        if (files.length > remainingSlots) {
          topic.publish('CopilotApiError', { error: new Error('Only the first ' + remainingSlots + ' image(s) were attached. Maximum is 3 images.') });
        }

        var readPromises = acceptedFiles.map(lang.hitch(this, function(file) {
          return new Promise(lang.hitch(this, function(resolve, reject) {
            if (!/^image\/(png|jpeg|jpg)$/i.test(file.type || '')) {
              reject(new Error('Unsupported image format for "' + (file.name || 'image') + '". Only PNG and JPEG/JPG images are supported.'));
              return;
            }
            if (file.size > maxBytes) {
              reject(new Error('Image "' + (file.name || 'image') + '" is larger than 6 MB.'));
              return;
            }

            var reader = new FileReader();
            reader.onload = function(loadEvt) {
              var nextId = 'img-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
              resolve({
                id: nextId,
                image: loadEvt && loadEvt.target ? loadEvt.target.result : null,
                attachment: {
                  type: 'image',
                  source: 'upload',
                  name: file.name || 'Uploaded image'
                }
              });
            };
            reader.onerror = function() {
              reject(new Error('Unable to read selected image file "' + (file.name || 'image') + '".'));
            };
            reader.readAsDataURL(file);
          }));
        }));

        Promise.all(readPromises).then(lang.hitch(this, function(results) {
          results.forEach(lang.hitch(this, function(entry) {
            if (entry && entry.image && this.attachedImages.length < maxImages) {
              this.attachedImages.push(entry);
            }
          }));
          this._renderAttachedImageIndicator();
          this._emitImageAttachmentsChanged();
        })).catch(function(error) {
          topic.publish('CopilotApiError', { error: error });
        }).finally(lang.hitch(this, function() {
          this.imageUploadInput.value = '';
        }));
      },

      _clearAttachedImage: function() {
        this.attachedImages = [];
        if (this.imageUploadInput) {
          this.imageUploadInput.value = '';
        }
        this._renderAttachedImageIndicator();
        this._emitImageAttachmentsChanged();
      },

      setAttachedImages: function(entries) {
        this.attachedImages = Array.isArray(entries) ? entries.slice() : [];
        this._renderAttachedImageIndicator();
        this._emitImageAttachmentsChanged();
      },

      _renderAttachedImageIndicator: function() {
        if (!this.imageAttachmentCounter || !this.imageAttachmentCountNode) {
          return;
        }
        if (!Array.isArray(this.attachedImages) || this.attachedImages.length === 0) {
          this.imageAttachmentCounter.style.display = 'none';
          this.imageAttachmentCountNode.textContent = '';
          return;
        }
        var count = this.attachedImages.length;
        var label = count === 1 ? '1 image' : count + ' images';
        var imageNames = this.attachedImages.map(function(entry) {
          return entry && entry.attachment && entry.attachment.name ? entry.attachment.name : 'Image';
        });
        this.imageAttachmentCountNode.textContent = label;
        this.imageAttachmentCounter.title = count > 0
          ? ('Attached images (' + count + ')' +
            (imageNames.length > 0 ? '\n' + imageNames.join('\n') : ''))
          : 'No images attached';
        this.imageAttachmentCounter.classList.toggle('hasImages', count > 0);
        this.imageAttachmentCounter.style.display = count > 0 ? 'inline-flex' : 'none';
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


      /**
       * Updates selected RAG database and UI
       */
      setRagDb: function(ragDb) {
        if (ragDb == 'null') {
          this.ragDb = null;
        } else {
          this.ragDb = ragDb;
        }
      },

      /**
       * Updates RAG selection UI text
       */
      setRagButtonLabel: function(ragDb) {
        if (!this.ragText) {
          return;
        }
        if (ragDb && ragDb !== 'null') {
          this.ragText.innerHTML = 'RAG: ' + ragDb;
        } else {
          this.ragText.innerHTML = 'RAG: None';
        }
      },

      /**
       * Updates model selection UI text
       */
      setModelText: function(model) {
        if (!this.modelText) {
          return;
        }
        if (model) {
          model = model.split('/').reverse()[0];
          if (model.length > 30) {
            model = model.substring(0, 30) + '...';
          }
          this.modelText.innerHTML = 'Model: ' + model;
        } else {
          this.modelText.innerHTML = 'Model: None';
        }
      },

      /**
       * Updates the number of documents to use for RAG queries
       */
      setNumDocs: function(numDocs) {
        this.numDocs = numDocs;
      },

      setStatePrompt: function(statePrompt) {
        this.statePrompt = statePrompt;
      },

      /**
       * Finalizes creation of a brand-new chat after the first successful response.
       * Session registration/list updates are handled earlier; this now marks the
       * chat as initialized and triggers title generation.
       * @param {boolean} generateTitleImmediately – if false, skip title generation (default true)
       */
      _finishNewChat: function(generateTitleImmediately = true) {
        this.new_chat = false;
        this.session_registered = true;

        if (generateTitleImmediately) {
          setTimeout(function() {
            topic.publish('generateSessionTitle');
          }, 100);
        }
      },

      /**
       * @method _handlePageSubmit
       * @description Handles submission about the current page (screenshot first, HTML fallback)
       * Implementation:
       * - Immediately shows user message and clears text area
       * - Takes screenshot and makes API call
       * - Updates chat store with assistant/system messages only
       **/
      _handlePageSubmit: function() {
        var inputText = this.textArea.get('value');
        var _self = this;

        if (this.state) {
            console.log('state', this.state);
        }

        // Immediately show user message and clear text area
        var userMessage = this._buildUserMessageForSubmit(inputText, {
          type: 'image',
          source: 'screenshot',
          name: 'Page screenshot'
        });

        this.chatStore.addMessage(userMessage);
        this.displayWidget.showMessages(this.chatStore.query());
        this.textArea.set('value', '');

        this.isSubmitting = true;
        this.submitButton.set('disabled', true);

        topic.publish('hideChatPanel'); // Hide panel before taking screenshot

        html2canvas(document.body).then(lang.hitch(this, function(canvas) {
          var base64Image = canvas.toDataURL('image/png');

          topic.publish('showChatPanel'); // Show panel again

          this.displayWidget.showLoadingIndicator(this.chatStore.query());
          var imageSystemPrompt = 'You are a helpful scientist website assistant for the website BV-BRC, the Bacterial and Viral Bioinformatics Resource Center. You can also answer questions about the attached screenshot.\n' +
          'Analyze the screenshot and respond to the user\'s query.';

          if (this.systemPrompt) {
              imageSystemPrompt += '\n\n' + this.systemPrompt;
          }
          if (this.statePrompt) {
              imageSystemPrompt = imageSystemPrompt + '\n\n' + this.statePrompt;
          }

          var imgtxt_model = this._resolveImageModel();

          this._submitCopilotQueryWithRegistration(inputText, this.sessionId, imageSystemPrompt, imgtxt_model, true, this.ragDb, this.numDocs, null, this.enhancedPrompt, {
              images: [base64Image],
              selected_workspace_items: this._getSelectedWorkspaceItemsForRequest(),
              selected_jobs: this._getSelectedJobsForRequest(),
              selected_workflows: this._getSelectedWorkflowsForRequest()
          })
              .then(lang.hitch(this, function(response) {
                  // Only add assistant message and system message (if present) - user message was already added
                  var messagesToAdd = [];
                  if (response.systemMessage) {
                      messagesToAdd.push(response.systemMessage);
                  }
                  if (response.assistantMessage) {
                      messagesToAdd.push(response.assistantMessage);
                  }

                  if (messagesToAdd.length > 0) {
                      this.chatStore.addMessages(messagesToAdd);
                  }

                  this.displayWidget.showMessages(this.chatStore.query());

                  if (_self.new_chat) {
                      _self._finishNewChat();
                  }
              })).catch(function(error) {
                  topic.publish('CopilotApiError', { error: error });
              }).finally(lang.hitch(this, function() {
                  this.displayWidget.hideLoadingIndicator();
                  this.isSubmitting = false;
                  this.submitButton.set('disabled', false);

                  // Deselect the pageContentToggle after submission
                  this.pageContentEnabled = false;
                  this._updateToggleButtonStyle();
                  topic.publish('pageContentToggleChanged', false);
              }));
      })).catch(lang.hitch(this, function(error) {
          console.error('Error capturing or processing screenshot:', error);
          topic.publish('showChatPanel'); // Ensure panel is shown even on error

          // Fall back to HTML content if screenshot fails
          console.log('Falling back to HTML content');
          this._handlePageContentSubmit();
      }));
    },

    /**
     * @method _handlePageContentSubmit
     * @description Handles submission of page content (HTML)
     * Used as a fallback when screenshot fails
     * Implementation:
     * - Immediately shows user message and clears text area
     * - Makes API call with page content
     * - Updates chat store with assistant/system messages only
     **/
    _handlePageContentSubmit: function() {
      var inputText = this.textArea.get('value');
      var _self = this;

      // Immediately show user message and clear text area
      var userMessage = {
        role: 'user',
        content: inputText,
        message_id: 'user_' + Date.now(),
        timestamp: new Date().toISOString()
      };

      this.chatStore.addMessage(userMessage);
      this.displayWidget.showMessages(this.chatStore.query());
      this.textArea.set('value', '');

      const pageHtml = document.documentElement.innerHTML;

      var systemPrompt = 'You are a helpful assistant that can answer questions about the page content.\\n' +
          'Answer questions as if you were a user viewing the page.\\n' +
          'The page content is:\\n' +
          pageHtml;
      if (this.systemPrompt) {
          systemPrompt += '\\n' + this.systemPrompt;
      }
      if (this.statePrompt) {
        systemPrompt = this.statePrompt + '\\n\\n' + systemPrompt;
      }

      this.displayWidget.showLoadingIndicator(this.chatStore.query());

      let assistantMessage = {
          role: 'assistant',
          content: '',
          message_id: 'assistant_' + Date.now(),
          timestamp: new Date().toISOString()
      };
      this.chatStore.addMessage(assistantMessage);
      this.displayWidget.hideLoadingIndicator();

      const params = {
          inputText: inputText,
          sessionId: this.sessionId,
          systemPrompt: systemPrompt,
          model: this.model,
          save_chat: true,
          ragDb: this.ragDb,
          numDocs: this.numDocs,
          enhancedPrompt: this.enhancedPrompt
      };
      this._appendWorkspaceSelectionToStreamParams(params);

      this.isSubmitting = true;
      this.isQueryProgressActive = false;
      this._updateAbortButtonState();
      this._submitCopilotQueryStreamWithRegistration(params,
          (chunk, toolMetadata) => {
              // onData
              console.log('chunk', chunk);

              // Add tool metadata if available (for workflow handling)
              if (toolMetadata) {
                  this._applyToolMetadataToAssistantMessage(assistantMessage, toolMetadata);
              }

              assistantMessage.content += chunk;
              this.displayWidget.showMessages(this.chatStore.query());
          },
          () => {
              // onEnd
              if (_self.new_chat) {
                  _self._finishNewChat();
              }
              this.isSubmitting = false;
              this.isQueryProgressActive = false;
              this.submitButton.set('disabled', false);
              this._updateAbortButtonState();
              // Deselect the pageContentToggle after submission
              this.pageContentEnabled = false;
              this._updateToggleButtonStyle();
              topic.publish('pageContentToggleChanged', false);
          },
          (error) => {
              // onError
              topic.publish('CopilotApiError', {
                  error: error
              });
              this.displayWidget.hideLoadingIndicator();
              this.isSubmitting = false;
              this.isQueryProgressActive = false;
              this.submitButton.set('disabled', false);
              this._updateAbortButtonState();
          },
          (progressInfo) => {
              // onProgress - handle queue status updates
              console.log('progressInfo', progressInfo);
              switch(progressInfo.type) {
                  case 'queued':
                      // Silent - no logging for queued event
                      break;
                  case 'started':
                      // Silent - no logging for started event
                      break;
                  case 'progress':
                      console.log(`Processing: ${progressInfo.percentage}% (Iteration ${progressInfo.iteration}/${progressInfo.max_iterations})`);
                      if (progressInfo.tool) {
                          console.log(`Using tool: ${progressInfo.tool}`);
                      }
                      break;
              }
          },
          (statusMessage) => {
              // onStatusMessage - handle status message updates
              this._handleAbortStatusMessageEvent(statusMessage);
              if (statusMessage.should_remove) {
                  this.chatStore.removeMessage(statusMessage.message_id);
              } else {
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

    _handleRagSubmitStream: function() {
      console.log('this.ragDb=', this.ragDb);
      var inputText = this.textArea.get('value');
      var _self = this;
      var uploadedImagePayload = this._getUploadedImagePayload();
      var hasUploadedImage = !!(uploadedImagePayload && Array.isArray(uploadedImagePayload.images) && uploadedImagePayload.images.length > 0 && this._modelSupportsImage(this.model));
      var submitModel = hasUploadedImage ? this._resolveImageModel() : this.model;

      if (this.state) {
        console.log('state', this.state);
      }

      // Immediately show user message and clear text area
      var userMessage = this._buildUserMessageForSubmit(
        inputText,
        hasUploadedImage ? uploadedImagePayload.attachments : null
      );

      this.chatStore.addMessage(userMessage);
      this.displayWidget.showMessages(this.chatStore.query());
      this.textArea.set('value', '');
      if (hasUploadedImage) {
        this._clearAttachedImage();
      }

      this.isSubmitting = true;
      this.isQueryProgressActive = false;
      this.submitButton.set('disabled', true);
      this._updateAbortButtonState();

      this.displayWidget.showLoadingIndicator(this.chatStore.query());

      var systemPrompt = 'You are a helpful scientist website assistant for the website BV-BRC, the Bacterial and Viral Bioinformatics Resource Center.\\n\\n';
      if (this.systemPrompt) {
          systemPrompt += this.systemPrompt;
      }
      if (this.statePrompt) {
          systemPrompt += this.statePrompt;
      }
      if (hasUploadedImage) {
          systemPrompt += '\\n\\nThe user attached an image. Use it as additional context.';
      }

      // Track assistant message and status message ID
      let assistantMessage = null;
      let statusMessageId = null;
      let assistantMessageCreated = false;

      this.displayWidget.hideLoadingIndicator();

      const params = {
        inputText: inputText,
        sessionId: this.sessionId,
        systemPrompt: systemPrompt,
        model: submitModel,
        save_chat: true,
        ragDb: this.ragDb,
        numDocs: this.numDocs,
        enhancedPrompt: this.enhancedPrompt
      };
      if (hasUploadedImage) {
        params.images = uploadedImagePayload.images;
      }
      this._appendWorkspaceSelectionToStreamParams(params);

      this._submitCopilotQueryStreamWithRegistration(params,
          (chunk, toolMetadata) => {
              // onData - create assistant message on first chunk if not exists
              if (!assistantMessageCreated) {
                  // Remove status message if it exists
                  if (statusMessageId) {
                      this.chatStore.removeMessage(statusMessageId);
                      statusMessageId = null;
                  }
                  // Create assistant message
                  assistantMessage = {
                      role: 'assistant',
                      content: '',
                      message_id: 'assistant_' + Date.now(),
                      timestamp: new Date().toISOString()
                  };

                  // Add tool metadata if available (for workflow handling)
                  if (toolMetadata) {
                      this._applyToolMetadataToAssistantMessage(assistantMessage, toolMetadata);
                  }

                  this.chatStore.addMessage(assistantMessage);
                  assistantMessageCreated = true;
              }
              if (toolMetadata) {
                  this._applyToolMetadataToAssistantMessage(assistantMessage, toolMetadata);
              }
              // Append content to assistant message
              assistantMessage.content += chunk;
              this.displayWidget.showMessages(this.chatStore.query());
          },
          () => {
              // onEnd
              if (_self.new_chat) {
                  _self._finishNewChat();
              }
              this.isSubmitting = false;
              this.isQueryProgressActive = false;
              this.submitButton.set('disabled', false);
              this._updateAbortButtonState();
          },
          (error) => {
              // onError
              topic.publish('CopilotApiError', {
                  error: error
              });
              this.displayWidget.hideLoadingIndicator();
              this.isSubmitting = false;
              this.isQueryProgressActive = false;
              this.submitButton.set('disabled', false);
              this._updateAbortButtonState();
          },
          (progressInfo) => {
              // onProgress - handle queue status updates
              switch(progressInfo.type) {
                  case 'queued':
                      // Silent - no logging for queued event
                      break;
                  case 'started':
                      // Silent - no logging for started event
                      break;
                  case 'progress':
                      console.log(`Processing: ${progressInfo.percentage}% (Iteration ${progressInfo.iteration}/${progressInfo.max_iterations})`);
                      if (progressInfo.tool) {
                          console.log(`Using tool: ${progressInfo.tool}`);
                      }
                      break;
              }
          },
          (statusMessage) => {
              // onStatusMessage - handle status message updates
              this._handleAbortStatusMessageEvent(statusMessage);
              // Only log non-temporary status messages for debugging
              if (statusMessage && !statusMessage.is_temporary) {
                  console.log('[HANDLER] Status message received:', statusMessage);
              }

              if (statusMessage.should_remove) {
                  // Remove the status message from chat store
                  this.chatStore.removeMessage(statusMessage.message_id);
                  if (statusMessageId === statusMessage.message_id) {
                      statusMessageId = null;
                  }
              } else {
                  // Track status message ID
                  statusMessageId = statusMessage.message_id;
                  // Add or update the status message
                  var existingMessage = this.chatStore.getMessageById(statusMessage.message_id);
                  if (existingMessage) {
                      // Update existing message
                      this.chatStore.updateMessage(statusMessage);
                  } else {
                      // Add new message
                      this.chatStore.addMessage(statusMessage);
                  }
              }

              // Refresh display
              this.displayWidget.showMessages(this.chatStore.query());
          }
      );
    },

    _handleRegularSubmitStream: function() {
      console.log('[HANDLER] _handleRegularSubmitStream START');
      var inputText = this.textArea.get('value');
      var _self = this;
      var uploadedImagePayload = this._getUploadedImagePayload();
      var hasUploadedImage = !!(uploadedImagePayload && Array.isArray(uploadedImagePayload.images) && uploadedImagePayload.images.length > 0 && this._modelSupportsImage(this.model));
      var submitModel = hasUploadedImage ? this._resolveImageModel() : this.model;
      if (this.state) {
        console.log('state', this.state);
      }

      // Immediately show user message and clear text area
      var userMessage = this._buildUserMessageForSubmit(
          inputText,
          hasUploadedImage ? uploadedImagePayload.attachments : null
      );

      this.chatStore.addMessage(userMessage);
      this.displayWidget.showMessages(this.chatStore.query());
      this.textArea.set('value', '');
      if (hasUploadedImage) {
        this._clearAttachedImage();
      }

      this.isSubmitting = true;
      this.isQueryProgressActive = false;
      this.submitButton.set('disabled', true);
      this._updateAbortButtonState();
      this._updateAbortButtonState();

      this.displayWidget.showLoadingIndicator(this.chatStore.query());

      var systemPrompt = 'You are a helpful scientist website assistant for the website BV-BRC, the Bacterial and Viral Bioinformatics Resource Center.\\n\\n';
      if (this.systemPrompt) {
          systemPrompt += this.systemPrompt;
      }
      if (this.statePrompt) {
          systemPrompt += this.statePrompt;
      }
      if (hasUploadedImage) {
          systemPrompt += '\\n\\nThe user attached an image. Use it as additional context.';
      }

      // Track assistant message and status message ID
      let assistantMessage = null;
      let statusMessageId = null;
      let assistantMessageCreated = false;

      this.displayWidget.hideLoadingIndicator();

      const params = {
          inputText: inputText,
          sessionId: this.sessionId,
          systemPrompt: systemPrompt,
          model: submitModel,
          save_chat: true
      };
      if (hasUploadedImage) {
        params.images = uploadedImagePayload.images;
      }
      this._appendWorkspaceSelectionToStreamParams(params);
      console.log('[HANDLER] About to call submitCopilotQueryStream with params:', params);
      this._submitCopilotQueryStreamWithRegistration(params,
          (chunk, toolMetadata) => {
              // onData - create assistant message on first chunk if not exists
              console.log('[HANDLER] onData callback received chunk:', chunk);
              console.log('[HANDLER] toolMetadata in onData:', toolMetadata);
              if (!assistantMessageCreated) {
                  // Remove status message if it exists
                  if (statusMessageId) {
                      this.chatStore.removeMessage(statusMessageId);
                      statusMessageId = null;
                  }
                  // Create assistant message
                  assistantMessage = {
                      role: 'assistant',
                      content: '',
                      message_id: 'assistant_' + Date.now(),
                      timestamp: new Date().toISOString()
                  };

                  // Add tool metadata if available (for workflow handling)
                  if (toolMetadata) {
                      console.log('[HANDLER] Adding toolMetadata to assistant message');
                      console.log('[HANDLER] toolMetadata:', toolMetadata);
                      console.log('[HANDLER] toolMetadata.workflowData:', toolMetadata.workflowData);
                      console.log('[HANDLER] toolMetadata.workflowData type:', typeof toolMetadata.workflowData);
                      if (toolMetadata.workflowData) {
                          console.log('[HANDLER] toolMetadata.workflowData keys:', Object.keys(toolMetadata.workflowData));
                          console.log('[HANDLER] toolMetadata.workflowData.workflow_name:', toolMetadata.workflowData.workflow_name);
                      }
                      this._applyToolMetadataToAssistantMessage(assistantMessage, toolMetadata);
                      console.log('[HANDLER] ✓ Assistant message updated with toolMetadata');
                      console.log('[HANDLER] assistantMessage.workflowData:', assistantMessage.workflowData);
                  } else {
                      console.log('[HANDLER] No toolMetadata provided');
                  }

                  this.chatStore.addMessage(assistantMessage);
                  assistantMessageCreated = true;
              }
              if (toolMetadata) {
                  this._applyToolMetadataToAssistantMessage(assistantMessage, toolMetadata);
              }
              // Append content to assistant message
              assistantMessage.content += chunk;
              console.log('[HANDLER] Assistant message content now:', assistantMessage.content);
              this.displayWidget.showMessages(this.chatStore.query());
          },
          () => {
              // onEnd
              console.log('[HANDLER] onEnd callback called');
              if (_self.new_chat) {
                  _self._finishNewChat();
              }
              this.isSubmitting = false;
              this.isQueryProgressActive = false;
              this.submitButton.set('disabled', false);
              this._updateAbortButtonState();
          },
          (error) => {
              // onError
              topic.publish('CopilotApiError', {
                  error: error
              });
              this.displayWidget.hideLoadingIndicator();
              this.isSubmitting = false;
              this.isQueryProgressActive = false;
              this.submitButton.set('disabled', false);
              this._updateAbortButtonState();
          },
          (progressInfo) => {
              // onProgress - handle queue status updates
              switch(progressInfo.type) {
                  case 'queued':
                      // Silent - no logging for queued event
                      break;
                  case 'started':
                      // Silent - no logging for started event
                      break;
                  case 'progress':
                      console.log(`Processing: ${progressInfo.percentage}% (Iteration ${progressInfo.iteration}/${progressInfo.max_iterations})`);
                      if (progressInfo.tool) {
                          console.log(`Using tool: ${progressInfo.tool}`);
                      }
                      break;
              }
          },
          (statusMessage) => {
              // onStatusMessage - handle status message updates
              this._handleAbortStatusMessageEvent(statusMessage);
              // Only log non-temporary status messages for debugging
              if (statusMessage && !statusMessage.is_temporary) {
                  console.log('[HANDLER] Status message received:', statusMessage);
              }

              if (statusMessage.should_remove) {
                  // Remove the status message from chat store
                  this.chatStore.removeMessage(statusMessage.message_id);
                  if (statusMessageId === statusMessage.message_id) {
                      statusMessageId = null;
                  }
              } else {
                  // Track status message ID
                  statusMessageId = statusMessage.message_id;
                  // Add or update the status message
                  var existingMessage = this.chatStore.getMessageById(statusMessage.message_id);
                  if (existingMessage) {
                      // Update existing message
                      this.chatStore.updateMessage(statusMessage);
                  } else {
                      // Add new message
                      this.chatStore.addMessage(statusMessage);
                  }
              }

              // Refresh display
              this.displayWidget.showMessages(this.chatStore.query());
          }
      );
    },

    _handlePageSubmitStream: function() {
      var inputText = this.textArea.get('value');
      var _self = this;

      if (this.state) {
          console.log('state', this.state);
      }

      // Immediately show user message and clear text area
      var userMessage = this._buildUserMessageForSubmit(inputText, {
        type: 'image',
        source: 'screenshot',
        name: 'Page screenshot'
      });

      this.chatStore.addMessage(userMessage);
      this.displayWidget.showMessages(this.chatStore.query());
      this.textArea.set('value', '');

      this.isSubmitting = true;
      this.submitButton.set('disabled', true);

      topic.publish('hideChatPanel'); // Hide panel before taking screenshot

      html2canvas(document.body).then(lang.hitch(this, function(canvas) {
        var base64Image = canvas.toDataURL('image/png');

        topic.publish('showChatPanel'); // Show panel again

        this.displayWidget.showLoadingIndicator(this.chatStore.query());
        var imageSystemPrompt = 'You are a helpful scientist website assistant for the website BV-BRC, the Bacterial and Viral Bioinformatics Resource Center. You can also answer questions about the attached screenshot.\\n' +
        'Analyze the screenshot and respond to the user\'s query.';

        if (this.systemPrompt) {
            imageSystemPrompt += '\\n\\n' + this.systemPrompt;
        }
        if (this.statePrompt) {
            imageSystemPrompt = imageSystemPrompt + '\\n\\n' + this.statePrompt;
        }

        var imgtxt_model = this._resolveImageModel();

        // Track assistant message and status message ID
        let assistantMessage = null;
        let statusMessageId = null;
        let assistantMessageCreated = false;

        this.displayWidget.hideLoadingIndicator();

        const params = {
            inputText: inputText,
            sessionId: this.sessionId,
            systemPrompt: imageSystemPrompt,
            model: imgtxt_model,
            save_chat: true,
            ragDb: this.ragDb,
            numDocs: this.numDocs,
            images: [base64Image],
            enhancedPrompt: this.enhancedPrompt
        };
        this._appendWorkspaceSelectionToStreamParams(params);

        this._submitCopilotQueryStreamWithRegistration(params,
            (chunk, toolMetadata) => {
                // onData - create assistant message on first chunk if not exists
                if (!assistantMessageCreated) {
                    // Remove status message if it exists
                    if (statusMessageId) {
                        this.chatStore.removeMessage(statusMessageId);
                        statusMessageId = null;
                    }
                    // Create assistant message
                    assistantMessage = {
                        role: 'assistant',
                        content: '',
                        message_id: 'assistant_' + Date.now(),
                        timestamp: new Date().toISOString()
                    };

                    // Add tool metadata if available (for workflow handling)
                    if (toolMetadata) {
                        this._applyToolMetadataToAssistantMessage(assistantMessage, toolMetadata);
                    }

                    this.chatStore.addMessage(assistantMessage);
                    assistantMessageCreated = true;
                }
                if (toolMetadata) {
                    this._applyToolMetadataToAssistantMessage(assistantMessage, toolMetadata);
                }
                // Append content to assistant message
                assistantMessage.content += chunk;
                this.displayWidget.showMessages(this.chatStore.query());
            },
            () => {
                // onEnd
                if (_self.new_chat) {
                    _self._finishNewChat();
                }
                this.isSubmitting = false;
                this.submitButton.set('disabled', false);
                // Deselect the pageContentToggle after submission
                this.pageContentEnabled = false;
                this._updateToggleButtonStyle();
                topic.publish('pageContentToggleChanged', false);
            },
            (error) => {
                // onError
                topic.publish('CopilotApiError', {
                    error: error
                });
                this.displayWidget.hideLoadingIndicator();
                this.isSubmitting = false;
                this.submitButton.set('disabled', false);
            },
            (progressInfo) => {
                // onProgress - handle queue status updates
                switch(progressInfo.type) {
                    case 'queued':
                        // Silent - no logging for queued event
                        break;
                    case 'started':
                        // Silent - no logging for started event
                        break;
                    case 'progress':
                        console.log(`Processing: ${progressInfo.percentage}% (Iteration ${progressInfo.iteration}/${progressInfo.max_iterations})`);
                        if (progressInfo.tool) {
                            console.log(`Using tool: ${progressInfo.tool}`);
                        }
                        break;
                }
            },
            (statusMessage) => {
                // onStatusMessage - handle status message updates
                if (statusMessage.should_remove) {
                    this.chatStore.removeMessage(statusMessage.message_id);
                    if (statusMessageId === statusMessage.message_id) {
                        statusMessageId = null;
                    }
                } else {
                    // Track status message ID
                    statusMessageId = statusMessage.message_id;
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
      })).catch(lang.hitch(this, function(error) {
        console.error('Error capturing or processing screenshot:', error);
        topic.publish('showChatPanel'); // Ensure panel is shown even on error

        // Fall back to HTML content if screenshot fails
        console.log('Falling back to HTML content');
        this._handlePageContentSubmitStream();
      }));
    },

    _handlePageContentSubmitStream: function() {
      var inputText = this.textArea.get('value');
      var _self = this;

      // Immediately show user message and clear text area
      var userMessage = {
        role: 'user',
        content: inputText,
        message_id: 'user_' + Date.now(),
        timestamp: new Date().toISOString()
      };

      this.chatStore.addMessage(userMessage);
      this.displayWidget.showMessages(this.chatStore.query());
      this.textArea.set('value', '');

      const pageHtml = document.documentElement.innerHTML;

      var systemPrompt = 'You are a helpful assistant that can answer questions about the page content.\\n' +
          'Answer questions as if you were a user viewing the page.\\n' +
          'The page content is:\\n' +
          pageHtml;
      if (this.systemPrompt) {
          systemPrompt += '\\n' + this.systemPrompt;
      }
      if (this.statePrompt) {
        systemPrompt = this.statePrompt + '\\n\\n' + systemPrompt;
      }

      this.displayWidget.showLoadingIndicator(this.chatStore.query());

      // Track assistant message and status message ID
      let assistantMessage = null;
      let statusMessageId = null;
      let assistantMessageCreated = false;

      this.displayWidget.hideLoadingIndicator();

      const params = {
          inputText: inputText,
          sessionId: this.sessionId,
          systemPrompt: systemPrompt,
          model: this.model,
          save_chat: true,
          ragDb: this.ragDb,
          numDocs: this.numDocs,
          enhancedPrompt: this.enhancedPrompt
      };
      this._appendWorkspaceSelectionToStreamParams(params);

      this._submitCopilotQueryStreamWithRegistration(params,
          (chunk, toolMetadata) => {
              // onData - create assistant message on first chunk if not exists
              if (!assistantMessageCreated) {
                  // Remove status message if it exists
                  if (statusMessageId) {
                      this.chatStore.removeMessage(statusMessageId);
                      statusMessageId = null;
                  }
                  // Create assistant message
                  assistantMessage = {
                      role: 'assistant',
                      content: '',
                      message_id: 'assistant_' + Date.now(),
                      timestamp: new Date().toISOString()
                  };

                  // Add tool metadata if available (for workflow handling)
                  if (toolMetadata) {
                      this._applyToolMetadataToAssistantMessage(assistantMessage, toolMetadata);
                  }
                  this.chatStore.addMessage(assistantMessage);
                  assistantMessageCreated = true;
              }
              if (toolMetadata) {
                  this._applyToolMetadataToAssistantMessage(assistantMessage, toolMetadata);
              }
              // Append content to assistant message
              assistantMessage.content += chunk;
              this.displayWidget.showMessages(this.chatStore.query());
          },
          () => {
              // onEnd
              if (_self.new_chat) {
                  _self._finishNewChat();
              }
              this.isSubmitting = false;
              this.submitButton.set('disabled', false);
              // Deselect the pageContentToggle after submission
              this.pageContentEnabled = false;
              this._updateToggleButtonStyle();
              topic.publish('pageContentToggleChanged', false);
          },
          (error) => {
              // onError
              topic.publish('CopilotApiError', {
                  error: error
              });
              this.displayWidget.hideLoadingIndicator();
              this.isSubmitting = false;
              this.submitButton.set('disabled', false);
          },
          (progressInfo) => {
              // onProgress - handle queue status updates
              switch(progressInfo.type) {
                  case 'queued':
                      // Silent - no logging for queued event
                      break;
                  case 'started':
                      // Silent - no logging for started event
                      break;
                  case 'progress':
                      console.log(`Processing: ${progressInfo.percentage}% (Iteration ${progressInfo.iteration}/${progressInfo.max_iterations})`);
                      if (progressInfo.tool) {
                          console.log(`Using tool: ${progressInfo.tool}`);
                      }
                      break;
              }
          },
          (statusMessage) => {
              // onStatusMessage - handle status message updates
              if (statusMessage.should_remove) {
                  this.chatStore.removeMessage(statusMessage.message_id);
                  if (statusMessageId === statusMessage.message_id) {
                      statusMessageId = null;
                  }
              } else {
                  // Track status message ID
                  statusMessageId = statusMessage.message_id;
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

    /**
       * @method _updateToggleButtonStyle
       * @description Updates the toggle button's visual state based on pageContentEnabled
       */
    _updateToggleButtonStyle: function() {
      if (!this.pageContentToggle || !this.pageContentToggle.domNode) {
          return;
      }
      var buttonNode = this.pageContentToggle.domNode;
      if (this.pageContentEnabled) {
          buttonNode.classList.remove('pageContentToggleInactive');
          buttonNode.classList.add('pageContentToggleActive');
      } else {
          buttonNode.classList.remove('pageContentToggleActive');
          buttonNode.classList.add('pageContentToggleInactive');
      }
    },

    destroy: function() {
      this.inherited(arguments);
    }
  });
});
