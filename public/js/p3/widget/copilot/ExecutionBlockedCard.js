/**
 * ExecutionBlockedCard — Rendered under an assistant message when the agent
 * prepared one or more gated actions (submit_gowe_job / create_group) that
 * were not run: the session is in Plan mode, or the request asked for a set
 * of jobs, which is always confirmed first (D4 job sets).
 *
 * The card lists the prepared actions and asks ONE question with three
 * answers:
 *   Yes    — publishes `CopilotExecutionModeRun`; CopilotInput sends a
 *            canned follow-up with `execute_once` and `replay_actions`, and
 *            the service agent replays every listed action verbatim.
 *   No     — nothing runs and no LLM turn is spent; the answer is recorded
 *            on the stored card (POST /execution-question/answer) and the
 *            card asks whether anything should be changed.
 *   Other  — free text ("drop the binning job"); publishes
 *            `CopilotExecutionRevise`; CopilotInput sends the text as a
 *            normal turn with `prepared_actions` so the service agent edits
 *            the set and asks again.  Other never submits.
 *
 * A question takes one answer: the gateway records it on the card payload
 * (`answered`), refuses a second Yes with 409 REPLAY_ALREADY_RUN, and the
 * card renders as answered after a reload.
 */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dijit/_WidgetBase',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dojo/on',
  'dojo/topic'
], function (
  declare, lang, _WidgetBase,
  domConstruct, domClass, on, topic
) {
  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return declare([_WidgetBase], {

    agent: null,            // Agent key that was blocked (e.g. 'service')
    blockedActions: null,   // Array of {tool, summary, arguments}
    originalQuery: null,
    sessionId: null,
    copilotApi: null,       // For the No answer (no chat turn)
    answered: null,         // {answer: 'yes'|'no'|'other', at, text, count} from the stored card
    planContext: null,      // {plan_id, step_id, step_index} when a plan step prepared the set
    cardPayload: null,      // the message's card_payload; the answer is written back to it

    _questionNode: null,
    _answered: false,

    constructor: function (params) {
      this.agent = params.agent || null;
      this.blockedActions = Array.isArray(params.blockedActions) ? params.blockedActions : [];
      this.originalQuery = params.originalQuery || '';
      this.sessionId = params.sessionId || null;
      this.copilotApi = params.copilotApi || null;
      this.answered = params.answered && params.answered.answer ? params.answered : null;
      this.planContext = params.planContext || null;
      this.cardPayload = params.cardPayload || null;
      this._answered = !!this.answered;
    },

    buildRendering: function () {
      this.domNode = domConstruct.create('div', {
        'class': 'execution-blocked-card'
      });
      this._render();
    },

    _toolLabel: function (tool) {
      if (tool === 'submit_gowe_job') { return 'Job'; }
      if (tool === 'create_group' || tool === 'edit_group') { return 'Group'; }
      return tool || 'Action';
    },

    _counts: function () {
      var jobs = 0, groups = 0, edits = 0;
      this.blockedActions.forEach(function (a) {
        if (a && a.tool === 'create_group') { groups++; }
        else if (a && a.tool === 'edit_group') { groups++; edits++; }
        else { jobs++; }
      });
      return { jobs: jobs, groups: groups, edits: edits };
    },

    // "Submit these 3 jobs?" / "Submit this job?" / "Create this group?" /
    // "Run these 4 actions?"
    _questionText: function () {
      var c = this._counts();
      if (c.jobs && c.groups) {
        var n = c.jobs + c.groups;
        return 'Run these ' + n + ' actions?';
      }
      if (c.groups) {
        // edit_group changes an existing group (asks in every mode)
        var verb = c.edits === c.groups ? 'Update' : (c.edits ? 'Run' : 'Create');
        if (verb === 'Run') { return 'Run these ' + c.groups + ' group actions?'; }
        return c.groups === 1 ? verb + ' this group?' : verb + ' these ' + c.groups + ' groups?';
      }
      return c.jobs === 1 ? 'Submit this job?' : 'Submit these ' + c.jobs + ' jobs?';
    },

    _yesLabel: function () {
      var c = this._counts();
      if (c.jobs && c.groups) { return 'Yes, run them'; }
      if (c.groups) {
        var v = c.edits === c.groups ? 'update' : (c.edits ? 'run' : 'create');
        return c.groups === 1 ? 'Yes, ' + v + ' it' : 'Yes, ' + v + ' them';
      }
      return c.jobs === 1 ? 'Yes, submit it' : 'Yes, submit all ' + c.jobs;
    },

    _render: function () {
      var self = this;
      var count = this.blockedActions.length;

      domConstruct.create('div', {
        'class': 'execution-blocked-header',
        innerHTML: '<i class="fa icon-pause"></i> Prepared — nothing submitted yet'
      }, this.domNode);

      domConstruct.create('div', {
        'class': 'execution-blocked-body',
        innerHTML: count === 1
          ? 'The assistant prepared this and did not run it:'
          : 'The assistant prepared these ' + count + ' and did not run them:'
      }, this.domNode);

      var list = domConstruct.create('ol', {
        'class': 'execution-blocked-list'
      }, this.domNode);
      this.blockedActions.forEach(function (action) {
        domConstruct.create('li', {
          innerHTML: '<span class="execution-blocked-tool">' + escapeHtml(self._toolLabel(action.tool)) + '</span> '
            + escapeHtml(action.summary || action.tool || '')
        }, list);
      });

      this._questionNode = domConstruct.create('div', {
        'class': 'execution-question'
      }, this.domNode);

      if (this.answered) {
        this._renderAnswered(this.answered);
      } else {
        this._renderQuestion();
      }
    },

    _renderQuestion: function () {
      var self = this;
      domConstruct.empty(this._questionNode);

      domConstruct.create('div', {
        'class': 'execution-question-text',
        innerHTML: escapeHtml(this._questionText())
      }, this._questionNode);

      var row = domConstruct.create('div', {
        'class': 'execution-question-row'
      }, this._questionNode);

      var yesBtn = domConstruct.create('button', {
        type: 'button',
        'class': 'execution-question-chip execution-question-yes',
        innerHTML: '<i class="fa icon-play"></i> ' + escapeHtml(this._yesLabel()),
        title: 'Runs exactly what is listed above, once. The chat stays in Plan mode.'
      }, row);
      var noBtn = domConstruct.create('button', {
        type: 'button',
        'class': 'execution-question-chip execution-question-no',
        innerHTML: 'No',
        title: 'Submits nothing.'
      }, row);

      on(yesBtn, 'click', lang.hitch(this, this._onYes));
      on(noBtn, 'click', lang.hitch(this, this._onNo));

      this._renderOther('Or tell me what to change…');

      domConstruct.create('div', {
        'class': 'execution-blocked-note',
        innerHTML: 'Yes runs the list above once; the chat stays in Plan mode. '
          + 'Use the Plan/Execute toggle to allow every message.'
      }, this._questionNode);
    },

    // The free-text "Other" answer: a text box plus Send.  Also shown after
    // No, as "Should anything be changed?".
    _renderOther: function (placeholder) {
      var self = this;
      var otherRow = domConstruct.create('div', {
        'class': 'execution-question-other'
      }, this._questionNode);
      var input = domConstruct.create('input', {
        type: 'text',
        'class': 'clarification-text-input execution-question-input',
        placeholder: placeholder
      }, otherRow);
      var sendBtn = domConstruct.create('button', {
        type: 'button',
        'class': 'execution-question-chip execution-question-send',
        innerHTML: 'Send'
      }, otherRow);
      var submit = function () {
        var text = (input.value || '').trim();
        if (!text) { return; }
        self._onOther(text);
      };
      on(sendBtn, 'click', submit);
      on(input, 'keydown', function (evt) {
        if (evt.keyCode === 13) { evt.preventDefault(); submit(); }
      });
      return input;
    },

    /**
     * Keep the answer on the chat's copy of this message.  The gateway
     * stores it too, but until a reload the chat re-renders from its own
     * copy -- and a plan's next step re-renders right after Yes, which
     * brought the question back unanswered.
     */
    _recordAnswer: function (answered) {
      var record = { answer: answered.answer, at: new Date().toISOString() };
      if (answered.text) { record.text = answered.text; }
      if (this.cardPayload) { this.cardPayload.answered = record; }
      this.answered = record;
      topic.publish('CopilotExecutionQuestionAnswered', {
        sessionId: this.sessionId,
        blocked_actions: this.blockedActions,
        answered: record
      });
    },

    _renderAnswered: function (answered) {
      domConstruct.empty(this._questionNode);
      var text;
      var cls = 'execution-question-answered';
      if (answered.answer === 'yes') {
        var c = this._counts();
        text = '✅ Sent' + (c.jobs > 1 ? ' — ' + c.jobs + ' jobs' : '') + '. See the reply below and the Jobs list.';
      } else if (answered.answer === 'no') {
        text = 'Not submitted.';
      } else {
        text = 'Changed: “' + escapeHtml(answered.text || '') + '” — see the new set below.';
      }
      domConstruct.create('div', { 'class': cls, innerHTML: text }, this._questionNode);
      if (answered.answer === 'no' && answered._live) {
        // Just answered No in this session: ask whether anything should
        // change.  Text sent here is an "Other" answer on this set.
        domConstruct.create('div', {
          'class': 'execution-question-text',
          innerHTML: 'Should anything be changed?'
        }, this._questionNode);
        var input = this._renderOther('Describe the change, or leave it…');
        try { input.focus(); } catch (e) { /* ignore */ }
      }
    },

    _onYes: function () {
      if (this._answered) { return; }
      this._answered = true;
      this._recordAnswer({ answer: 'yes' });
      this._renderAnswered({ answer: 'yes' });
      topic.publish('CopilotExecutionModeRun', {
        sessionId: this.sessionId,
        agent: this.agent,
        blocked_actions: this.blockedActions,
        original_query: this.originalQuery,
        plan_context: this.planContext
      });
    },

    _onNo: function () {
      if (this._answered) { return; }
      this._answered = true;
      var self = this;
      this._recordAnswer({ answer: 'no' });
      this._renderAnswered({ answer: 'no', _live: true });
      if (this.copilotApi && this.copilotApi.answerExecutionQuestion) {
        this.copilotApi.answerExecutionQuestion(this.sessionId, this.blockedActions, 'no')
          .catch(function (err) {
            // A 409 means the question was already answered elsewhere
            // (another tab, or a reload raced the click); keep the card
            // read-only either way.
            console.warn('[ExecutionBlockedCard] could not record No:', err);
            self._renderAnswered({ answer: 'no' });
          });
      }
    },

    _onOther: function (text) {
      // Allowed after No (the text revises the same set) but not after Yes.
      if (this.answered && this.answered.answer === 'yes') { return; }
      this._answered = true;
      this._recordAnswer({ answer: 'other', text: text });
      this._renderAnswered({ answer: 'other', text: text });
      topic.publish('CopilotExecutionRevise', {
        sessionId: this.sessionId,
        agent: this.agent,
        blocked_actions: this.blockedActions,
        text: text
      });
    }
  });
});
