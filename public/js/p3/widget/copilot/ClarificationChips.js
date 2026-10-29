/**
 * ClarificationChips — Renders clickable option chips for an agent's
 * clarification questions (any agent that called ask_clarification; the
 * planning agent's before a plan, the others' since 2026-10-20). Each
 * question shows selectable options as styled chips, plus a free-text
 * input field. The answers go back to the agent that asked.
 *
 * After the user submits answers, the chips are replaced with a text
 * summary ("Q: ... A: ...") that persists in the chat.
 */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dojo/on',
  'dojo/topic'
], function (
  declare, lang, _WidgetBase, _TemplatedMixin,
  domConstruct, domClass, on, topic
) {
  return declare([_WidgetBase], {

    questions: null,       // Array of {id, question, options, required}
    copilotApi: null,      // CopilotApi instance
    sessionId: null,
    originalQuery: null,   // The user's original query that triggered clarification
    agent: null,           // The agent that asked ('planning' when unset)
    planStep: null,        // {plan_id, step_id, step_index} when a paused plan step asked
    containerNode: null,

    // Internal state
    _selectedAnswers: null, // Map of question_id -> selected option text
    _chipNodes: null,       // Map of question_id -> array of chip DOM nodes
    _textInputs: null,      // Map of question_id -> text input node
    _submitted: false,

    constructor: function (params) {
      this.questions = params.questions || [];
      this.copilotApi = params.copilotApi || null;
      this.sessionId = params.sessionId || null;
      this.originalQuery = params.originalQuery || '';
      this.agent = params.agent || 'planning';
      this.planStep = params.planStep || null;
      this._selectedAnswers = {};
      this._chipNodes = {};
      this._textInputs = {};
      this._questionBlocks = {};
    },

    buildRendering: function () {
      this.domNode = domConstruct.create('div', {
        'class': 'clarification-container'
      });
      this._renderQuestions();
    },

    _renderQuestions: function () {
      var self = this;

      // Header
      domConstruct.create('div', {
        'class': 'clarification-header',
        textContent: this.agent === 'planning'
          ? 'Before I create a plan, I have a few questions:'
          : 'Before I go on, I have a few questions:'
      }, this.domNode);

      // Render each question
      this.questions.forEach(function (q) {
        var qBlock = domConstruct.create('div', {
          'class': 'clarification-question-block'
        }, self.domNode);
        self._questionBlocks[q.id] = qBlock;

        // Question text (model-written: text, not HTML)
        domConstruct.create('div', {
          'class': 'clarification-question-text',
          textContent: q.question
        }, qBlock);

        // Option chips
        var chipsRow = domConstruct.create('div', {
          'class': 'clarification-chips-row'
        }, qBlock);

        self._chipNodes[q.id] = [];

        q.options.forEach(function (option) {
          var chip = domConstruct.create('button', {
            'class': 'clarification-chip',
            textContent: option,
            tabindex: '0'
          }, chipsRow);

          on(chip, 'click', function () {
            self._selectOption(q.id, option, chip);
          });

          self._chipNodes[q.id].push(chip);
        });

        // Free text input
        var textInput = domConstruct.create('input', {
          'class': 'clarification-text-input',
          type: 'text',
          placeholder: 'Or type your own answer...'
        }, qBlock);

        on(textInput, 'input', function () {
          if (textInput.value.trim()) {
            // Deselect all chips for this question
            self._deselectAllChips(q.id);
            self._selectedAnswers[q.id] = textInput.value.trim();
          } else if (!self._chipNodes[q.id].some(function (c) { return domClass.contains(c, 'clarification-chip-selected'); })) {
            // Cleared the box and no chip is picked: no answer any more.
            delete self._selectedAnswers[q.id];
          }
          self._clearMissing(q.id);
        });
        on(textInput, 'keydown', function (evt) {
          if (evt.key === 'Enter') {
            evt.preventDefault();
            self._submitAnswers();
          }
        });

        self._textInputs[q.id] = textInput;
      });

      // Submit button
      var buttonRow = domConstruct.create('div', {
        'class': 'clarification-button-row'
      }, this.domNode);

      var submitBtn = domConstruct.create('button', {
        'class': 'clarification-submit-btn',
        innerHTML: 'Submit Answers'
      }, buttonRow);

      on(submitBtn, 'click', function () {
        self._submitAnswers();
      });

      // Shown when a required question has no answer yet.
      this._errorNode = domConstruct.create('div', {
        'class': 'clarification-error',
        role: 'alert',
        style: 'display:none;'
      }, buttonRow);
    },

    _clearMissing: function (questionId) {
      if (this._questionBlocks[questionId]) {
        domClass.remove(this._questionBlocks[questionId], 'clarification-question-missing');
      }
      if (this._errorNode && !this.domNode.querySelector('.clarification-question-missing')) {
        this._errorNode.style.display = 'none';
      }
    },

    _selectOption: function (questionId, option, chipNode) {
      // Deselect all chips for this question first
      this._deselectAllChips(questionId);

      // Select this chip
      domClass.add(chipNode, 'clarification-chip-selected');
      this._selectedAnswers[questionId] = option;
      this._clearMissing(questionId);

      // Clear free text input for this question
      if (this._textInputs[questionId]) {
        this._textInputs[questionId].value = '';
      }
    },

    _deselectAllChips: function (questionId) {
      if (this._chipNodes[questionId]) {
        this._chipNodes[questionId].forEach(function (chip) {
          domClass.remove(chip, 'clarification-chip-selected');
        });
      }
    },

    _submitAnswers: function () {
      if (this._submitted) return;

      var self = this;
      var answers = [];
      var allAnswered = true;

      this.questions.forEach(function (q) {
        var answer = self._selectedAnswers[q.id] || '';
        if (!answer && q.required) {
          allAnswered = false;
        }
        if (answer) {
          answers.push({
            question: q.question,
            answer: answer
          });
        }
      });

      if (!allAnswered) {
        // Mark each unanswered required question and say which ones.
        var missing = [];
        var first = null;
        this.questions.forEach(function (q) {
          if (q.required && !self._selectedAnswers[q.id]) {
            missing.push(q.question);
            var block = self._questionBlocks[q.id];
            if (block) {
              domClass.add(block, 'clarification-question-missing');
              first = first || block;
            }
          }
        });
        if (this._errorNode) {
          this._errorNode.textContent = missing.length === 1
            ? 'Please answer: ' + missing[0]
            : 'Please answer the ' + missing.length + ' highlighted questions.';
          this._errorNode.style.display = '';
        }
        if (first && first.scrollIntoView) {
          first.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
        return;
      }

      this._submitted = true;

       // Replace chips with text summary
      this._replaceWithSummary(answers);

      // Remove the now-answered ask_questions message from the chat UI.
      // The persisted record is the user_clarification message we add below.
      topic.publish('CopilotPlanClarificationAnswered', {
        sessionId: this.sessionId
      });

      // Publish event for the API to handle
      topic.publish('CopilotPlanAnswerQuestions', {
        answers: answers,
        agent: this.agent,
        planStep: this.planStep,
        originalQuery: this.originalQuery,
        sessionId: this.sessionId
      });
    },

    _replaceWithSummary: function (answers) {
      // Clear the chips UI
      this.domNode.innerHTML = '';

      var summaryDiv = domConstruct.create('div', {
        'class': 'clarification-summary'
      }, this.domNode);

      answers.forEach(function (a) {
        var line = domConstruct.create('div', {
          'class': 'clarification-summary-line'
        }, summaryDiv);

        domConstruct.create('span', {
          'class': 'clarification-summary-q',
          textContent: 'Q: ' + a.question
        }, line);

        domConstruct.create('span', {
          'class': 'clarification-summary-a',
          textContent: ' A: ' + a.answer
        }, line);
      });
    },

    destroy: function () {
      this.inherited(arguments);
    }
  });
});
