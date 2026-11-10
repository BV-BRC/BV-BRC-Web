/**
 * @module p3/widget/ChatSessionScrollCard
 * @description A widget that displays a single chat session as a clickable card.
 * Renders session details like ID, creation date and title in a styled container.
 * Handles click interactions to load and display the selected chat session.
 *
 * Implementation:
 * - Extends _WidgetBase and _TemplatedMixin for widget functionality
 * - Uses HTML template with attachment points for dynamic content
 * - Handles session data display, styling and click interactions
 * - Manages session deletion through delete button
 * - Provides hover effects and visual feedback
 */
define([
    'dojo/_base/declare', // Base class for creating Dojo classes
    'dijit/_WidgetBase', // Base widget functionality
    'dijit/_TemplatedMixin', // Template support
    'dojo/dom-construct', // DOM manipulation
    'dojo/on', // Event handling
    'dojo/topic', // Pub/sub messaging
    'dojo/_base/lang', // Language utilities
    './CopilotApi', // API for chat operations
    '../../WorkspaceManager', // Workspace manager for folder operations
    'dijit/ConfirmDialog' // Delete confirmation
], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,
    domConstruct,
    on,
    topic,
    lang,
    CopilotAPI,
    WorkspaceManager,
    ConfirmDialog
) {
    /**
     * @class ChatSessionScrollCard
     * Main widget class for displaying individual chat session cards
     * Handles display and interaction for a single chat session
     */
    return declare([_WidgetBase, _TemplatedMixin], {
        /**
         * HTML template for card layout with attachment points
         * Structure:
         * - Container div with chat-session-card class
         * - Title section
         * - Date container with date and delete button
         */
        templateString: '<div class="chat-session-card" data-dojo-attach-point="containerNode">' +
        '<div class="session-title-container" style="display: flex; justify-content: space-between; align-items: center;">' +
            '<div class="session-title" data-dojo-attach-point="titleNode"></div>' +
            '<div class="scrollCardActions">' +
                '<div class="scrollCardCogContainer" data-dojo-attach-point="cogContainerNode">' +
                    '<div class="scrollCardCogButton" data-dojo-attach-point="cogButtonNode" title="Session actions">' +
                        '<i class="fa icon-cog"></i>' +
                    '</div>' +
                    '<div class="scrollCardCogMenu" data-dojo-attach-point="cogMenuNode">' +
                        '<button class="scrollCardCogMenuItem" data-dojo-attach-point="editTitleButtonNode">' +
                            '<i class="fa icon-pencil"></i> Edit Title' +
                        '</button>' +
                        '<div class="scrollCardCogMenuItem scrollCardCogMenuItem--rate" data-dojo-attach-point="rateMenuItemNode">' +
                            '<i class="fa icon-star-o"></i> Rate' +
                            '<span class="scrollCardRateStars" data-dojo-attach-point="rateStarsNode"></span>' +
                        '</div>' +
                        '<button class="scrollCardCogMenuItem" data-dojo-attach-point="jobsButtonNode">' +
                            '<i class="fa icon-list-unordered"></i> View Jobs' +
                        '</button>' +
                        '<button class="scrollCardCogMenuItem" data-dojo-attach-point="folderButtonNode">' +
                            '<i class="fa icon-folder-open-o"></i> Open Folder' +
                        '</button>' +
                        '<button class="scrollCardCogMenuItem" data-dojo-attach-point="reportIssueButtonNode">' +
                            '<i class="fa icon-commenting-o"></i> Report Issue' +
                        '</button>' +
                        '<button class="scrollCardCogMenuItem scrollCardCogMenuItem--danger" data-dojo-attach-point="deleteButtonNode">' +
                            '<i class="fa icon-trash"></i> Delete' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div class="session-date-container" style="display: flex; justify-content: space-between; align-items: center;">' +
            '<div class="session-date" data-dojo-attach-point="dateNode"></div>' +
            '<span class="scrollCardRunningChip" data-dojo-attach-point="runningChipNode">Running</span>' +
        '</div>' + '</div>',

        /** CSS class for root node styling */
        baseClass: 'chat-session-card',

        /** Stores chat session data passed to widget */
        session: null,

        /** Reference to CopilotAPI for backend operations */
        copilotApi: null,

        /** Default background color for this card */
        defaultBackgroundColor: '#f8f8f8',

        /**
         * Initializes card after creation
         * - Applies container and element styles
         * - Sets up session data display
         * - Configures event handlers
         *
         * Implementation:
         * 1. Style container with fixed dimensions and positioning
         * 2. Style delete button with hover effects
         * 3. Display session data (date, title)
         * 4. Set up click handlers for session loading
         * 5. Configure delete button behavior
         * 6. Add hover effects
         */
        postCreate: function() {
            this.inherited(arguments);

            // Apply CSS classes instead of inline styles
            this.containerNode.className += ' scrollCardContainer';

            // Set up cog menu toggle
            this._cogMenuOpen = false;
            this.own(on(this.cogButtonNode, 'click', lang.hitch(this, function (evt) {
                evt.stopPropagation();
                this._toggleCogMenu();
            })));

            // Close the cog menu when clicking anywhere outside
            this._docClickHandle = on(document, 'click', lang.hitch(this, function () {
                if (this._cogMenuOpen) {
                    this._closeCogMenu();
                }
            }));
            this.own(this._docClickHandle);

            // Close this card's cog menu when another card opens theirs
            this.own(topic.subscribe('ScrollCardCogMenu:CloseAll', lang.hitch(this, function (sender) {
                if (sender !== this) {
                    this._closeCogMenu();
                }
            })));

            if (this.session) {
                // Display formatted creation date
                if (this.session.created_at) {
                    this.dateNode.innerHTML = new Date(this.session.created_at).toLocaleString().split(',')[0];
                    this.dateNode.style.cssText = 'font-size: 0.9em;';
                }

                // Display truncated title (max 60 chars)
                if (this.session.title) {
                    // Text, not HTML: titles are generated by the model.
                    this.titleNode.textContent = this.session.title;
                    this.titleNode.className += ' scrollCardTitle';
                }

                // Show busy dot if the session has an in-flight turn
                this._updateBusyState(!!this.session.active_job_id);

                // Click handler to load session messages
                on(this.containerNode, 'click', lang.hitch(this, function(evt) {
                    // Ignore clicks inside the cog menu area
                    if (this.cogContainerNode && this.cogContainerNode.contains(evt.target)) {
                        return;
                    }

                    if (this.copilotApi) {
                        var _self = this;
                        this.copilotApi.getSessionMessages(_self.session.session_id).then(function(res) {
                            var messages = [];
                            if (Array.isArray(res.messages)) {
                                if (res.messages.length > 0 && Array.isArray(res.messages[0] && res.messages[0].messages)) {
                                    messages = res.messages[0].messages; // Legacy nested API shape
                                } else {
                                    messages = res.messages; // Current flat API shape
                                }
                            }
                            topic.publish('ChatSession:Selected', {
                                sessionId: _self.session.session_id,
                                title: _self.session.title || 'New Chat',
                                messages: messages,
                                active_job_id: res.active_job_id || null,
                                execution_mode: res.execution_mode || _self.session.execution_mode || 'plan'
                            });
                            topic.publish('ChatSessionTitleUpdated', {
                                sessionId: _self.session.session_id,
                                title: _self.session.title || 'New Chat'
                            });
                        }).catch(function(error) {
                            console.error('Error fetching session messages:', error);
                        });
                    } else {
                        console.error('CopilotApi not initialized');
                    }
                }));

                // Add click handler for delete (inside cog menu)
                this.own(on(this.deleteButtonNode, 'click', lang.hitch(this, function(evt) {
                    evt.stopPropagation();
                    this._closeCogMenu();
                    this._confirmDelete();
                })));

                // Add click handler for folder button - opens session workspace folder in new tab
                this.own(on(this.folderButtonNode, 'click', lang.hitch(this, function(evt) {
                    evt.stopPropagation();
                    this._closeCogMenu();
                    var userId = (window.App && window.App.user && window.App.user.id) ? window.App.user.id : null;
                    if (!userId) {
                        console.error('Cannot open session folder: user not logged in');
                        return;
                    }
                    var chatsFolder = '/' + userId + '/home/chats';
                    var sessionFolder = chatsFolder + '/' + this.session.session_id;
                    var workspaceUrl = '/workspace' + sessionFolder;

                    // Ensure the chats folder exists before opening
                    WorkspaceManager.getObject(chatsFolder, true).then(
                        function() {
                            // chats folder already exists - open directly
                            window.open(workspaceUrl, '_blank');
                        },
                        function() {
                            // chats folder does not exist - create it, then open
                            WorkspaceManager.createFolder(chatsFolder).then(
                                function() {
                                    window.open(workspaceUrl, '_blank');
                                },
                                function(err) {
                                    console.error('Failed to create chats folder:', err);
                                    // Try opening anyway in case the error is benign
                                    window.open(workspaceUrl, '_blank');
                                }
                            );
                        }
                    );
                })));

                // Click handler for edit title button
                this.own(on(this.editTitleButtonNode, 'click', lang.hitch(this, function(evt) {
                    evt.stopPropagation();
                    this._closeCogMenu();
                    // Renames this card's chat, open or not (the old path only
                    // worked for the open chat).
                    this._startInlineTitleEdit();
                })));

                // Click handler for jobs button - shows session jobs panel
                this.own(on(this.jobsButtonNode, 'click', lang.hitch(this, function(evt) {
                    evt.stopPropagation();
                    this._closeCogMenu();
                    this._showSessionJobsPanel();
                })));

                // Click handler for report issue button
                this.own(on(this.reportIssueButtonNode, 'click', lang.hitch(this, function(evt) {
                    evt.stopPropagation();
                    this._closeCogMenu();
                    // Report this card's chat, not whichever chat is open.
                    topic.publish('openReportIssueDialog', { sessionId: this.session.session_id });
                })));

                // Container hover effects
                on(this.containerNode, 'mouseover', lang.hitch(this, function() {
                    // Only apply hover color if not currently selected/highlighted
                    // Check for the selection highlight color (#e6f7ff)
                    var currentBg = this.containerNode.style.backgroundColor;
                    if (currentBg !== 'rgb(230, 247, 255)' && currentBg !== '#e6f7ff') {
                        this.containerNode.style.backgroundColor = '#e0e0e0';
                    }
                }));
                on(this.containerNode, 'mouseout', lang.hitch(this, function() {
                    // Only reset to default color if not currently selected/highlighted
                    var currentBg = this.containerNode.style.backgroundColor;
                    if (currentBg !== 'rgb(230, 247, 255)' && currentBg !== '#e6f7ff') {
                        this.containerNode.style.backgroundColor = this.defaultBackgroundColor;
                    }
                }));

                this.dateNode.style.cssText = 'font-size: 0.8em; color: #666;';
            }

            this.setupRating();
        },

        /**
         * Toggles the cog dropdown menu open/closed.
         */
        _toggleCogMenu: function () {
            if (this._cogMenuOpen) {
                this._closeCogMenu();
            } else {
                // Close any other open cog menus first
                topic.publish('ScrollCardCogMenu:CloseAll', this);
                this.cogMenuNode.style.display = 'block';
                this._cogMenuOpen = true;
            }
        },

        /**
         * Closes the cog dropdown menu.
         */
        /**
         * Delete asks first.  The gateway archives the chat (hidden from the
         * user for good; workspace files and job results are kept).
         */
        _confirmDelete: function () {
            var sessionId = this.session.session_id;
            var content = domConstruct.create('div', { style: 'max-width: 380px;' });
            domConstruct.create('p', {
                textContent: 'Delete "' + (this.session.title || 'New Chat') + '"? It will be removed from your chats. This cannot be undone.'
            }, content);
            domConstruct.create('p', {
                textContent: 'Files and job results in your workspace are kept.',
                style: 'color: #64748b; margin-top: 6px;'
            }, content);
            var dialog = new ConfirmDialog({
                title: 'Delete chat',
                content: content,
                buttonOk: 'Delete',
                buttonCancel: 'Cancel'
            });
            dialog.on('execute', function () {
                topic.publish('ChatSession:Delete', sessionId);
            });
            dialog.on('hide', function () {
                setTimeout(function () { dialog.destroyRecursive(); }, 0);
            });
            dialog.show();
        },

        /** Rename this card's chat in place: Enter or clicking away saves, Esc cancels. */
        _startInlineTitleEdit: function () {
            if (this._editingTitle || !this.copilotApi) return;
            this._editingTitle = true;
            var _self = this;
            var sessionId = this.session.session_id;
            var oldTitle = this.session.title || 'New Chat';
            var input = domConstruct.create('input', {
                type: 'text',
                value: oldTitle,
                maxlength: 100,
                'class': 'scrollCardTitleInput',
                'aria-label': 'Chat title'
            });
            this.titleNode.textContent = '';
            this.titleNode.appendChild(input);
            input.focus();
            input.select();
            var done = false;
            var finish = function (save) {
                if (done) return;
                done = true;
                _self._editingTitle = false;
                var title = input.value.trim();
                _self.titleNode.textContent = oldTitle;
                if (!save || !title || title === oldTitle) return;
                _self.copilotApi.updateSessionTitle(sessionId, title).then(function () {
                    _self.session.title = title;
                    _self.titleNode.textContent = title;
                    topic.publish('ChatSessionTitleChanged', { sessionId: sessionId, title: title });
                    // The header of the open chat, if this is it.
                    topic.publish('ChatSessionTitleUpdated', { sessionId: sessionId, title: title });
                }, function (err) {
                    console.error('Error renaming chat:', err);
                });
            };
            on(input, 'click', function (evt) { evt.stopPropagation(); });
            on(input, 'keydown', function (evt) {
                if (evt.key === 'Enter') { evt.preventDefault(); finish(true); }
                if (evt.key === 'Escape') { evt.preventDefault(); finish(false); }
            });
            on(input, 'blur', function () { finish(true); });
        },

        _closeCogMenu: function () {
            if (this.cogMenuNode) {
                this.cogMenuNode.style.display = 'none';
            }
            this._cogMenuOpen = false;
        },

        /**
         * Show or hide the Running chip indicator on this card.
         * @param {boolean} busy
         */
        _updateBusyState: function (busy) {
            if (this.runningChipNode) {
                this.runningChipNode.style.display = busy ? 'inline-block' : 'none';
            }
        },

        /**
         * Shows a popup panel listing all jobs (external IDs) associated with this session.
         * Fetches external_ids from workflow_watches via the gateway, then queries
         * the BV-BRC AppService for live job status.
         */
        _showSessionJobsPanel: function() {
            var self = this;
            var sessionId = this.session && this.session.session_id;
            if (!sessionId) return;

            // Remove any existing jobs panel
            var existingPanel = document.querySelector('.session-jobs-panel-overlay');
            if (existingPanel) {
                existingPanel.parentNode.removeChild(existingPanel);
            }

            // Create overlay
            var overlay = domConstruct.create('div', {
                'class': 'session-jobs-panel-overlay'
            }, document.body);

            // Create panel
            var panel = domConstruct.create('div', {
                'class': 'session-jobs-panel'
            }, overlay);

            // Header
            var header = domConstruct.create('div', {
                'class': 'session-jobs-panel-header'
            }, panel);

            domConstruct.create('span', {
                innerHTML: 'Session Jobs',
                style: 'font-weight: 600; font-size: 14px; color: #1f2937;'
            }, header);

            var closeBtn = domConstruct.create('button', {
                innerHTML: '&times;',
                'class': 'session-jobs-panel-close'
            }, header);

            // Body
            var body = domConstruct.create('div', {
                'class': 'session-jobs-panel-body'
            }, panel);

            domConstruct.create('div', {
                innerHTML: 'Loading jobs...',
                style: 'padding: 16px; color: #6b7280; font-size: 13px;'
            }, body);

            // Close handlers
            var closePanel = function() {
                if (overlay && overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            };
            closeBtn.onclick = closePanel;
            on(overlay, 'click', function(evt) {
                if (evt.target === overlay) closePanel();
            });
            var keyHandler = on(document, 'keydown', function(evt) {
                if (evt.key === 'Escape') {
                    closePanel();
                    keyHandler.remove();
                }
            });

            // Fetch workflow watches for this session
            var copilotApi = this.copilotApi || (CopilotAPI && CopilotAPI.getInstance ? CopilotAPI.getInstance() : null);
            if (!copilotApi || !copilotApi.getSessionWorkflowWatches) {
                domConstruct.empty(body);
                domConstruct.create('div', {
                    innerHTML: 'API not available.',
                    style: 'padding: 16px; color: #991b1b; font-size: 13px;'
                }, body);
                return;
            }

            // Fetch from two sources in parallel:
            //  1. Workflow watches (MongoDB) — has GoWe-level pending state
            //  2. AppService jobs whose output_path is under chats/<sessionId>
            var watchesPromise = copilotApi.getSessionWorkflowWatches(sessionId)
                .then(function(result) { return (result && result.watches) || []; })
                .catch(function() { return []; });

            var appServicePromise;
            if (window.App && window.App.api && window.App.api.service) {
                var sessionPathFragment = 'chats/' + sessionId;
                appServicePromise = window.App.api.service(
                    'AppService.enumerate_tasks_filtered', [0, 50, { sort_field: 'submit_time', sort_order: 'desc' }]
                ).then(function(res) {
                    var jobs = (Array.isArray(res) && res[0]) ? res[0] : [];
                    return jobs.filter(function(job) {
                        var outPath = job && job.parameters && job.parameters.output_path;
                        return outPath && outPath.indexOf(sessionPathFragment) !== -1;
                    });
                }).catch(function() { return []; });
            } else {
                appServicePromise = Promise.resolve([]);
            }

            Promise.all([watchesPromise, appServicePromise]).then(function(results) {
                domConstruct.empty(body);
                var watches = results[0];
                var appServiceJobs = results[1];

                // Build entries from workflow watches
                var allExternalIds = [];
                var watchExternalIdSet = {};
                watches.forEach(function(w) {
                    if (w.external_ids && w.external_ids.length > 0) {
                        w.external_ids.forEach(function(eid) {
                            allExternalIds.push({
                                external_id: eid.external_id,
                                step_id: eid.step_id,
                                gowe_state: w.gowe_state,
                                created_at: w.created_at,
                                completed_at: w.completed_at
                            });
                            if (eid.external_id) watchExternalIdSet[eid.external_id] = true;
                        });
                    } else {
                        allExternalIds.push({
                            external_id: null,
                            step_id: '',
                            gowe_state: w.gowe_state,
                            created_at: w.created_at,
                            completed_at: w.completed_at
                        });
                    }
                });

                // Add AppService jobs not already covered by a watch external_id
                var extraJobs = {};
                appServiceJobs.forEach(function(job) {
                    var jobId = job.id || '';
                    if (jobId && !watchExternalIdSet[jobId]) {
                        allExternalIds.push({
                            external_id: jobId,
                            step_id: '',
                            gowe_state: null,
                            created_at: job.submit_time || null,
                            completed_at: job.completed_time || null
                        });
                        extraJobs[jobId] = job;
                    }
                });

                if (allExternalIds.length === 0) {
                    domConstruct.create('div', {
                        innerHTML: 'No jobs submitted in this session.',
                        style: 'padding: 16px; color: #6b7280; font-size: 13px;'
                    }, body);
                    return;
                }

                // Query AppService for live status of all external_ids
                var idsToQuery = allExternalIds
                    .filter(function(e) { return e.external_id; })
                    .map(function(e) { return e.external_id; });

                if (idsToQuery.length === 0) {
                    self._renderJobsList(body, allExternalIds, {});
                    return;
                }

                if (window.App && window.App.api && window.App.api.service) {
                    window.App.api.service('AppService.query_tasks', [idsToQuery])
                        .then(function(jobResults) {
                            var jobMap = {};
                            if (Array.isArray(jobResults) && jobResults.length > 0 && jobResults[0]) {
                                var taskHash = jobResults[0];
                                Object.keys(taskHash).forEach(function(jobId) {
                                    if (taskHash[jobId]) jobMap[jobId] = taskHash[jobId];
                                });
                            }
                            // Merge in jobs we already fetched from enumerate_tasks
                            Object.keys(extraJobs).forEach(function(id) {
                                if (!jobMap[id]) jobMap[id] = extraJobs[id];
                            });
                            self._renderJobsList(body, allExternalIds, jobMap);
                        })
                        .catch(function() {
                            self._renderJobsList(body, allExternalIds, extraJobs);
                        });
                } else {
                    self._renderJobsList(body, allExternalIds, extraJobs);
                }
            }).catch(function(err) {
                domConstruct.empty(body);
                domConstruct.create('div', {
                    innerHTML: 'Failed to load jobs: ' + (err.message || err),
                    style: 'padding: 16px; color: #991b1b; font-size: 13px;'
                }, body);
            });
        },

        /**
         * Renders the list of jobs in the jobs panel body.
         * @param {HTMLElement} container - The panel body container
         * @param {Array} externalEntries - Array of {external_id, step_id, gowe_state, ...}
         * @param {Object} jobMap - Map of external_id -> BV-BRC job object
         */
        _renderJobsList: function(container, externalEntries, jobMap) {
            domConstruct.empty(container);

            var table = domConstruct.create('table', {
                'class': 'session-jobs-table'
            }, container);

            // Header row
            var thead = domConstruct.create('thead', {}, table);
            var headerRow = domConstruct.create('tr', {}, thead);
            ['Job ID', 'Service', 'Status', 'Submitted', ''].forEach(function(label) {
                domConstruct.create('th', { innerHTML: label }, headerRow);
            });

            var tbody = domConstruct.create('tbody', {}, table);

            externalEntries.forEach(function(entry) {
                var row = domConstruct.create('tr', {}, tbody);
                var job = entry.external_id ? (jobMap[entry.external_id] || null) : null;

                // Job ID
                var idText = entry.external_id || 'Pending...';
                domConstruct.create('td', {
                    innerHTML: idText,
                    style: entry.external_id ? '' : 'color: #9ca3af; font-style: italic;'
                }, row);

                // Service name
                var serviceName = job ? (job.application_name || job.app || '-') : '-';
                domConstruct.create('td', { innerHTML: serviceName }, row);

                // Status
                var status = job ? (job.status || entry.gowe_state || '-') : (entry.gowe_state || '-');
                var statusTd = domConstruct.create('td', {}, row);
                var statusColors = {
                    'completed': '#10b981', 'in-progress': '#2563eb', 'running': '#2563eb',
                    'queued': '#f59e0b', 'pending': '#f59e0b', 'PENDING': '#f59e0b',
                    'RUNNING': '#2563eb', 'COMPLETED': '#10b981',
                    'failed': '#ef4444', 'FAILED': '#ef4444',
                    'CANCELLED': '#6b7280', 'cancelled': '#6b7280'
                };
                var dotColor = statusColors[status] || '#9ca3af';
                domConstruct.create('span', {
                    innerHTML: '&#9679; ' + status,
                    style: 'color: ' + dotColor + '; font-weight: 500;'
                }, statusTd);

                // Submitted time
                var submittedText = '-';
                var submitTime = job ? job.submit_time : entry.created_at;
                if (submitTime) {
                    var d = new Date(submitTime);
                    submittedText = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
                }
                domConstruct.create('td', { innerHTML: submittedText }, row);

                // Action: link to output in workspace
                var actionTd = domConstruct.create('td', {}, row);
                if (job && job.parameters && job.parameters.output_path && job.parameters.output_file) {
                    var outputPath = job.parameters.output_path + '/' + job.parameters.output_file;
                    var link = domConstruct.create('a', {
                        innerHTML: 'View Output',
                        href: '/workspace' + outputPath,
                        target: '_blank',
                        'class': 'session-jobs-output-link'
                    }, actionTd);
                    on(link, 'click', function(evt) {
                        evt.stopPropagation();
                    });
                }
            });
        },

        /**
         * Creates the 5-star rating widget inside the cog menu Rate row.
         * Stars are placed into rateStarsNode; clicks call stopPropagation
         * so they don't close the menu or select the session.
         */
        setupRating: function() {
            if (!this.rateStarsNode) { return; }

            // Build 5 star elements inside rateStarsNode
            for (var i = 1; i <= 5; i++) {
                var star = domConstruct.create('span', {
                    innerHTML: '&#9734;', // ☆
                    'class': 'scrollCardRateStar',
                    'data-rating': i
                }, this.rateStarsNode);

                this.own(on(star, 'click', lang.hitch(this, function(event) {
                    event.stopPropagation(); // keep menu open
                    var rating = parseInt(event.target.getAttribute('data-rating'));
                    this._applyRating(rating);
                })));
            }

            // Prevent the entire Rate row from closing the menu on click
            this.own(on(this.rateMenuItemNode, 'click', function(evt) {
                evt.stopPropagation();
            }));

            // If session already has a saved rating, display it
            if (this.session && this.session.rating) {
                this._applyStarDisplay(this.session.rating);
            }
        },

        /**
         * Applies a rating: updates the star display, publishes the topic,
         * and stores the value on the session object.
         * @param {number} rating - 1-5
         */
        _applyRating: function(rating) {
            this._applyStarDisplay(rating);

            topic.publish('SetConversationRating', {
                sessionId: this.session ? this.session.session_id : null,
                rating: rating
            });

            if (this.session) {
                this.session.rating = rating;
            }
        },

        /**
         * Updates the star display inside rateStarsNode to show the given rating.
         * @param {number} rating - 1-5
         */
        _applyStarDisplay: function(rating) {
            if (!this.rateStarsNode) { return; }
            var stars = this.rateStarsNode.children;
            for (var i = 0; i < stars.length; i++) {
                if (i < rating) {
                    stars[i].style.color = 'var(--main-blue)';
                    stars[i].innerHTML = '&#9733;'; // ★
                } else {
                    stars[i].style.color = '#ccc';
                    stars[i].innerHTML = '&#9734;'; // ☆
                }
            }
        }
    });
});